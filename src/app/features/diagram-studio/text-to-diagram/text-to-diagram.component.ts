import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolBase } from '../../../shared/tool-base';
import { StorageService } from '../../../core/services/storage.service';
import { ThemeService } from '../../../core/services/theme.service';
import { svgToRaster } from '../../../core/engines/image.engine';
import { emptyDiagram, uid, type Diagram, type DiagramEdge, type DiagramNode } from '../diagram.model';
import { diagramToSvg } from '../diagram.render';

type Syntax = 'mermaid' | 'outline';

const SAMPLES: Record<Syntax, string> = {
  mermaid: `flowchart TD
  A[Customer places order] --> B{In stock?}
  B -- yes --> C[Pick and pack]
  B -- no --> D[Raise back-order]
  C --> E[Ship to customer]
  D --> F[Notify customer]
  E --> G((Done))
  F --> G`,
  outline: `Product launch
  Marketing
    Press kit
    Pricing page
    Social posts
  Engineering
    Load testing
    Feature flags
    On-call rota
  Support
    Help articles
    Macros
  Legal
    Terms update
    Privacy review`,
};

const STORAGE_KEY = 'text-to-diagram';

/**
 * Text-to-diagram renderer.
 *
 * Mermaid handles its own syntax and returns an SVG we can display and export
 * directly. The indented outline is parsed here into a mind-map, so the same
 * tool can produce something useful for people who do not want to learn
 * Mermaid's grammar.
 */
@Component({
  selector: 'app-text-to-diagram',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    CopyButtonComponent,
    BusyOverlayComponent,
    IconComponent,
  ],
  templateUrl: './text-to-diagram.component.html',
  styleUrl: './text-to-diagram.component.scss',
})
export class TextToDiagramComponent extends ToolBase {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly storage = inject(StorageService);
  private readonly theme = inject(ThemeService);
  private readonly doc = inject(DOCUMENT);

  readonly toolId = 'text-to-diagram';

  protected readonly source = signal(SAMPLES.mermaid);
  protected readonly syntax = signal<Syntax>('mermaid');
  protected readonly rendered = signal<SafeHtml | null>(null);
  protected readonly rawSvg = signal('');
  protected readonly parseError = signal('');
  protected readonly generatedDiagram = signal<Diagram | null>(null);
  private renderVersion = 0;

  protected readonly samples: readonly { value: Syntax; label: string; icon: string }[] = [
    { value: 'mermaid', label: 'Mermaid / PlantUML-style', icon: 'workflow' },
    { value: 'outline', label: 'Indented outline', icon: 'git-branch' },
  ];

  protected readonly stats = computed(() => {
    const text = this.source();
    return {
      lines: text ? text.split('\n').length : 0,
      characters: text.length,
    };
  });

  constructor() {
    super();

    // Restore what was last being typed, so the tool feels persistent.
    const saved = this.storage.read<{ syntax: Syntax; source: string } | null>(STORAGE_KEY, null);
    if (saved?.source) {
      this.syntax.set(saved.syntax);
      this.source.set(saved.source);
    }

    // Re-render as the source or the theme changes.
    effect(() => {
      const text = this.source();
      const syntax = this.syntax();
      // Track the theme so Mermaid's colours match the app.
      this.theme.resolved();
      void this.render(text, syntax);
    });

    // Persist quietly.
    effect(() => {
      const text = this.source();
      const syntax = this.syntax();
      this.storage.write(STORAGE_KEY, { source: text, syntax });
    });
  }

  private async render(text: string, syntax: Syntax): Promise<void> {
    // Guard against out-of-order renders when the user types quickly.
    const version = ++this.renderVersion;

    if (!text.trim()) {
      this.rendered.set(null);
      this.rawSvg.set('');
      this.parseError.set('');
      this.generatedDiagram.set(null);
      return;
    }

    try {
      if (syntax === 'mermaid') {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: this.theme.resolved() === 'dark' ? 'dark' : 'default',
          securityLevel: 'strict',
          fontFamily: 'Inter, Segoe UI, system-ui, sans-serif',
        });

        const { svg } = await mermaid.render(`m-${version}`, text);
        if (version !== this.renderVersion) return;

        this.rawSvg.set(svg);
        this.rendered.set(this.sanitizer.bypassSecurityTrustHtml(svg));
        this.generatedDiagram.set(null);
        this.parseError.set('');
      } else {
        const diagram = outlineToDiagram(text);
        const svg = diagramToSvg(diagram);
        this.rawSvg.set(svg);
        this.rendered.set(this.sanitizer.bypassSecurityTrustHtml(svg));
        this.generatedDiagram.set(diagram);
        this.parseError.set('');
      }
    } catch (error) {
      if (version !== this.renderVersion) return;
      this.parseError.set(
        error instanceof Error ? error.message.replace(/^Parse error on line \d+:?/, '').trim() : String(error),
      );
    }
  }

  protected onInput(event: Event): void {
    this.source.set((event.target as HTMLTextAreaElement).value);
  }

  protected setSyntax(syntax: Syntax): void {
    this.syntax.set(syntax);
    if (!this.source().trim() || this.source() === SAMPLES.mermaid || this.source() === SAMPLES.outline) {
      this.source.set(SAMPLES[syntax]);
    }
  }

  protected loadSample(): void {
    this.source.set(SAMPLES[this.syntax()]);
  }

  protected async downloadSvg(): Promise<void> {
    if (!this.rawSvg()) return;
    await this.downloads.saveText(this.rawSvg(), 'diagram.svg', 'image/svg+xml;charset=utf-8');
  }

  protected async downloadPng(): Promise<void> {
    if (!this.rawSvg()) return;
    try {
      const blob = await svgToRaster(this.rawSvg(), { scale: 2, mime: 'image/png' });
      await this.downloads.save(blob, 'diagram.png');
    } catch (error) {
      this.toast.fromError(error, 'Could not render the PNG');
    }
  }

  protected downloadJson(): void {
    const diagram = this.generatedDiagram();
    if (!diagram) {
      this.toast.info('JSON export is available for the outline syntax');
      return;
    }
    void this.downloads.saveJson(diagram, 'diagram.json');
  }
}

/* ------------------------------------------------------------------
   Outline → diagram
   ------------------------------------------------------------------ */

interface OutlineNode {
  readonly text: string;
  readonly depth: number;
  readonly children: OutlineNode[];
  readonly parent: OutlineNode | null;
  x: number;
  y: number;
}

/**
 * Parses an indented outline into a radial mind-map.
 *
 * Indentation is measured in leading whitespace; two-space or tab increments
 * both work. The result is laid out with the root at the centre and each
 * generation ringing the last.
 */
function outlineToDiagram(text: string): Diagram {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => ({ raw: line, trimmed: line.trim() }))
    .filter((entry) => entry.trimmed);

  if (!lines.length) return emptyDiagram();

  const [first, ...rest] = lines;
  const root: OutlineNode = {
    text: first.trimmed,
    depth: indentDepth(first.raw),
    children: [],
    parent: null,
    x: 0,
    y: 0,
  };
  const stack: OutlineNode[] = [root];

  for (const { raw, trimmed } of rest) {
    const depth = indentDepth(raw);
    const node: OutlineNode = { text: trimmed, depth, children: [], parent: null, x: 0, y: 0 };

    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();
    const parent = stack[stack.length - 1] ?? root;
    (node as { parent: OutlineNode | null }).parent = parent;
    parent.children.push(node);
    stack.push(node);
  }

  layout(root);

  const diagram = emptyDiagram(root.text || 'Mind map');
  diagram.background = '#ffffff';
  diagram.showGrid = false;
  diagram.width = 1200;
  diagram.height = 800;

  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];
  const palette = ['#5b5bd6', '#0e7c86', '#a05e03', '#167c53', '#c74f2c', '#7c4dcc'];

  const walk = (node: OutlineNode, colourIndex: number): DiagramNode => {
    const width = Math.max(120, Math.min(240, node.text.length * 9 + 40));
    const height = node.depth === 0 ? 70 : 50;
    const colour = palette[colourIndex % palette.length];

    const shape: DiagramNode = {
      id: uid('n'),
      kind: node.depth === 0 ? 'ellipse' : node.depth === 1 ? 'rounded' : 'rect',
      x: node.x - width / 2,
      y: node.y - height / 2,
      width,
      height,
      text: node.text,
      fill: node.depth === 0 ? '#eef2ff' : node.depth === 1 ? mix(colour, 0.14) : mix(colour, 0.08),
      stroke: node.depth === 0 ? '#5b5bd6' : colour,
      textColor: '#16181f',
      fontSize: node.depth === 0 ? 14 : 12,
      bold: node.depth === 0,
      z: 1,
    };
    nodes.push(shape);

    node.children.forEach((child, index) => {
      const childShape = walk(child, node.depth === 0 ? index : colourIndex);
      edges.push({
        id: uid('e'),
        from: shape.id,
        to: childShape.id,
        label: '',
        routing: 'curved',
        dashed: false,
        startArrow: 'none',
        endArrow: 'none',
        stroke: node.depth === 0 ? palette[index % palette.length] : colour,
      });
    });

    return shape;
  };

  walk(root, 0);

  // Nudge the graph so its bounding box sits comfortably on the canvas.
  const minX = Math.min(...nodes.map((n) => n.x));
  const minY = Math.min(...nodes.map((n) => n.y));
  const maxX = Math.max(...nodes.map((n) => n.x + n.width));
  const maxY = Math.max(...nodes.map((n) => n.y + n.height));
  const offsetX = 60 - minX;
  const offsetY = 60 - minY;

  for (const node of nodes) {
    node.x += offsetX;
    node.y += offsetY;
  }
  diagram.width = Math.max(800, maxX - minX + 120);
  diagram.height = Math.max(500, maxY - minY + 120);
  diagram.nodes = nodes;
  diagram.edges = edges;
  return diagram;
}

function indentDepth(line: string): number {
  let count = 0;
  for (const char of line) {
    if (char === ' ') count += 1;
    else if (char === '\t') count += 2;
    else break;
  }
  return Math.floor(count / 2);
}

/**
 * Radial layout.
 *
 * The root sits at the origin; direct children go on a circle around it, and
 * each subtree fans out inside a slice of the arc so branches never overlap.
 */
function layout(root: OutlineNode): void {
  root.x = 0;
  root.y = 0;

  const firstRing = 260;
  const generationStep = 180;

  const totalChildren = root.children.length;
  root.children.forEach((child, index) => {
    const angle = (index / Math.max(1, totalChildren)) * Math.PI * 2 - Math.PI / 2;
    child.x = Math.cos(angle) * firstRing;
    child.y = Math.sin(angle) * firstRing;

    const sliceStart = angle - Math.PI / totalChildren;
    const sliceEnd = angle + Math.PI / totalChildren;
    positionSubtree(child, sliceStart, sliceEnd, firstRing + generationStep);
  });
}

function positionSubtree(
  node: OutlineNode,
  arcStart: number,
  arcEnd: number,
  radius: number,
): void {
  const children = node.children;
  if (!children.length) return;

  const range = arcEnd - arcStart;
  children.forEach((child, index) => {
    const t = children.length === 1 ? 0.5 : index / (children.length - 1);
    const angle = arcStart + range * t;
    child.x = Math.cos(angle) * radius;
    child.y = Math.sin(angle) * radius;

    const childRange = range / Math.max(1, children.length) * 0.9;
    positionSubtree(child, angle - childRange / 2, angle + childRange / 2, radius + 160);
  });
}

/** Blends a hex colour toward white by `amount` (0–1). */
function mix(hex: string, amount: number): string {
  const value = hex.replace('#', '');
  const int = Number.parseInt(value.padEnd(6, '0').slice(0, 6), 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  const blend = (channel: number): number => Math.round(channel + (255 - channel) * (1 - amount));
  return '#' + [blend(r), blend(g), blend(b)].map((n) => n.toString(16).padStart(2, '0')).join('');
}
