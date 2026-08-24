import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolBase } from '../../../shared/tool-base';
import {
  addWatermark,
  type WatermarkOptions,
  type WatermarkPosition,
} from '../../../core/engines/pdf.engine';
import { closePdf, openPdf, renderThumbnail } from '../../../core/engines/pdfjs.engine';
import { parsePageRanges, withSuffix } from '../../../core/utils/file.util';

const POSITIONS: readonly { value: WatermarkPosition; label: string }[] = [
  { value: 'top-left', label: 'Top left' },
  { value: 'top-center', label: 'Top centre' },
  { value: 'top-right', label: 'Top right' },
  { value: 'center', label: 'Centre' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom-center', label: 'Bottom centre' },
  { value: 'bottom-right', label: 'Bottom right' },
];

@Component({
  selector: 'app-watermark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    ResultPanelComponent,
    BusyOverlayComponent,
    IconComponent,
  ],
  templateUrl: './watermark.component.html',
  styleUrl: './watermark.component.scss',
})
export class WatermarkComponent extends ToolBase {
  readonly toolId = 'watermark-pdf';

  protected readonly positions = POSITIONS;

  protected readonly kind = signal<'text' | 'image'>('text');
  protected readonly text = signal('CONFIDENTIAL');
  protected readonly fontSize = signal(52);
  protected readonly color = signal('#ff0000');
  protected readonly opacity = signal(0.18);
  protected readonly rotation = signal(35);
  protected readonly position = signal<WatermarkPosition>('center');
  protected readonly tile = signal(false);
  protected readonly imageScale = signal(0.4);
  protected readonly applyToAll = signal(true);
  protected readonly pageRange = signal('');

  protected readonly watermarkImage = signal<File | null>(null);
  protected readonly watermarkImageUrl = signal<string | null>(null);

  protected readonly pageCount = signal(0);
  protected readonly previewPage = signal<string | null>(null);

  protected readonly ready = computed(
    () =>
      this.hasFile() &&
      (this.kind() === 'text' ? this.text().trim().length > 0 : !!this.watermarkImage()),
  );

  /** CSS transform that mirrors what pdf-lib will draw, for the live preview. */
  protected readonly previewTransform = computed(
    () => `translate(-50%, -50%) rotate(${-this.rotation()}deg)`,
  );

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override afterFiles(files: File[]): void {
    if (files[0]) void this.loadPreview(files[0]);
  }

  private async loadPreview(file: File): Promise<void> {
    await this.run('Reading PDF…', async () => {
      const doc = await openPdf(await file.arrayBuffer());
      try {
        this.pageCount.set(doc.numPages);
        this.previewPage.set(await renderThumbnail(doc, 1, 420));
      } finally {
        await closePdf(doc);
      }
    });
  }

  protected onWatermarkImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const previous = this.watermarkImageUrl();
    if (previous) URL.revokeObjectURL(previous);
    this.watermarkImage.set(file);
    this.watermarkImageUrl.set(URL.createObjectURL(file));
    this.kind.set('image');
  }

  protected setKind(kind: 'text' | 'image'): void {
    this.kind.set(kind);
  }

  protected setText(event: Event): void {
    this.text.set((event.target as HTMLInputElement).value);
  }
  protected setFontSize(event: Event): void {
    this.fontSize.set(Number((event.target as HTMLInputElement).value));
  }
  protected setColor(event: Event): void {
    this.color.set((event.target as HTMLInputElement).value);
  }
  protected setOpacity(event: Event): void {
    this.opacity.set(Number((event.target as HTMLInputElement).value));
  }
  protected setRotation(event: Event): void {
    this.rotation.set(Number((event.target as HTMLInputElement).value));
  }
  protected setPosition(event: Event): void {
    this.position.set((event.target as HTMLSelectElement).value as WatermarkPosition);
  }
  protected setScale(event: Event): void {
    this.imageScale.set(Number((event.target as HTMLInputElement).value));
  }
  protected toggleTile(event: Event): void {
    this.tile.set((event.target as HTMLInputElement).checked);
  }
  protected toggleAllPages(event: Event): void {
    this.applyToAll.set((event.target as HTMLInputElement).checked);
  }
  protected setPageRange(event: Event): void {
    this.pageRange.set((event.target as HTMLInputElement).value);
  }

  protected async apply(): Promise<void> {
    const file = this.primaryFile();
    if (!file) return;

    const pages = this.applyToAll()
      ? undefined
      : parsePageRanges(this.pageRange(), this.pageCount());

    if (pages && !pages.length) {
      this.toast.warning('That page range does not match any pages');
      return;
    }

    const shared = {
      opacity: this.opacity(),
      rotation: this.rotation(),
      position: this.position(),
      tile: this.tile(),
      pages,
    };

    const options: WatermarkOptions =
      this.kind() === 'text'
        ? {
            kind: 'text',
            text: this.text(),
            fontSize: this.fontSize(),
            color: this.color(),
            ...shared,
          }
        : {
            kind: 'image',
            image: this.watermarkImage() as File,
            scale: this.imageScale(),
            ...shared,
          };

    const blob = await this.run('Stamping pages…', () => addWatermark(file, options));
    if (blob) this.setOutputs([this.output(withSuffix(file.name, '-watermarked'), blob)]);
  }

  protected startOver(): void {
    const url = this.watermarkImageUrl();
    if (url) URL.revokeObjectURL(url);
    this.watermarkImage.set(null);
    this.watermarkImageUrl.set(null);
    this.previewPage.set(null);
    this.pageCount.set(0);
    this.reset();
  }
}
