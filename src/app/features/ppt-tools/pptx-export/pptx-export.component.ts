import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolBase } from '../../../shared/tool-base';
import { readPresentation, slideToSvg, type Presentation } from '../../../core/engines/pptx.engine';
import { svgToRaster, type ImageMime } from '../../../core/engines/image.engine';
import { loadPdfLib } from '../../../core/engines/pdf.engine';
import { baseNameOf, withExtension } from '../../../core/utils/file.util';

export type ExportTarget = 'pdf' | 'images';

/**
 * Exports a deck to PDF or to images.
 *
 * Slides are rendered to SVG first, then either rasterised for image output or
 * embedded as page-sized PNGs in a PDF — which keeps one rendering path
 * responsible for how a slide actually looks.
 */
@Component({
  selector: 'app-pptx-export',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    ResultPanelComponent,
    BusyOverlayComponent,
    IconComponent,
  ],
  templateUrl: './pptx-export.component.html',
  styleUrl: './pptx-export.component.scss',
})
export class PptxExportComponent extends ToolBase {
  private readonly sanitizer = inject(DomSanitizer);

  readonly toolIdInput = input.required<string>({ alias: 'toolId' });
  readonly target = input.required<ExportTarget>();

  get toolId(): string {
    return this.toolIdInput();
  }

  protected readonly deck = signal<Presentation | null>(null);
  protected readonly selection = signal<Set<number>>(new Set());
  protected readonly scale = signal(2);
  protected readonly format = signal<ImageMime>('image/png');
  protected readonly includeNotes = signal(false);
  protected readonly handoutPerPage = signal(1);

  protected readonly isPdf = computed(() => this.target() === 'pdf');
  protected readonly slides = computed(() => this.deck()?.slides ?? []);
  protected readonly selectedCount = computed(() => this.selection().size);

  protected readonly aspect = computed(() => {
    const deck = this.deck();
    return deck ? `${deck.width} / ${deck.height}` : '16 / 9';
  });

  protected readonly previews = computed<SafeHtml[]>(() => {
    const deck = this.deck();
    if (!deck) return [];
    return deck.slides.map((slide) =>
      this.sanitizer.bypassSecurityTrustHtml(slideToSvg(slide, deck.width, deck.height)),
    );
  });

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override afterFiles(files: File[]): void {
    const file = files[0];
    if (!file) return;

    void this.run('Reading presentation…', async () => {
      const deck = await readPresentation(file);
      this.deck.set(deck);
      this.selection.set(new Set(deck.slides.map((_, index) => index)));
      if (deck.warnings.length) this.toast.info(deck.warnings[0]);
    });
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
    this.selection.set(new Set(this.slides().map((_, index) => index)));
  }

  protected selectNone(): void {
    this.selection.set(new Set());
  }

  protected setScale(event: Event): void {
    this.scale.set(Number((event.target as HTMLInputElement).value));
  }

  protected setFormat(event: Event): void {
    this.format.set((event.target as HTMLSelectElement).value as ImageMime);
  }

  protected toggleNotes(event: Event): void {
    this.includeNotes.set((event.target as HTMLInputElement).checked);
  }

  protected setPerPage(event: Event): void {
    this.handoutPerPage.set(Number((event.target as HTMLSelectElement).value));
  }

  protected async export(): Promise<void> {
    const deck = this.deck();
    const file = this.primaryFile();
    if (!deck || !file) return;

    const indices = [...this.selection()].sort((a, b) => a - b);
    if (!indices.length) {
      this.toast.warning('Select at least one slide');
      return;
    }

    if (this.isPdf()) {
      await this.exportPdf(deck, file.name, indices);
      return;
    }

    await this.exportImages(deck, file.name, indices);
  }

  private async exportImages(
    deck: Presentation,
    fileName: string,
    indices: readonly number[],
  ): Promise<void> {
    const base = baseNameOf(fileName);
    const extension = this.format() === 'image/jpeg' ? '.jpg' : '.png';
    const pad = String(deck.slides.length).length;

    const outputs = await this.run('Rendering slides…', async () => {
      const produced = [];
      for (const [position, index] of indices.entries()) {
        const svg = slideToSvg(deck.slides[index], deck.width, deck.height);
        const blob = await svgToRaster(svg, {
          scale: this.scale(),
          mime: this.format(),
          background: '#ffffff',
        });
        produced.push(
          this.output(
            `${base}-slide-${String(index + 1).padStart(pad, '0')}${extension}`,
            blob,
          ),
        );
        this.onProgress(position + 1, indices.length);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      return produced;
    });

    if (outputs) this.setOutputs(outputs);
  }

  private async exportPdf(
    deck: Presentation,
    fileName: string,
    indices: readonly number[],
  ): Promise<void> {
    const perPage = this.handoutPerPage();

    const blob = await this.run('Building PDF…', async () => {
      const { PDFDocument, StandardFonts, rgb } = await loadPdfLib();
      const pdf = await PDFDocument.create();
      const font = await pdf.embedFont(StandardFonts.Helvetica);

      for (const [position, index] of indices.entries()) {
        const slide = deck.slides[index];
        const svg = slideToSvg(slide, deck.width, deck.height);
        const png = await svgToRaster(svg, {
          scale: this.scale(),
          mime: 'image/png',
          background: '#ffffff',
        });
        const image = await pdf.embedPng(new Uint8Array(await png.arrayBuffer()));

        if (perPage === 1) {
          const page = pdf.addPage([deck.width, deck.height]);
          page.drawImage(image, { x: 0, y: 0, width: deck.width, height: deck.height });

          if (this.includeNotes() && slide.notes) {
            // Notes go on their own page so the slide keeps its exact size.
            const notesPage = pdf.addPage([deck.width, deck.height]);
            notesPage.drawText(`Slide ${index + 1} — notes`, {
              x: 40,
              y: deck.height - 50,
              size: 13,
              font,
              color: rgb(0.1, 0.1, 0.12),
            });
            wrapText(slide.notes, 92).forEach((line, lineIndex) => {
              notesPage.drawText(line, {
                x: 40,
                y: deck.height - 78 - lineIndex * 15,
                size: 10,
                font,
                color: rgb(0.25, 0.26, 0.3),
              });
            });
          }
        } else {
          // Handout layout: N slides stacked on a portrait page.
          const pageWidth = 595.28;
          const pageHeight = 841.89;
          const slot = position % perPage;
          const page =
            slot === 0 ? pdf.addPage([pageWidth, pageHeight]) : pdf.getPage(pdf.getPageCount() - 1);

          const margin = 40;
          const slotHeight = (pageHeight - margin * 2) / perPage;
          const drawWidth = pageWidth - margin * 2;
          const drawHeight = Math.min(slotHeight - 14, drawWidth * (deck.height / deck.width));

          page.drawImage(image, {
            x: margin,
            y: pageHeight - margin - slot * slotHeight - drawHeight,
            width: drawWidth,
            height: drawHeight,
          });
        }

        this.onProgress(position + 1, indices.length);
      }

      pdf.setTitle(baseNameOf(fileName));
      pdf.setProducer('Office Utilities');
      const bytes = await pdf.save();
      return new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
    });

    if (blob) this.setOutputs([this.output(withExtension(fileName, '.pdf'), blob)]);
  }

  protected startOver(): void {
    this.deck.set(null);
    this.selection.set(new Set());
    this.reset();
  }
}

/** Naive word wrap used for the notes pages. */
function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let current = '';
    for (const word of paragraph.split(/\s+/)) {
      if ((current + ' ' + word).trim().length > maxChars) {
        lines.push(current.trim());
        current = word;
      } else {
        current += ` ${word}`;
      }
    }
    if (current.trim()) lines.push(current.trim());
  }
  return lines.slice(0, 40);
}
