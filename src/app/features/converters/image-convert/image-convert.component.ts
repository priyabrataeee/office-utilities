import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { FileSizePipe } from '../../../shared/pipes/file-size.pipe';
import { ToolBase } from '../../../shared/tool-base';
import {
  encodeImage,
  extensionForMime,
  inspectImage,
  supportsFormat,
  svgToRaster,
  type ImageMime,
} from '../../../core/engines/image.engine';
import { baseNameOf, extensionOf, readAsText } from '../../../core/utils/file.util';

export type ImagePreset = 'any' | 'svg-to-png' | 'png-to-webp' | 'jpg-to-png';

interface Entry {
  readonly id: string;
  readonly file: File;
  readonly url: string;
  width: number;
  height: number;
  outputSize: number | null;
}

const PRESETS: Record<
  ImagePreset,
  { accepts: string[]; target: ImageMime; title: string; icon: string }
> = {
  any: {
    accepts: ['.png', '.jpg', '.jpeg', '.webp', '.avif', '.bmp', '.gif'],
    target: 'image/webp',
    title: 'Drop images to convert',
    icon: 'image',
  },
  'svg-to-png': {
    accepts: ['.svg'],
    target: 'image/png',
    title: 'Drop SVG files to rasterise',
    icon: 'image',
  },
  'png-to-webp': {
    accepts: ['.png', '.jpg', '.jpeg'],
    target: 'image/webp',
    title: 'Drop PNG or JPEG images',
    icon: 'minimize',
  },
  'jpg-to-png': {
    accepts: ['.jpg', '.jpeg'],
    target: 'image/png',
    title: 'Drop JPEG photos',
    icon: 'image',
  },
};

/**
 * Batch image conversion using the browser's own encoders.
 *
 * Backs four catalog entries; the preset chooses the accepted inputs and the
 * default target, and everything else is the same pipeline.
 */
@Component({
  selector: 'app-image-convert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    ResultPanelComponent,
    BusyOverlayComponent,
    IconComponent,
    FileSizePipe,
  ],
  templateUrl: './image-convert.component.html',
  styleUrl: './image-convert.component.scss',
})
export class ImageConvertComponent extends ToolBase {
  readonly toolIdInput = input.required<string>({ alias: 'toolId' });
  readonly preset = input.required<ImagePreset>();

  get toolId(): string {
    return this.toolIdInput();
  }

  protected readonly entries = signal<Entry[]>([]);
  protected readonly target = signal<ImageMime>('image/png');
  protected readonly quality = signal(0.85);
  protected readonly maxDimension = signal(0);
  protected readonly scale = signal(2);
  protected readonly background = signal('#ffffff');
  protected readonly keepTransparency = signal(true);
  protected readonly unsupported = signal<string[]>([]);

  protected readonly config = computed(() => PRESETS[this.preset()]);
  protected readonly isSvg = computed(() => this.preset() === 'svg-to-png');
  protected readonly isLossy = computed(
    () => this.target() === 'image/jpeg' || this.target() === 'image/webp' || this.target() === 'image/avif',
  );
  protected readonly needsBackground = computed(
    () => this.target() === 'image/jpeg' || !this.keepTransparency(),
  );

  protected readonly totalIn = computed(() =>
    this.entries().reduce((sum, entry) => sum + entry.file.size, 0),
  );
  protected readonly totalOut = computed(() =>
    this.entries().reduce((sum, entry) => sum + (entry.outputSize ?? 0), 0),
  );

  protected readonly formats: readonly { value: ImageMime; label: string }[] = [
    { value: 'image/png', label: 'PNG — lossless' },
    { value: 'image/jpeg', label: 'JPEG — small, no transparency' },
    { value: 'image/webp', label: 'WebP — smallest, transparent' },
    { value: 'image/avif', label: 'AVIF — newest, best ratio' },
  ];

  constructor() {
    super();
    this.acceptHandoff();
    // The default target comes from the preset, then never changes on its own.
    queueMicrotask(() => this.target.set(this.config().target));
    void this.checkSupport();
  }

  private async checkSupport(): Promise<void> {
    const missing: string[] = [];
    for (const format of ['image/webp', 'image/avif'] as ImageMime[]) {
      if (!(await supportsFormat(format))) missing.push(format.replace('image/', '').toUpperCase());
    }
    this.unsupported.set(missing);
    if (missing.includes(this.target().replace('image/', '').toUpperCase())) {
      this.target.set('image/png');
    }
  }

  protected override afterFiles(files: File[]): void {
    const additions = files.map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      url: URL.createObjectURL(file),
      width: 0,
      height: 0,
      outputSize: null,
    }));
    if (!additions.length) return;

    this.entries.update((list) => [...list, ...additions]);
    for (const entry of additions) void this.measure(entry);
  }

  private async measure(entry: Entry): Promise<void> {
    try {
      const info = await inspectImage(entry.file);
      this.entries.update((list) =>
        list.map((item) =>
          item.id === entry.id ? { ...item, width: info.width, height: info.height } : item,
        ),
      );
    } catch {
      /* dimensions are informational only */
    }
  }

  protected remove(id: string): void {
    this.entries.update((list) => {
      const target = list.find((entry) => entry.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return list.filter((entry) => entry.id !== id);
    });
  }

  protected setTarget(event: Event): void {
    this.target.set((event.target as HTMLSelectElement).value as ImageMime);
  }
  protected setQuality(event: Event): void {
    this.quality.set(Number((event.target as HTMLInputElement).value));
  }
  protected setMaxDimension(event: Event): void {
    this.maxDimension.set(Number((event.target as HTMLInputElement).value));
  }
  protected setScale(event: Event): void {
    this.scale.set(Number((event.target as HTMLInputElement).value));
  }
  protected setBackground(event: Event): void {
    this.background.set((event.target as HTMLInputElement).value);
  }
  protected toggleTransparency(event: Event): void {
    this.keepTransparency.set((event.target as HTMLInputElement).checked);
  }

  protected async convert(): Promise<void> {
    const entries = this.entries();
    if (!entries.length) return;

    const mime = this.target();
    const extension = extensionForMime(mime);

    const outputs = await this.run('Converting images…', async () => {
      const produced = [];
      for (const [index, entry] of entries.entries()) {
        let blob: Blob;

        if (extensionOf(entry.file.name) === '.svg') {
          // SVG needs the markup path so it rasterises at the chosen scale.
          const svg = await readAsText(entry.file);
          blob = await svgToRaster(svg, {
            scale: this.scale(),
            mime,
            background: this.needsBackground() ? this.background() : undefined,
          });
        } else {
          blob = await encodeImage(entry.file, {
            mime,
            quality: this.isLossy() ? this.quality() : undefined,
            maxDimension: this.maxDimension() || undefined,
            background: this.needsBackground() ? this.background() : undefined,
          });
        }

        // Some browsers silently fall back to PNG; name the file honestly.
        const actualExtension = blob.type === mime ? extension : extensionForMime(blob.type);
        if (blob.type !== mime && index === 0) {
          this.toast.warning(
            `This browser cannot encode ${mime.replace('image/', '').toUpperCase()}`,
            `Files were saved as ${blob.type.replace('image/', '').toUpperCase()} instead.`,
          );
        }

        const size = blob.size;
        this.entries.update((list) =>
          list.map((item) => (item.id === entry.id ? { ...item, outputSize: size } : item)),
        );

        produced.push(this.output(`${baseNameOf(entry.file.name)}${actualExtension}`, blob));
        this.onProgress(index + 1, entries.length);
      }
      return produced;
    });

    if (outputs) this.setOutputs(outputs);
  }

  protected startOver(): void {
    for (const entry of this.entries()) URL.revokeObjectURL(entry.url);
    this.entries.set([]);
    this.reset();
  }
}
