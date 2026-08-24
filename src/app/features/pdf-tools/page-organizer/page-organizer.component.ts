import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolBase } from '../../../shared/tool-base';
import { ToolRegistryService } from '../../../core/services/tool-registry.service';
import { applyPagePlan, extractPages, type PageEdit } from '../../../core/engines/pdf.engine';
import {
  closePdf,
  openPdf,
  PasswordRequiredError,
  renderThumbnail,
} from '../../../core/engines/pdfjs.engine';
import { formatPageRanges, parsePageRanges, withSuffix } from '../../../core/utils/file.util';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';

export type OrganizerMode = 'organize' | 'rotate' | 'delete' | 'reorder' | 'extract';

interface PageCard {
  readonly key: string;
  /** Index in the original document. */
  readonly sourceIndex: number;
  rotation: number;
  selected: boolean;
  thumbnail: string | null;
  readonly label: number;
}

const MODE_COPY: Record<OrganizerMode, { verb: string; hint: string; icon: string }> = {
  organize: {
    verb: 'Save organised PDF',
    hint: 'Reorder by dragging, rotate, duplicate or delete pages, then save once.',
    icon: 'layout-grid',
  },
  rotate: {
    verb: 'Save rotated PDF',
    hint: 'Select the pages to turn, then rotate them left or right.',
    icon: 'rotate',
  },
  delete: {
    verb: 'Delete selected pages',
    hint: 'Select the pages you no longer need and remove them.',
    icon: 'trash',
  },
  reorder: {
    verb: 'Save reordered PDF',
    hint: 'Drag pages into the order you want, or reverse the whole document.',
    icon: 'arrows-updown',
  },
  extract: {
    verb: 'Extract selected pages',
    hint: 'Select the pages to keep and export them as a new PDF.',
    icon: 'copy',
  },
};

/**
 * One visual page organiser behind five catalog entries.
 *
 * Rotate, delete, reorder and extract are the same interaction with a
 * different default action, so they share this component and differ only by
 * the `mode` supplied in route data.
 */
@Component({
  selector: 'app-page-organizer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    ResultPanelComponent,
    BusyOverlayComponent,
    IconComponent,
  ],
  templateUrl: './page-organizer.component.html',
  styleUrl: './page-organizer.component.scss',
})
export class PageOrganizerComponent extends ToolBase {
  private readonly registry = inject(ToolRegistryService);

  /** Both supplied by route data. */
  readonly toolIdInput = input.required<string>({ alias: 'toolId' });
  readonly mode = input.required<OrganizerMode>();

  get toolId(): string {
    return this.toolIdInput();
  }

  protected readonly pages = signal<PageCard[]>([]);
  protected readonly password = signal('');
  protected readonly needsPassword = signal(false);
  protected readonly rangeInput = signal('');
  protected readonly dragKey = signal<string | null>(null);
  protected readonly loadingThumbs = signal(false);
  protected readonly splitEach = signal(false);

  private doc: PDFDocumentProxy | null = null;
  private history: PageCard[][] = [];
  private future: PageCard[][] = [];

  protected readonly copy = computed(() => MODE_COPY[this.mode()]);
  protected readonly tool = computed(() => this.registry.byId(this.toolIdInput()));
  protected readonly selected = computed(() => this.pages().filter((page) => page.selected));
  protected readonly selectionCount = computed(() => this.selected().length);
  protected readonly canUndo = computed(() => this.history.length > 0);
  protected readonly needsSelection = computed(
    () => this.mode() === 'delete' || this.mode() === 'extract',
  );
  protected readonly canApply = computed(() => {
    if (!this.pages().length) return false;
    if (this.mode() === 'extract') return this.selectionCount() > 0;
    if (this.mode() === 'delete') {
      return this.selectionCount() > 0 && this.selectionCount() < this.pages().length;
    }
    return true;
  });

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override afterFiles(files: File[]): void {
    if (files[0]) void this.load(files[0]);
  }

  private async load(file: File): Promise<void> {
    void closePdf(this.doc);
    this.doc = null;
    this.pages.set([]);
    this.history = [];
    this.future = [];

    await this.run('Reading PDF…', async () => {
      try {
        this.doc = await openPdf(await file.arrayBuffer(), {
          password: this.password() || undefined,
        });
        this.needsPassword.set(false);
      } catch (error) {
        if (error instanceof PasswordRequiredError) {
          this.needsPassword.set(true);
          this.errorMessage.set(error.message);
          return;
        }
        throw error;
      }

      const doc = this.doc;
      this.pages.set(
        Array.from({ length: doc.numPages }, (_, index) => ({
          key: `p${index}-${Math.random().toString(36).slice(2, 7)}`,
          sourceIndex: index,
          rotation: 0,
          selected: false,
          thumbnail: null,
          label: index + 1,
        })),
      );
      void this.renderThumbnails();
    });
  }

  /** Renders previews one at a time so a 500-page file stays responsive. */
  private async renderThumbnails(): Promise<void> {
    const doc = this.doc;
    if (!doc) return;
    this.loadingThumbs.set(true);

    for (let index = 1; index <= doc.numPages; index++) {
      if (this.doc !== doc) return; // a different file was loaded meanwhile
      try {
        const thumbnail = await renderThumbnail(doc, index, 200);
        this.pages.update((list) =>
          list.map((page) =>
            page.sourceIndex === index - 1 && !page.thumbnail ? { ...page, thumbnail } : page,
          ),
        );
      } catch {
        /* a page that will not render still gets a placeholder card */
      }
      if (index % 4 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    }

    this.loadingThumbs.set(false);
  }

  protected setPassword(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
  }

  protected retryWithPassword(): void {
    const file = this.primaryFile();
    if (file) void this.load(file);
  }

  /* ---------------- history ---------------- */

  private commit(next: PageCard[]): void {
    this.history = [...this.history.slice(-24), this.pages().map((page) => ({ ...page }))];
    this.future = [];
    this.pages.set(next);
  }

  protected undo(): void {
    const previous = this.history.pop();
    if (!previous) return;
    this.future = [this.pages().map((page) => ({ ...page })), ...this.future];
    this.pages.set(previous);
  }

  protected redo(): void {
    const [next, ...rest] = this.future;
    if (!next) return;
    this.history = [...this.history, this.pages().map((page) => ({ ...page }))];
    this.future = rest;
    this.pages.set(next);
  }

  /* ---------------- selection ---------------- */

  protected toggle(key: string): void {
    this.pages.update((list) =>
      list.map((page) => (page.key === key ? { ...page, selected: !page.selected } : page)),
    );
  }

  protected selectAll(): void {
    this.pages.update((list) => list.map((page) => ({ ...page, selected: true })));
  }

  protected selectNone(): void {
    this.pages.update((list) => list.map((page) => ({ ...page, selected: false })));
  }

  protected invertSelection(): void {
    this.pages.update((list) => list.map((page) => ({ ...page, selected: !page.selected })));
  }

  protected selectParity(odd: boolean): void {
    this.pages.update((list) =>
      list.map((page, index) => ({ ...page, selected: index % 2 === (odd ? 0 : 1) })),
    );
  }

  protected applyRange(): void {
    const indices = new Set(parsePageRanges(this.rangeInput(), this.pages().length));
    this.pages.update((list) =>
      list.map((page, index) => ({ ...page, selected: indices.has(index) })),
    );
  }

  protected setRange(event: Event): void {
    this.rangeInput.set((event.target as HTMLInputElement).value);
  }

  protected syncRangeFromSelection(): void {
    this.rangeInput.set(
      formatPageRanges(
        this.pages()
          .map((page, index) => (page.selected ? index : -1))
          .filter((index) => index >= 0),
      ),
    );
  }

  /* ---------------- editing ---------------- */

  private targets(): Set<string> {
    const selected = this.selected();
    return new Set((selected.length ? selected : this.pages()).map((page) => page.key));
  }

  protected rotate(delta: number): void {
    const keys = this.targets();
    this.commit(
      this.pages().map((page) =>
        keys.has(page.key) ? { ...page, rotation: (page.rotation + delta + 360) % 360 } : page,
      ),
    );
  }

  protected rotateOne(key: string, delta: number): void {
    this.commit(
      this.pages().map((page) =>
        page.key === key ? { ...page, rotation: (page.rotation + delta + 360) % 360 } : page,
      ),
    );
  }

  protected removeOne(key: string): void {
    this.commit(this.pages().filter((page) => page.key !== key));
  }

  protected removeSelected(): void {
    const keys = new Set(this.selected().map((page) => page.key));
    if (!keys.size) return;
    this.commit(this.pages().filter((page) => !keys.has(page.key)));
  }

  protected duplicate(key: string): void {
    const list = this.pages();
    const index = list.findIndex((page) => page.key === key);
    if (index === -1) return;
    const copy: PageCard = {
      ...list[index],
      key: `${list[index].key}-copy-${Math.random().toString(36).slice(2, 6)}`,
      selected: false,
    };
    this.commit([...list.slice(0, index + 1), copy, ...list.slice(index + 1)]);
  }

  protected move(key: string, delta: number): void {
    const list = [...this.pages()];
    const index = list.findIndex((page) => page.key === key);
    const target = index + delta;
    if (index === -1 || target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    this.commit(list);
  }

  protected reverse(): void {
    this.commit([...this.pages()].reverse());
  }

  protected sortOriginal(): void {
    this.commit([...this.pages()].sort((a, b) => a.sourceIndex - b.sourceIndex));
  }

  protected onDragStart(key: string): void {
    this.dragKey.set(key);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  protected onDrop(targetKey: string): void {
    const sourceKey = this.dragKey();
    this.dragKey.set(null);
    if (!sourceKey || sourceKey === targetKey) return;

    const list = [...this.pages()];
    const from = list.findIndex((page) => page.key === sourceKey);
    const to = list.findIndex((page) => page.key === targetKey);
    if (from === -1 || to === -1) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    this.commit(list);
  }

  protected toggleSplitEach(event: Event): void {
    this.splitEach.set((event.target as HTMLInputElement).checked);
  }

  /* ---------------- output ---------------- */

  protected async apply(): Promise<void> {
    const file = this.primaryFile();
    if (!file) return;
    const mode = this.mode();
    const password = this.password() || undefined;

    if (mode === 'extract') {
      const indices = this.selected().map((page) => page.sourceIndex);
      if (this.splitEach()) {
        const outputs = await this.run('Extracting pages…', async () => {
          const results = [];
          for (const [position, index] of indices.entries()) {
            const blob = await extractPages(file, [index], password);
            results.push(this.output(withSuffix(file.name, `-page-${index + 1}`), blob));
            this.onProgress(position + 1, indices.length);
          }
          return results;
        });
        if (outputs) this.setOutputs(outputs);
        return;
      }

      const blob = await this.run('Extracting pages…', () =>
        extractPages(file, indices, password),
      );
      if (blob) this.setOutputs([this.output(withSuffix(file.name, '-extracted'), blob)]);
      return;
    }

    let plan: PageEdit[];
    if (mode === 'delete') {
      const keys = new Set(this.selected().map((page) => page.key));
      plan = this.pages()
        .filter((page) => !keys.has(page.key))
        .map((page) => ({ sourceIndex: page.sourceIndex, rotate: page.rotation }));
    } else {
      plan = this.pages().map((page) => ({
        sourceIndex: page.sourceIndex,
        rotate: page.rotation,
      }));
    }

    if (!plan.length) {
      this.toast.warning('That would remove every page');
      return;
    }

    const suffix =
      mode === 'rotate' ? '-rotated' : mode === 'delete' ? '-trimmed' : '-organised';
    const blob = await this.run('Rebuilding PDF…', () => applyPagePlan(file, plan, password));
    if (blob) this.setOutputs([this.output(withSuffix(file.name, suffix), blob)]);
  }

  protected startOver(): void {
    void closePdf(this.doc);
    this.doc = null;
    this.pages.set([]);
    this.history = [];
    this.future = [];
    this.password.set('');
    this.needsPassword.set(false);
    this.reset();
  }
}
