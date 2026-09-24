import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolBase } from '../../../shared/tool-base';
import {
  closePdf,
  extractPageText,
  openPdf,
  renderPage,
  renderThumbnail,
} from '../../../core/engines/pdfjs.engine';
import { parsePageRanges, withExtension, yieldToBrowser } from '../../../core/utils/file.util';

type SlideShape = 'match' | 'wide' | 'classic';
type Quality = 'standard' | 'high' | 'maximum';

const SCALES: Record<Quality, number> = { standard: 1.5, high: 2.2, maximum: 3 };

const LONGEST_EDGE_INCHES = 10;

@Component({
  selector: 'app-pdf-to-powerpoint',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    ResultPanelComponent,
    BusyOverlayComponent,
    IconComponent,
  ],
  templateUrl: './pdf-to-powerpoint.component.html',
  styleUrl: './pdf-to-powerpoint.component.scss',
})
export class PdfToPowerpointComponent extends ToolBase {
  readonly toolId = 'pdf-to-powerpoint';

  protected readonly pageCount = signal(0);
  protected readonly firstPageRatio = signal(0);
  protected readonly preview = signal<string | null>(null);
  protected readonly hasTextLayer = signal(true);

  protected readonly shape = signal<SlideShape>('match');
  protected readonly quality = signal<Quality>('high');
  protected readonly speakerNotes = signal(true);
  protected readonly allPages = signal(true);
  protected readonly pageRange = signal('');

  protected readonly selectedPages = computed(() => {
    const count = this.pageCount();
    if (!count) return [];
    if (this.allPages()) return Array.from({ length: count }, (_, index) => index + 1);
    return parsePageRanges(this.pageRange(), count).map((index) => index + 1);
  });

  protected readonly ready = computed(() => this.hasFile() && this.selectedPages().length > 0);

  protected readonly heavy = computed(
    () => this.selectedPages().length * SCALES[this.quality()] > 90,
  );

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override afterFiles(files: File[]): void {
    if (files[0]) void this.inspect(files[0]);
  }

  private async inspect(file: File): Promise<void> {
    await this.run('Opening the PDF…', async () => {
      const doc = await openPdf(await file.arrayBuffer());
      try {
        this.pageCount.set(doc.numPages);

        const page = await doc.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        this.firstPageRatio.set(viewport.width / viewport.height);
        page.cleanup();

        const text = await extractPageText(doc, 1);
        this.hasTextLayer.set(text.text.trim().length > 0);
      } finally {
        await closePdf(doc);
      }
    });

    void this.renderPreview(file);
  }

  private async renderPreview(file: File): Promise<void> {
    try {
      const doc = await openPdf(await file.arrayBuffer());
      try {
        this.preview.set(await renderThumbnail(doc, 1, 260));
      } finally {
        await closePdf(doc);
      }
    } catch (error) {
      this.preview.set(null);
      console.warn('pdf-to-powerpoint: preview failed', error);
    }
  }

  protected setShape(event: Event): void {
    this.shape.set((event.target as HTMLSelectElement).value as SlideShape);
  }
  protected setQuality(event: Event): void {
    this.quality.set((event.target as HTMLSelectElement).value as Quality);
  }
  protected toggleNotes(event: Event): void {
    this.speakerNotes.set((event.target as HTMLInputElement).checked);
  }
  protected toggleAllPages(event: Event): void {
    this.allPages.set((event.target as HTMLInputElement).checked);
  }
  protected setRange(event: Event): void {
    this.pageRange.set((event.target as HTMLInputElement).value);
  }

  private slideSize(): { width: number; height: number; layout: string | null } {
    switch (this.shape()) {
      case 'wide':
        return { width: 13.333, height: 7.5, layout: 'LAYOUT_WIDE' };
      case 'classic':
        return { width: 10, height: 7.5, layout: 'LAYOUT_4x3' };
      default: {
        const ratio = this.firstPageRatio() || 1 / Math.SQRT2;
        return ratio >= 1
          ? { width: LONGEST_EDGE_INCHES, height: LONGEST_EDGE_INCHES / ratio, layout: null }
          : { width: LONGEST_EDGE_INCHES * ratio, height: LONGEST_EDGE_INCHES, layout: null };
      }
    }
  }

  protected async convert(): Promise<void> {
    const file = this.primaryFile();
    const pages = this.selectedPages();
    if (!file || !pages.length) return;

    const blob = await this.run('Rendering pages…', async () => {
      const PptxGenJS = (await import('pptxgenjs')).default;
      const pres = new PptxGenJS();

      const { width, height, layout } = this.slideSize();
      if (layout) {
        pres.layout = layout;
      } else {
        pres.defineLayout({ name: 'PDF', width, height });
        pres.layout = 'PDF';
      }
      pres.title = file.name.replace(/\.pdf$/i, '');
      pres.company = 'Office Utilities';

      const doc = await openPdf(await file.arrayBuffer());
      try {
        const scale = SCALES[this.quality()];

        for (const [index, pageNumber] of pages.entries()) {
          const canvas = await renderPage(doc, pageNumber, {
            scale,
            background: '#ffffff',
            maxDimension: 4400,
          });
          const data = canvas.toDataURL('image/jpeg', 0.88);
          canvas.width = 0;
          canvas.height = 0;

          const slide = pres.addSlide();
          slide.background = { color: 'FFFFFF' };
          slide.addImage({
            data,
            x: 0,
            y: 0,
            w: width,
            h: height,
            sizing: { type: 'contain', w: width, h: height },
          });

          if (this.speakerNotes()) {
            const text = await extractPageText(doc, pageNumber);
            if (text.text.trim()) slide.addNotes(text.text.trim().slice(0, 30000));
          }

          this.onProgress(index + 1, pages.length);
          await yieldToBrowser();
        }
      } finally {
        await closePdf(doc);
      }

      this.progressLabel.set('Writing the presentation…');
      return (await pres.write({ outputType: 'blob' })) as Blob;
    });

    if (blob) this.setOutputs([this.output(withExtension(file.name, '.pptx'), blob)]);
  }

  protected startOver(): void {
    this.pageCount.set(0);
    this.preview.set(null);
    this.pageRange.set('');
    this.allPages.set(true);
    this.reset();
  }
}
