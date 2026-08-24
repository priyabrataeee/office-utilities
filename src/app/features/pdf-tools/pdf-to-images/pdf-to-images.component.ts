import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolBase } from '../../../shared/tool-base';
import {
  closePdf,
  openPdf,
  PasswordRequiredError,
  renderPage,
  renderThumbnail,
} from '../../../core/engines/pdfjs.engine';
import { canvasToBlob, extensionForMime, type ImageMime } from '../../../core/engines/image.engine';
import { baseNameOf, parsePageRanges } from '../../../core/utils/file.util';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';

/** Screen and print resolutions, expressed as PDF-point scale factors. */
const DPI_SCALES: readonly { dpi: number; label: string }[] = [
  { dpi: 72, label: 'Screen (72 DPI)' },
  { dpi: 96, label: 'Web (96 DPI)' },
  { dpi: 150, label: 'Good (150 DPI)' },
  { dpi: 300, label: 'Print (300 DPI)' },
];

@Component({
  selector: 'app-pdf-to-images',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    ResultPanelComponent,
    BusyOverlayComponent,
    IconComponent,
  ],
  templateUrl: './pdf-to-images.component.html',
  styleUrl: './pdf-to-images.component.scss',
})
export class PdfToImagesComponent extends ToolBase {
  readonly toolId = 'pdf-to-images';

  protected readonly dpiScales = DPI_SCALES;
  protected readonly pageCount = signal(0);
  protected readonly thumbnails = signal<(string | null)[]>([]);
  protected readonly selection = signal<Set<number>>(new Set());
  protected readonly rangeInput = signal('');
  protected readonly format = signal<ImageMime>('image/png');
  protected readonly dpi = signal(150);
  protected readonly quality = signal(0.92);
  protected readonly password = signal('');
  protected readonly needsPassword = signal(false);

  private doc: PDFDocumentProxy | null = null;

  protected readonly selectedCount = computed(() => this.selection().size);
  protected readonly isJpeg = computed(() => this.format() !== 'image/png');

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
      this.selection.set(new Set(Array.from({ length: doc.numPages }, (_, i) => i)));
      void this.renderThumbnails(doc);
    });
  }

  private async renderThumbnails(doc: PDFDocumentProxy): Promise<void> {
    for (let index = 1; index <= doc.numPages; index++) {
      if (this.doc !== doc) return;
      try {
        const thumbnail = await renderThumbnail(doc, index, 170);
        this.thumbnails.update((list) => {
          const next = [...list];
          next[index - 1] = thumbnail;
          return next;
        });
      } catch {
        /* leave the placeholder in place */
      }
      if (index % 4 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  protected isSelected(index: number): boolean {
    return this.selection().has(index);
  }

  protected toggle(index: number): void {
    const next = new Set(this.selection());
    next.has(index) ? next.delete(index) : next.add(index);
    this.selection.set(next);
  }

  protected selectAll(): void {
    this.selection.set(new Set(Array.from({ length: this.pageCount() }, (_, i) => i)));
  }

  protected selectNone(): void {
    this.selection.set(new Set());
  }

  protected applyRange(): void {
    this.selection.set(new Set(parsePageRanges(this.rangeInput(), this.pageCount())));
  }

  protected setRange(event: Event): void {
    this.rangeInput.set((event.target as HTMLInputElement).value);
  }

  protected setFormat(event: Event): void {
    this.format.set((event.target as HTMLSelectElement).value as ImageMime);
  }

  protected setDpi(event: Event): void {
    this.dpi.set(Number((event.target as HTMLSelectElement).value));
  }

  protected setQuality(event: Event): void {
    this.quality.set(Number((event.target as HTMLInputElement).value));
  }

  protected setPassword(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
  }

  protected retryWithPassword(): void {
    const file = this.primaryFile();
    if (file) void this.load(file);
  }

  protected async convert(): Promise<void> {
    const doc = this.doc;
    const file = this.primaryFile();
    if (!doc || !file) return;

    const indices = [...this.selection()].sort((a, b) => a - b);
    if (!indices.length) {
      this.toast.warning('Select at least one page');
      return;
    }

    const mime = this.format();
    const extension = extensionForMime(mime);
    const base = baseNameOf(file.name);
    // PDF user space is 72 units per inch, so the scale is just dpi / 72.
    const scale = this.dpi() / 72;

    const outputs = await this.run('Rendering pages…', async () => {
      const produced = [];
      for (const [position, index] of indices.entries()) {
        const canvas = await renderPage(doc, index + 1, {
          scale,
          background: mime === 'image/png' ? undefined : '#ffffff',
        });
        const blob = await canvasToBlob(canvas, mime, this.isJpeg() ? this.quality() : undefined);
        produced.push(
          this.output(
            `${base}-page-${String(index + 1).padStart(String(this.pageCount()).length, '0')}${extension}`,
            blob,
          ),
        );
        // Release the canvas before the next page allocates another one.
        canvas.width = 0;
        canvas.height = 0;
        this.onProgress(position + 1, indices.length);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      return produced;
    });

    if (outputs) this.setOutputs(outputs);
  }

  protected startOver(): void {
    void closePdf(this.doc);
    this.doc = null;
    this.pageCount.set(0);
    this.thumbnails.set([]);
    this.selection.set(new Set());
    this.password.set('');
    this.needsPassword.set(false);
    this.reset();
  }
}
