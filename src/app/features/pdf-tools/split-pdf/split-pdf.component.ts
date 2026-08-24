import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolBase } from '../../../shared/tool-base';
import { chunkPages, splitAt, splitPdf, type SplitPart } from '../../../core/engines/pdf.engine';
import {
  closePdf,
  openPdf,
  PasswordRequiredError,
  renderThumbnail,
} from '../../../core/engines/pdfjs.engine';
import { baseNameOf, formatPageRanges, parsePageRanges } from '../../../core/utils/file.util';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';

type SplitMode = 'marks' | 'every' | 'ranges' | 'each';

@Component({
  selector: 'app-split-pdf',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    ResultPanelComponent,
    BusyOverlayComponent,
    IconComponent,
  ],
  templateUrl: './split-pdf.component.html',
  styleUrl: './split-pdf.component.scss',
})
export class SplitPdfComponent extends ToolBase {
  readonly toolId = 'split-pdf';

  protected readonly pageCount = signal(0);
  protected readonly thumbnails = signal<(string | null)[]>([]);
  protected readonly mode = signal<SplitMode>('marks');
  /** Zero-based indices where a new document begins. */
  protected readonly breaks = signal<number[]>([]);
  protected readonly chunkSize = signal(1);
  protected readonly rangesInput = signal('');
  protected readonly password = signal('');
  protected readonly needsPassword = signal(false);

  private doc: PDFDocumentProxy | null = null;

  /** The split plan, recomputed live so the preview always matches. */
  protected readonly parts = computed<SplitPart[]>(() => {
    const total = this.pageCount();
    if (!total) return [];
    const base = baseNameOf(this.primaryFile()?.name ?? 'document');

    const name = (indices: readonly number[], index: number): string => {
      const label =
        indices.length === 1
          ? `page-${indices[0] + 1}`
          : `${indices[0] + 1}-${indices[indices.length - 1] + 1}`;
      return `${base}-${index + 1}-${label}.pdf`;
    };

    switch (this.mode()) {
      case 'each':
        return Array.from({ length: total }, (_, index) => ({
          name: `${base}-page-${index + 1}.pdf`,
          indices: [index],
        }));

      case 'every': {
        const size = Math.max(1, this.chunkSize());
        return chunkPages(total, size).map((indices, index) => ({
          name: name(indices, index),
          indices,
        }));
      }

      case 'ranges': {
        const groups = this.rangesInput()
          .split(/[;\n]+/)
          .map((chunk) => parsePageRanges(chunk, total))
          .filter((indices) => indices.length > 0);
        return groups.map((indices, index) => ({ name: name(indices, index), indices }));
      }

      default:
        return splitAt(total, this.breaks()).map((indices, index) => ({
          name: name(indices, index),
          indices,
        }));
    }
  });

  protected readonly partCount = computed(() => this.parts().length);

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
    this.pageCount.set(0);
    this.breaks.set([]);

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
      this.pageCount.set(doc.numPages);
      this.thumbnails.set(new Array(doc.numPages).fill(null));
      // Halfway is the split people reach for most often.
      this.breaks.set(doc.numPages > 1 ? [Math.ceil(doc.numPages / 2)] : []);
      this.rangesInput.set(doc.numPages > 1 ? `1-${Math.ceil(doc.numPages / 2)}; ${Math.ceil(doc.numPages / 2) + 1}-${doc.numPages}` : '1');
      void this.renderThumbnails(doc);
    });
  }

  private async renderThumbnails(doc: PDFDocumentProxy): Promise<void> {
    for (let index = 1; index <= doc.numPages; index++) {
      if (this.doc !== doc) return;
      try {
        const thumbnail = await renderThumbnail(doc, index, 160);
        this.thumbnails.update((list) => {
          const next = [...list];
          next[index - 1] = thumbnail;
          return next;
        });
      } catch {
        /* keep the placeholder */
      }
      if (index % 4 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  protected setMode(mode: SplitMode): void {
    this.mode.set(mode);
  }

  protected toggleBreak(afterIndex: number): void {
    const value = afterIndex + 1;
    this.breaks.update((list) =>
      list.includes(value) ? list.filter((b) => b !== value) : [...list, value].sort((a, b) => a - b),
    );
  }

  protected hasBreak(afterIndex: number): boolean {
    return this.breaks().includes(afterIndex + 1);
  }

  protected setChunkSize(event: Event): void {
    const value = Number.parseInt((event.target as HTMLInputElement).value, 10);
    this.chunkSize.set(Number.isFinite(value) && value > 0 ? value : 1);
  }

  protected setRanges(event: Event): void {
    this.rangesInput.set((event.target as HTMLTextAreaElement).value);
  }

  protected setPassword(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
  }

  protected retryWithPassword(): void {
    const file = this.primaryFile();
    if (file) void this.load(file);
  }

  protected describe(part: SplitPart): string {
    return `${part.indices.length} ${part.indices.length === 1 ? 'page' : 'pages'} · ${formatPageRanges(part.indices)}`;
  }

  protected async split(): Promise<void> {
    const file = this.primaryFile();
    const parts = this.parts();
    if (!file || !parts.length) return;

    const results = await this.run('Splitting PDF…', () =>
      splitPdf(file, parts, this.password() || undefined, this.onProgress),
    );
    if (!results) return;

    this.setOutputs(results.map((result) => this.output(result.name, result.blob)));
  }

  protected startOver(): void {
    void closePdf(this.doc);
    this.doc = null;
    this.pageCount.set(0);
    this.thumbnails.set([]);
    this.breaks.set([]);
    this.password.set('');
    this.needsPassword.set(false);
    this.reset();
  }
}
