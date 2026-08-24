import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { ZoomControlsComponent } from '../../../shared/components/zoom-controls/zoom-controls.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToastService } from '../../../core/services/toast.service';
import { DownloadService } from '../../../core/services/download.service';
import { StorageService } from '../../../core/services/storage.service';
import { RecentService } from '../../../core/services/recent.service';
import { svgToRaster } from '../../../core/engines/image.engine';
import { diagramToSvg } from '../diagram.render';
import { templateFor } from '../diagram.templates';
import {
  STENCILS,
  centreOf,
  edgeMidpoint,
  edgePath,
  emptyDiagram,
  shapePath,
  stencilById,
  uid,
  type Diagram,
  type DiagramEdge,
  type DiagramNode,
  type EdgeRouting,
  type Point,
  type StencilItem,
} from '../diagram.model';

const AUTOSAVE_KEY = 'diagram-autosave';
const MAX_HISTORY = 50;

type Interaction =
  | { kind: 'none' }
  | { kind: 'move'; id: string; offsetX: number; offsetY: number; moved: boolean }
  | { kind: 'resize'; id: string; startX: number; startY: number; width: number; height: number }
  | { kind: 'pan'; startX: number; startY: number; originX: number; originY: number };

/**
 * The diagram editor.
 *
 * Everything is one immutable `Diagram` value in a signal: the canvas renders
 * it, undo/redo snapshots it, autosave serialises it, and the exporters read
 * it. Interaction mutates a working copy and commits a snapshot on release, so
 * a drag is one undo step rather than sixty.
 */
@Component({
  selector: 'app-diagram-studio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolShellComponent, ZoomControlsComponent, IconComponent],
  templateUrl: './studio.component.html',
  styleUrl: './studio.component.scss',
  host: {
    '(document:keydown)': 'onKeyDown($event)',
  },
})
export class StudioComponent {
  private readonly toast = inject(ToastService);
  private readonly downloads = inject(DownloadService);
  private readonly storage = inject(StorageService);
  private readonly recent = inject(RecentService);

  /** Supplied by route data; picks the stencil and starter diagram. */
  readonly toolIdInput = input.required<string>({ alias: 'toolId' });

  private readonly surface = viewChild<ElementRef<SVGSVGElement>>('surface');
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly stencils = STENCILS;
  protected readonly diagram = signal<Diagram>(emptyDiagram());
  protected readonly selectedNodeId = signal<string | null>(null);
  protected readonly selectedEdgeId = signal<string | null>(null);
  protected readonly activeStencil = signal('basic');
  protected readonly connectFrom = signal<string | null>(null);
  protected readonly zoom = signal(1);
  protected readonly panX = signal(0);
  protected readonly panY = signal(0);
  protected readonly showPanel = signal(true);

  private history: Diagram[] = [];
  private future: Diagram[] = [];
  private interaction: Interaction = { kind: 'none' };

  protected readonly stencil = computed(() => stencilById(this.activeStencil()));
  protected readonly canUndo = computed(() => this.historyDepth() > 0);
  private readonly historyDepth = signal(0);
  private readonly futureDepth = signal(0);
  protected readonly canRedo = computed(() => this.futureDepth() > 0);

  protected readonly selectedNode = computed<DiagramNode | null>(() => {
    const id = this.selectedNodeId();
    return id ? (this.diagram().nodes.find((node) => node.id === id) ?? null) : null;
  });

  protected readonly selectedEdge = computed<DiagramEdge | null>(() => {
    const id = this.selectedEdgeId();
    return id ? (this.diagram().edges.find((edge) => edge.id === id) ?? null) : null;
  });

  /** Containers must paint behind everything else. */
  protected readonly orderedNodes = computed(() =>
    [...this.diagram().nodes].sort((a, b) => (a.z ?? 1) - (b.z ?? 1)),
  );

  protected readonly nodeById = computed(
    () => new Map(this.diagram().nodes.map((node) => [node.id, node])),
  );

  protected readonly viewBox = computed(() => {
    const diagram = this.diagram();
    return `0 0 ${diagram.width} ${diagram.height}`;
  });

  protected readonly transform = computed(
    () => `translate(${this.panX()}px, ${this.panY()}px) scale(${this.zoom()})`,
  );

  constructor() {
    effect(() => {
      const toolId = this.toolIdInput();
      untracked(() => this.initialise(toolId));
    });

    // Autosave whenever the diagram settles.
    effect(() => {
      const diagram = this.diagram();
      untracked(() => {
        if (diagram.nodes.length || diagram.edges.length) {
          this.storage.write(AUTOSAVE_KEY, diagram);
        }
      });
    });
  }

  private initialise(toolId: string): void {
    const template = templateFor(toolId);

    if (template) {
      this.activeStencil.set(template.stencil);
      this.diagram.set(template.build());
      this.recent.trackTool(toolId);
      return;
    }

    // The plain studio route restores whatever was last being worked on.
    const saved = this.storage.read<Diagram | null>(AUTOSAVE_KEY, null);
    this.diagram.set(saved && saved.nodes ? saved : emptyDiagram('My diagram'));
  }

  /* ---------------- history ---------------- */

  private snapshot(): void {
    this.history = [...this.history.slice(-MAX_HISTORY), structuredCloneSafe(this.diagram())];
    this.future = [];
    this.historyDepth.set(this.history.length);
    this.futureDepth.set(0);
  }

  private mutate(change: (draft: Diagram) => void): void {
    this.snapshot();
    const draft = structuredCloneSafe(this.diagram());
    change(draft);
    this.diagram.set(draft);
  }

  /** Applies a change without an undo entry — used during a live drag. */
  private mutateSilently(change: (draft: Diagram) => void): void {
    const draft = structuredCloneSafe(this.diagram());
    change(draft);
    this.diagram.set(draft);
  }

  protected undo(): void {
    const previous = this.history.pop();
    if (!previous) return;
    this.future = [structuredCloneSafe(this.diagram()), ...this.future];
    this.diagram.set(previous);
    this.historyDepth.set(this.history.length);
    this.futureDepth.set(this.future.length);
  }

  protected redo(): void {
    const [next, ...rest] = this.future;
    if (!next) return;
    this.history = [...this.history, structuredCloneSafe(this.diagram())];
    this.future = rest;
    this.diagram.set(next);
    this.historyDepth.set(this.history.length);
    this.futureDepth.set(this.future.length);
  }

  /* ---------------- adding ---------------- */

  protected addShape(item: StencilItem): void {
    const diagram = this.diagram();
    // Drop new shapes near the middle of the visible area, then nudge so
    // repeated clicks do not stack perfectly on top of each other.
    const offset = diagram.nodes.length % 6;
    const node: DiagramNode = {
      id: uid('n'),
      kind: item.kind,
      x: snap(diagram.width / 2 - item.width / 2 + offset * 18, diagram),
      y: snap(220 + offset * 18, diagram),
      width: item.width,
      height: item.height,
      text: item.text ?? item.label,
      fill: item.fill ?? '#eef2ff',
      stroke: item.stroke ?? '#5b5bd6',
      textColor: '#16181f',
      fontSize: 13,
      rows: item.rows ? [...item.rows] : undefined,
      z: item.kind === 'container' ? 0 : 1,
    };

    this.mutate((draft) => draft.nodes.push(node));
    this.selectedNodeId.set(node.id);
    this.selectedEdgeId.set(null);
  }

  protected setStencil(id: string): void {
    this.activeStencil.set(id);
  }

  /* ---------------- selection & interaction ---------------- */

  protected selectNode(id: string, event: PointerEvent): void {
    event.stopPropagation();

    if (this.connectFrom()) {
      this.completeConnection(id);
      return;
    }

    this.selectedNodeId.set(id);
    this.selectedEdgeId.set(null);

    const node = this.nodeById().get(id);
    if (!node) return;

    const point = this.toDiagramSpace(event);
    this.interaction = {
      kind: 'move',
      id,
      offsetX: point.x - node.x,
      offsetY: point.y - node.y,
      moved: false,
    };
    (event.target as Element).setPointerCapture?.(event.pointerId);
  }

  protected selectEdge(id: string, event: Event): void {
    event.stopPropagation();
    this.selectedEdgeId.set(id);
    this.selectedNodeId.set(null);
  }

  protected startResize(id: string, event: PointerEvent): void {
    event.stopPropagation();
    const node = this.nodeById().get(id);
    if (!node) return;

    const point = this.toDiagramSpace(event);
    this.interaction = {
      kind: 'resize',
      id,
      startX: point.x,
      startY: point.y,
      width: node.width,
      height: node.height,
    };
    (event.target as Element).setPointerCapture?.(event.pointerId);
  }

  protected onCanvasPointerDown(event: PointerEvent): void {
    if (event.button === 1 || event.shiftKey) {
      this.interaction = {
        kind: 'pan',
        startX: event.clientX,
        startY: event.clientY,
        originX: this.panX(),
        originY: this.panY(),
      };
      return;
    }
    this.selectedNodeId.set(null);
    this.selectedEdgeId.set(null);
    this.connectFrom.set(null);
  }

  protected onPointerMove(event: PointerEvent): void {
    const interaction = this.interaction;
    if (interaction.kind === 'none') return;

    if (interaction.kind === 'pan') {
      this.panX.set(interaction.originX + (event.clientX - interaction.startX));
      this.panY.set(interaction.originY + (event.clientY - interaction.startY));
      return;
    }

    const point = this.toDiagramSpace(event);

    if (interaction.kind === 'move') {
      if (!interaction.moved) {
        // The first movement is what earns an undo entry.
        this.snapshot();
        this.interaction = { ...interaction, moved: true };
      }
      this.mutateSilently((draft) => {
        const node = draft.nodes.find((candidate) => candidate.id === interaction.id);
        if (!node) return;
        node.x = snap(point.x - interaction.offsetX, draft);
        node.y = snap(point.y - interaction.offsetY, draft);
      });
      return;
    }

    if (interaction.kind === 'resize') {
      this.mutateSilently((draft) => {
        const node = draft.nodes.find((candidate) => candidate.id === interaction.id);
        if (!node) return;
        node.width = Math.max(50, snap(interaction.width + (point.x - interaction.startX), draft));
        node.height = Math.max(36, snap(interaction.height + (point.y - interaction.startY), draft));
      });
    }
  }

  protected onPointerUp(): void {
    if (this.interaction.kind === 'resize') this.snapshot();
    this.interaction = { kind: 'none' };
  }

  /* ---------------- connections ---------------- */

  protected startConnection(id: string, event: Event): void {
    event.stopPropagation();
    this.connectFrom.set(id);
    this.toast.info('Now click the shape to connect to');
  }

  private completeConnection(targetId: string): void {
    const sourceId = this.connectFrom();
    this.connectFrom.set(null);
    if (!sourceId || sourceId === targetId) return;

    const edge: DiagramEdge = {
      id: uid('e'),
      from: sourceId,
      to: targetId,
      label: '',
      routing: 'orthogonal',
      dashed: false,
      startArrow: 'none',
      endArrow: 'arrow',
      stroke: '#52607a',
    };

    this.mutate((draft) => draft.edges.push(edge));
    this.selectedEdgeId.set(edge.id);
    this.selectedNodeId.set(null);
  }

  protected cancelConnection(): void {
    this.connectFrom.set(null);
  }

  /* ---------------- editing ---------------- */

  protected updateNode(field: keyof DiagramNode, event: Event): void {
    const id = this.selectedNodeId();
    if (!id) return;

    const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const value =
      target instanceof HTMLInputElement && target.type === 'number'
        ? Number(target.value)
        : target.value;

    this.mutate((draft) => {
      const node = draft.nodes.find((candidate) => candidate.id === id);
      if (!node) return;
      (node as unknown as Record<string, unknown>)[field] = value;
    });
  }

  protected updateNodeRows(event: Event): void {
    const id = this.selectedNodeId();
    if (!id) return;
    const lines = (event.target as HTMLTextAreaElement).value.split('\n');

    this.mutate((draft) => {
      const node = draft.nodes.find((candidate) => candidate.id === id);
      if (node) node.rows = lines;
    });
  }

  protected updateEdge(field: keyof DiagramEdge, event: Event): void {
    const id = this.selectedEdgeId();
    if (!id) return;

    const target = event.target as HTMLInputElement | HTMLSelectElement;
    const value = target instanceof HTMLInputElement && target.type === 'checkbox'
      ? target.checked
      : target.value;

    this.mutate((draft) => {
      const edge = draft.edges.find((candidate) => candidate.id === id);
      if (!edge) return;
      (edge as unknown as Record<string, unknown>)[field] = value;
    });
  }

  protected deleteSelected(): void {
    const nodeId = this.selectedNodeId();
    const edgeId = this.selectedEdgeId();

    if (nodeId) {
      this.mutate((draft) => {
        draft.nodes = draft.nodes.filter((node) => node.id !== nodeId);
        // An edge with a missing end would render as a dangling line.
        draft.edges = draft.edges.filter((edge) => edge.from !== nodeId && edge.to !== nodeId);
      });
      this.selectedNodeId.set(null);
    } else if (edgeId) {
      this.mutate((draft) => {
        draft.edges = draft.edges.filter((edge) => edge.id !== edgeId);
      });
      this.selectedEdgeId.set(null);
    }
  }

  protected duplicateSelected(): void {
    const node = this.selectedNode();
    if (!node) return;
    const copy: DiagramNode = { ...node, id: uid('n'), x: node.x + 24, y: node.y + 24 };
    this.mutate((draft) => draft.nodes.push(copy));
    this.selectedNodeId.set(copy.id);
  }

  protected bringToFront(): void {
    const id = this.selectedNodeId();
    if (!id) return;
    this.mutate((draft) => {
      const node = draft.nodes.find((candidate) => candidate.id === id);
      if (node) node.z = Math.max(...draft.nodes.map((n) => n.z ?? 1)) + 1;
    });
  }

  protected sendToBack(): void {
    const id = this.selectedNodeId();
    if (!id) return;
    this.mutate((draft) => {
      const node = draft.nodes.find((candidate) => candidate.id === id);
      if (node) node.z = Math.min(...draft.nodes.map((n) => n.z ?? 1)) - 1;
    });
  }

  /* ---------------- canvas settings ---------------- */

  protected setTitle(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.mutateSilently((draft) => {
      draft.title = value;
    });
  }

  protected toggleGrid(): void {
    this.mutateSilently((draft) => {
      draft.showGrid = !draft.showGrid;
    });
  }

  protected toggleSnap(): void {
    this.mutateSilently((draft) => {
      draft.snapToGrid = !draft.snapToGrid;
    });
  }

  protected fitToContent(): void {
    this.zoom.set(1);
    this.panX.set(0);
    this.panY.set(0);
  }

  protected clearCanvas(): void {
    this.mutate((draft) => {
      draft.nodes = [];
      draft.edges = [];
    });
    this.selectedNodeId.set(null);
    this.selectedEdgeId.set(null);
  }

  /* ---------------- geometry helpers for the template ---------------- */

  protected pathFor(edge: DiagramEdge): string {
    const from = this.nodeById().get(edge.from);
    const to = this.nodeById().get(edge.to);
    return from && to ? edgePath(edge, from, to) : '';
  }

  protected labelPosition(edge: DiagramEdge): Point {
    const from = this.nodeById().get(edge.from);
    const to = this.nodeById().get(edge.to);
    return from && to ? edgeMidpoint(from, to) : { x: 0, y: 0 };
  }

  protected shapeOutline(node: DiagramNode): string {
    return shapePath(node);
  }

  protected centre(node: DiagramNode): Point {
    return centreOf(node);
  }

  protected textLines(node: DiagramNode): string[] {
    return node.text ? node.text.split('\n') : [];
  }

  protected lineY(node: DiagramNode, index: number, total: number): number {
    const centre = centreOf(node);
    const lineHeight = node.fontSize * 1.35;
    return centre.y - ((total - 1) * lineHeight) / 2 + node.fontSize * 0.35 + index * lineHeight;
  }

  protected markerUrl(head: DiagramEdge['endArrow']): string | null {
    switch (head) {
      case 'arrow':
        return 'url(#studio-arrow)';
      case 'triangle':
        return 'url(#studio-triangle)';
      case 'diamond':
        return 'url(#studio-diamond)';
      case 'circle':
        return 'url(#studio-circle)';
      default:
        return null;
    }
  }

  private toDiagramSpace(event: PointerEvent): Point {
    const svg = this.surface()?.nativeElement;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const diagram = this.diagram();
    // The SVG scales to its box, so map client pixels through that ratio.
    return {
      x: ((event.clientX - rect.left) / rect.width) * diagram.width,
      y: ((event.clientY - rect.top) / rect.height) * diagram.height,
    };
  }

  /* ---------------- keyboard ---------------- */

  protected onKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

    const mod = event.metaKey || event.ctrlKey;

    if (mod && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      event.shiftKey ? this.redo() : this.undo();
      return;
    }
    if (mod && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      this.duplicateSelected();
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (this.selectedNodeId() || this.selectedEdgeId()) {
        event.preventDefault();
        this.deleteSelected();
      }
      return;
    }
    if (event.key === 'Escape') {
      this.connectFrom.set(null);
      this.selectedNodeId.set(null);
      this.selectedEdgeId.set(null);
      return;
    }

    // Arrow keys nudge the selection.
    const nudge: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    };
    const delta = nudge[event.key];
    const id = this.selectedNodeId();
    if (delta && id) {
      event.preventDefault();
      const step = event.shiftKey ? 10 : this.diagram().gridSize;
      this.mutate((draft) => {
        const node = draft.nodes.find((candidate) => candidate.id === id);
        if (!node) return;
        node.x += delta[0] * step;
        node.y += delta[1] * step;
      });
    }
  }

  /* ---------------- import & export ---------------- */

  protected exportSvg(): void {
    const svg = diagramToSvg(this.diagram());
    void this.downloads.saveText(
      svg,
      `${fileStem(this.diagram().title)}.svg`,
      'image/svg+xml;charset=utf-8',
    );
  }

  protected async exportPng(): Promise<void> {
    try {
      const svg = diagramToSvg(this.diagram());
      const blob = await svgToRaster(svg, { scale: 2, mime: 'image/png' });
      await this.downloads.save(blob, `${fileStem(this.diagram().title)}.png`);
    } catch (error) {
      this.toast.fromError(error, 'Could not render the PNG');
    }
  }

  protected exportJson(): void {
    void this.downloads.saveJson(this.diagram(), `${fileStem(this.diagram().title)}.json`);
  }

  protected importJson(): void {
    this.fileInput()?.nativeElement.click();
  }

  protected async onImport(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text()) as Diagram;
      if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
        throw new Error('That file is not a diagram export.');
      }
      this.snapshot();
      this.diagram.set({ ...emptyDiagram(parsed.title || 'Imported diagram'), ...parsed });
      this.toast.success('Diagram loaded');
    } catch (error) {
      this.toast.fromError(error, 'Could not open that diagram');
    }
  }
}

function snap(value: number, diagram: Diagram): number {
  if (!diagram.snapToGrid) return Math.round(value);
  return Math.round(value / diagram.gridSize) * diagram.gridSize;
}

function structuredCloneSafe(diagram: Diagram): Diagram {
  return {
    ...diagram,
    nodes: diagram.nodes.map((node) => ({ ...node, rows: node.rows ? [...node.rows] : undefined })),
    edges: diagram.edges.map((edge) => ({ ...edge })),
  };
}

function fileStem(title: string): string {
  return title.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'diagram';
}

export type { EdgeRouting };
