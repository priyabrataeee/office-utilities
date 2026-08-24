import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { DownloadService } from '../../../core/services/download.service';
import { sanitizeHtml } from '../../../core/engines/markdown.engine';
import { readAsText, withExtension } from '../../../core/utils/file.util';
import { flattenJson, flattenXml, formatXml, visibleRows, type TreeRow } from './tree.util';

export type CodeKind = 'text' | 'json' | 'xml' | 'html';
type ViewTab = 'tree' | 'formatted' | 'raw' | 'preview';

/**
 * Reader for text, JSON, XML and HTML.
 *
 * These four share almost all of their behaviour — line numbers, search,
 * wrapping, copy and download — so they share a component and differ only in
 * which tabs they offer.
 */
@Component({
  selector: 'app-code-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, CopyButtonComponent],
  templateUrl: './code-view.component.html',
  styleUrl: './code-view.component.scss',
})
export class CodeViewComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly downloads = inject(DownloadService);

  readonly file = input.required<File>();
  readonly kind = input.required<CodeKind>();

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly raw = signal('');
  protected readonly tab = signal<ViewTab>('raw');
  protected readonly wrap = signal(false);
  protected readonly query = signal('');
  protected readonly collapsed = signal<Set<string>>(new Set());
  protected readonly htmlPreview = signal<SafeHtml | null>(null);

  private readonly parsed = signal<unknown>(null);
  private readonly xmlDoc = signal<Document | null>(null);

  protected readonly tabs = computed<ViewTab[]>(() => {
    switch (this.kind()) {
      case 'json':
        return ['tree', 'formatted', 'raw'];
      case 'xml':
        return ['tree', 'formatted', 'raw'];
      case 'html':
        return ['preview', 'formatted', 'raw'];
      default:
        return ['raw'];
    }
  });

  protected readonly allRows = computed<TreeRow[]>(() => {
    if (this.kind() === 'json') {
      const value = this.parsed();
      return value === null && this.error() ? [] : flattenJson(value);
    }
    if (this.kind() === 'xml') {
      const doc = this.xmlDoc();
      return doc ? flattenXml(doc) : [];
    }
    return [];
  });

  protected readonly rows = computed(() => {
    const shown = visibleRows(this.allRows(), this.collapsed());
    const needle = this.query().trim().toLowerCase();
    if (!needle) return shown;
    return shown.filter(
      (row) =>
        row.key.toLowerCase().includes(needle) || row.value.toLowerCase().includes(needle),
    );
  });

  protected readonly formatted = computed(() => {
    switch (this.kind()) {
      case 'json': {
        const value = this.parsed();
        try {
          return JSON.stringify(value, null, 2);
        } catch {
          return this.raw();
        }
      }
      case 'xml':
      case 'html':
        return formatXml(this.raw());
      default:
        return this.raw();
    }
  });

  protected readonly displayText = computed(() =>
    this.tab() === 'formatted' ? this.formatted() : this.raw(),
  );

  protected readonly lines = computed(() => {
    const text = this.displayText();
    // Very large files are capped: past a point, more lines help nobody and
    // the DOM cost is real.
    const all = text.split('\n');
    return all.length > 20000 ? all.slice(0, 20000) : all;
  });

  protected readonly truncated = computed(() => this.displayText().split('\n').length > 20000);

  protected readonly matchCount = computed(() => {
    const needle = this.query().trim().toLowerCase();
    if (!needle || this.tab() === 'tree') return 0;
    return this.lines().filter((line) => line.toLowerCase().includes(needle)).length;
  });

  protected readonly stats = computed(() => {
    const text = this.raw();
    return {
      lines: text ? text.split('\n').length : 0,
      characters: text.length,
      nodes: this.allRows().length,
    };
  });

  constructor() {
    effect(() => {
      const file = this.file();
      if (file) void this.load(file);
    });
  }

  private async load(file: File): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    this.collapsed.set(new Set());

    try {
      const text = await readAsText(file);
      this.raw.set(text);

      switch (this.kind()) {
        case 'json': {
          try {
            this.parsed.set(JSON.parse(text));
            this.tab.set('tree');
          } catch (error) {
            this.parsed.set(null);
            this.error.set(describeJsonError(error, text));
            this.tab.set('raw');
          }
          break;
        }
        case 'xml': {
          const doc = new DOMParser().parseFromString(text, 'application/xml');
          const failure = doc.querySelector('parsererror');
          if (failure) {
            this.xmlDoc.set(null);
            this.error.set(failure.textContent?.trim() ?? 'This XML could not be parsed.');
            this.tab.set('raw');
          } else {
            this.xmlDoc.set(doc);
            this.tab.set('tree');
          }
          break;
        }
        case 'html': {
          this.htmlPreview.set(this.sanitizer.bypassSecurityTrustHtml(await sanitizeHtml(text)));
          this.tab.set('preview');
          break;
        }
        default:
          this.tab.set('raw');
      }
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : String(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected setTab(tab: ViewTab): void {
    this.tab.set(tab);
  }

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected toggleWrap(): void {
    this.wrap.update((on) => !on);
  }

  protected toggleRow(row: TreeRow): void {
    if (!row.hasChildren) return;
    const next = new Set(this.collapsed());
    next.has(row.path) ? next.delete(row.path) : next.add(row.path);
    this.collapsed.set(next);
  }

  protected isCollapsed(row: TreeRow): boolean {
    return this.collapsed().has(row.path);
  }

  protected collapseAll(): void {
    this.collapsed.set(
      new Set(this.allRows().filter((row) => row.hasChildren && row.depth > 0).map((r) => r.path)),
    );
  }

  protected expandAll(): void {
    this.collapsed.set(new Set());
  }

  protected minify(): void {
    if (this.kind() !== 'json') return;
    try {
      this.raw.set(JSON.stringify(this.parsed()));
      this.tab.set('raw');
    } catch {
      /* nothing to minify */
    }
  }

  protected async downloadFormatted(): Promise<void> {
    const file = this.file();
    const suffix = this.kind() === 'json' ? '.json' : this.kind() === 'xml' ? '.xml' : '.txt';
    await this.downloads.saveText(this.formatted(), withExtension(file.name, suffix));
  }

  protected highlight(line: string): string {
    return line;
  }
}

/** Turns a JSON parse failure into a message that points at the problem. */
function describeJsonError(error: unknown, text: string): string {
  const message = error instanceof Error ? error.message : String(error);
  const position = Number(message.match(/position (\d+)/)?.[1] ?? NaN);
  if (!Number.isFinite(position)) return `Invalid JSON — ${message}`;

  const before = text.slice(0, position);
  const line = before.split('\n').length;
  const column = position - before.lastIndexOf('\n');
  return `Invalid JSON at line ${line}, column ${column} — ${message.replace(/ in JSON.*$/, '')}`;
}
