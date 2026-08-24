import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { FileSizePipe } from '../../../shared/pipes/file-size.pipe';
import { ToolBase } from '../../../shared/tool-base';
import { mergePdfs, type MergeSource } from '../../../core/engines/pdf.engine';
import { closePdf, openPdf, PasswordRequiredError } from '../../../core/engines/pdfjs.engine';
import { parsePageRanges } from '../../../core/utils/file.util';

interface QueuedPdf {
  readonly id: string;
  readonly file: File;
  pageCount: number | null;
  /** Empty means "all pages". */
  range: string;
  password: string;
  needsPassword: boolean;
  error: string;
}

@Component({
  selector: 'app-merge-pdf',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    ResultPanelComponent,
    BusyOverlayComponent,
    IconComponent,
    FileSizePipe,
  ],
  templateUrl: './merge-pdf.component.html',
  styleUrl: './merge-pdf.component.scss',
})
export class MergePdfComponent extends ToolBase {
  readonly toolId = 'merge-pdf';

  protected readonly queue = signal<QueuedPdf[]>([]);
  protected readonly outputName = signal('merged.pdf');
  protected readonly dragIndex = signal<number | null>(null);

  protected readonly totalPages = computed(() =>
    this.queue().reduce((sum, item) => sum + (item.pageCount ?? 0), 0),
  );
  protected readonly totalSize = computed(() =>
    this.queue().reduce((sum, item) => sum + item.file.size, 0),
  );
  protected readonly canMerge = computed(
    () => this.queue().length >= 2 && !this.queue().some((item) => item.needsPassword),
  );

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override afterFiles(files: File[]): void {
    const existing = this.queue();
    const additions: QueuedPdf[] = files
      .filter(
        (file) =>
          !existing.some(
            (item) =>
              item.file.name === file.name &&
              item.file.size === file.size &&
              item.file.lastModified === file.lastModified,
          ),
      )
      .map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        pageCount: null,
        range: '',
        password: '',
        needsPassword: false,
        error: '',
      }));

    if (!additions.length) return;
    this.queue.set([...existing, ...additions]);
    for (const item of additions) void this.inspect(item.id);
  }

  /** Reads the page count so the UI can show what will be merged. */
  private async inspect(id: string): Promise<void> {
    const item = this.queue().find((entry) => entry.id === id);
    if (!item) return;

    try {
      const doc = await openPdf(await item.file.arrayBuffer(), { password: item.password });
      this.patch(id, { pageCount: doc.numPages, needsPassword: false, error: '' });
      await closePdf(doc);
    } catch (error) {
      if (error instanceof PasswordRequiredError) {
        this.patch(id, {
          needsPassword: true,
          error: error.wrongPassword ? 'Wrong password' : 'Password required',
        });
      } else {
        this.patch(id, { error: 'Could not be read', pageCount: 0 });
      }
    }
  }

  private patch(id: string, changes: Partial<QueuedPdf>): void {
    this.queue.update((list) =>
      list.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  }

  protected setRange(id: string, event: Event): void {
    this.patch(id, { range: (event.target as HTMLInputElement).value });
  }

  protected setPassword(id: string, event: Event): void {
    this.patch(id, { password: (event.target as HTMLInputElement).value });
  }

  protected unlock(id: string): void {
    void this.inspect(id);
  }

  protected remove(id: string): void {
    this.queue.update((list) => list.filter((item) => item.id !== id));
  }

  protected move(index: number, delta: number): void {
    const list = [...this.queue()];
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    this.queue.set(list);
  }

  protected sortByName(): void {
    this.queue.set(
      [...this.queue()].sort((a, b) =>
        a.file.name.localeCompare(b.file.name, undefined, { numeric: true }),
      ),
    );
  }

  protected reverse(): void {
    this.queue.set([...this.queue()].reverse());
  }

  protected onDragStart(index: number): void {
    this.dragIndex.set(index);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  protected onDrop(index: number): void {
    const from = this.dragIndex();
    this.dragIndex.set(null);
    if (from === null || from === index) return;
    const list = [...this.queue()];
    const [moved] = list.splice(from, 1);
    list.splice(index, 0, moved);
    this.queue.set(list);
  }

  protected setOutputName(event: Event): void {
    this.outputName.set((event.target as HTMLInputElement).value);
  }

  protected async merge(): Promise<void> {
    const sources: MergeSource[] = this.queue().map((item) => ({
      file: item.file,
      name: item.file.name,
      password: item.password || undefined,
      pages:
        item.range.trim() && item.pageCount
          ? parsePageRanges(item.range, item.pageCount)
          : undefined,
    }));

    const blob = await this.run('Merging PDFs…', () => mergePdfs(sources, this.onProgress));
    if (!blob) return;

    const name = this.outputName().trim() || 'merged.pdf';
    this.setOutputs([this.output(name.endsWith('.pdf') ? name : `${name}.pdf`, blob)]);
  }

  protected startOver(): void {
    this.queue.set([]);
    this.reset();
  }
}
