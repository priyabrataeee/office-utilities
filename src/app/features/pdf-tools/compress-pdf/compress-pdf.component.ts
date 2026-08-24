import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { FileSizePipe } from '../../../shared/pipes/file-size.pipe';
import { ToolBase } from '../../../shared/tool-base';
import { compressPdf, type CompressOptions } from '../../../core/engines/pdf.engine';
import { closePdf, describePdf, openPdf } from '../../../core/engines/pdfjs.engine';
import { withSuffix } from '../../../core/utils/file.util';

type Preset = 'light' | 'balanced' | 'strong' | 'custom';

const PRESETS: Record<Exclude<Preset, 'custom'>, CompressOptions> = {
  light: { maxImageDimension: 2400, imageQuality: 0.85, stripMetadata: false, grayscale: false },
  balanced: { maxImageDimension: 1600, imageQuality: 0.7, stripMetadata: true, grayscale: false },
  strong: { maxImageDimension: 1100, imageQuality: 0.5, stripMetadata: true, grayscale: false },
};

@Component({
  selector: 'app-compress-pdf',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    ResultPanelComponent,
    BusyOverlayComponent,
    IconComponent,
    FileSizePipe,
  ],
  templateUrl: './compress-pdf.component.html',
  styleUrl: './compress-pdf.component.scss',
})
export class CompressPdfComponent extends ToolBase {
  readonly toolId = 'compress-pdf';

  protected readonly preset = signal<Preset>('balanced');
  protected readonly quality = signal(0.7);
  protected readonly maxDimension = signal(1600);
  protected readonly stripMetadata = signal(true);
  protected readonly grayscale = signal(false);

  protected readonly pageCount = signal(0);
  protected readonly hasTextLayer = signal(true);
  protected readonly imagesProcessed = signal(0);

  protected readonly options = computed<CompressOptions>(() => {
    const preset = this.preset();
    if (preset !== 'custom') return PRESETS[preset];
    return {
      maxImageDimension: this.maxDimension(),
      imageQuality: this.quality(),
      stripMetadata: this.stripMetadata(),
      grayscale: this.grayscale(),
    };
  });

  protected readonly savedBytes = computed(() => {
    const original = this.primaryFile()?.size ?? 0;
    const produced = this.outputs()[0]?.size ?? 0;
    return produced && original > produced ? original - produced : 0;
  });

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override afterFiles(files: File[]): void {
    if (files[0]) void this.inspect(files[0]);
  }

  private async inspect(file: File): Promise<void> {
    await this.run('Inspecting PDF…', async () => {
      const doc = await openPdf(await file.arrayBuffer());
      try {
        const info = await describePdf(doc);
        this.pageCount.set(info.pageCount);
        this.hasTextLayer.set(info.hasTextLayer);
      } finally {
        await closePdf(doc);
      }
    });
  }

  protected setPreset(preset: Preset): void {
    this.preset.set(preset);
    if (preset !== 'custom') {
      const values = PRESETS[preset];
      this.quality.set(values.imageQuality);
      this.maxDimension.set(values.maxImageDimension);
      this.stripMetadata.set(values.stripMetadata);
      this.grayscale.set(values.grayscale);
    }
  }

  protected setQuality(event: Event): void {
    this.quality.set(Number((event.target as HTMLInputElement).value));
    this.preset.set('custom');
  }

  protected setMaxDimension(event: Event): void {
    this.maxDimension.set(Number((event.target as HTMLInputElement).value));
    this.preset.set('custom');
  }

  protected toggleStrip(event: Event): void {
    this.stripMetadata.set((event.target as HTMLInputElement).checked);
    this.preset.set('custom');
  }

  protected toggleGrayscale(event: Event): void {
    this.grayscale.set((event.target as HTMLInputElement).checked);
    this.preset.set('custom');
  }

  protected async compress(): Promise<void> {
    const file = this.primaryFile();
    if (!file) return;

    const result = await this.run('Compressing…', () =>
      compressPdf(file, this.options(), this.onProgress),
    );
    if (!result) return;

    this.imagesProcessed.set(result.imagesProcessed);

    if (result.blob.size >= file.size) {
      this.toast.warning(
        'This PDF is already well optimised',
        'Compressing it further would make it bigger, so the original is offered instead.',
      );
      this.setOutputs([this.output(file.name, file)]);
      return;
    }

    this.setOutputs([this.output(withSuffix(file.name, '-compressed'), result.blob)]);
  }

  protected startOver(): void {
    this.pageCount.set(0);
    this.imagesProcessed.set(0);
    this.reset();
  }
}
