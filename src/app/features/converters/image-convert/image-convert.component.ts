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
  prepareForCanvas,
  supportsFormat,
  svgToRaster,
  type ImageMime,
} from '../../../core/engines/image.engine';
import { baseNameOf, extensionOf, readAsText } from '../../../core/utils/file.util';

export type ImagePreset =
  | 'any'
  | 'svg-to-png'
  | 'png-to-webp'
  | 'jpg-to-png'
  | 'webp-to-jpg'
  | 'webp-to-png'
  | 'heic-to-jpg'
  | 'resize';

/** How the output dimensions are decided, for the resize preset. */
export type ResizeMode = 'none' | 'exact' | 'percent' | 'longest';

interface Entry {
  readonly id: string;
  /** The file as dropped — its name and size are what the visitor recognises. */
  readonly file: File;
  /**
   * The same image in something a canvas can draw. Identical to `file` for
   * every format the browser decodes natively; a decoded PNG for HEIC, so the
   * three-megabyte decoder runs once per file rather than once per preview
   * and again per conversion.
   */
  readonly source: Blob;
  readonly url: string;
  width: number;
  height: number;
  outputSize: number | null;
}

const PHOTO_INPUTS = ['.png', '.jpg', '.jpeg', '.webp', '.avif', '.bmp', '.gif', '.heic', '.heif'];

const PRESETS: Record<
  ImagePreset,
  { accepts: string[]; target: ImageMime | 'auto'; title: string; icon: string }
> = {
  any: {
    accepts: PHOTO_INPUTS,
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
  'webp-to-jpg': {
    accepts: ['.webp'],
    target: 'image/jpeg',
    title: 'Drop WebP images',
    icon: 'image',
  },
  'webp-to-png': {
    accepts: ['.webp'],
    target: 'image/png',
    title: 'Drop WebP images',
    icon: 'image',
  },
  'heic-to-jpg': {
    accepts: ['.heic', '.heif'],
    target: 'image/jpeg',
    title: 'Drop HEIC photos from your iPhone',
    icon: 'image',
  },
  resize: {
    accepts: PHOTO_INPUTS,
    // Resizing is not a conversion, so the format is left alone by default.
    target: 'auto',
    title: 'Drop images to resize',
    icon: 'maximize',
  },
};

/**
 * Batch image conversion using the browser's own encoders.
 *
 * Backs eight catalog entries; the preset chooses the accepted inputs, the
 * default target and which controls are worth showing. Everything else is the
 * same pipeline, because it is the same job.
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
  protected readonly target = signal<ImageMime | 'auto'>('image/png');
  protected readonly quality = signal(0.85);
  protected readonly maxDimension = signal(0);
  protected readonly scale = signal(2);
  protected readonly background = signal('#ffffff');
  protected readonly keepTransparency = signal(true);
  protected readonly unsupported = signal<string[]>([]);

  /* --- resize controls, only shown by the resize preset --- */
  protected readonly resizeMode = signal<ResizeMode>('exact');
  protected readonly outWidth = signal(1280);
  protected readonly outHeight = signal(720);
  protected readonly scalePercent = signal(50);
  protected readonly lockAspect = signal(true);

  protected readonly config = computed(() => PRESETS[this.preset()]);
  protected readonly isSvg = computed(() => this.preset() === 'svg-to-png');
  protected readonly isResize = computed(() => this.preset() === 'resize');
  protected readonly isHeic = computed(() => this.preset() === 'heic-to-jpg');
  protected readonly keepsFormat = computed(() => this.target() === 'auto');
  protected readonly isLossy = computed(() => {
    const mime = this.target();
    if (mime === 'auto') return true;
    return mime === 'image/jpeg' || mime === 'image/webp' || mime === 'image/avif';
  });
  protected readonly needsBackground = computed(
    () => this.target() === 'image/jpeg' || (!this.keepsFormat() && !this.keepTransparency()),
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
    const current = this.target();
    if (current !== 'auto' && missing.includes(current.replace('image/', '').toUpperCase())) {
      this.target.set('image/png');
    }
  }

  protected override afterFiles(files: File[]): void {
    if (!files.length) return;
    void this.ingest(files);
  }

  /**
   * Turns dropped files into entries, decoding anything the canvas cannot read
   * first. HEIC is the only format that needs it, and it is slow enough that
   * the busy overlay is worth showing.
   */
  private async ingest(files: File[]): Promise<void> {
    const needsDecoding = this.isHeic() || this.preset() === 'any' || this.isResize();

    await this.run(needsDecoding ? 'Reading images…' : 'Reading…', async () => {
      const additions: Entry[] = [];
      for (const [index, file] of files.entries()) {
        const source = await prepareForCanvas(file);
        additions.push({
          id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
          file,
          source,
          url: URL.createObjectURL(source),
          width: 0,
          height: 0,
          outputSize: null,
        });
        this.onProgress(index + 1, files.length);
      }

      this.entries.update((list) => [...list, ...additions]);
      for (const entry of additions) await this.measure(entry);
    });
  }

  private async measure(entry: Entry): Promise<void> {
    try {
      const info = await inspectImage(entry.source);
      this.entries.update((list) =>
        list.map((item) =>
          item.id === entry.id ? { ...item, width: info.width, height: info.height } : item,
        ),
      );
      // Seed the resize boxes from the first image, so the numbers on screen
      // describe something real rather than an arbitrary default.
      if (this.isResize() && this.entries()[0]?.id === entry.id && info.width) {
        this.outWidth.set(info.width);
        this.outHeight.set(info.height);
      }
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
    this.target.set((event.target as HTMLSelectElement).value as ImageMime | 'auto');
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

  protected setResizeMode(event: Event): void {
    this.resizeMode.set((event.target as HTMLSelectElement).value as ResizeMode);
  }
  protected setPercent(event: Event): void {
    this.scalePercent.set(clampNumber(Number((event.target as HTMLInputElement).value), 1, 400));
  }
  protected toggleLockAspect(event: Event): void {
    this.lockAspect.set((event.target as HTMLInputElement).checked);
  }

  /** Typing a width recomputes the height while the ratio is locked. */
  protected setOutWidth(event: Event): void {
    const width = clampNumber(Number((event.target as HTMLInputElement).value), 1, 20000);
    this.outWidth.set(width);
    const first = this.entries()[0];
    if (this.lockAspect() && first?.width && first?.height) {
      this.outHeight.set(Math.max(1, Math.round((first.height / first.width) * width)));
    }
  }

  protected setOutHeight(event: Event): void {
    const height = clampNumber(Number((event.target as HTMLInputElement).value), 1, 20000);
    this.outHeight.set(height);
    const first = this.entries()[0];
    if (this.lockAspect() && first?.width && first?.height) {
      this.outWidth.set(Math.max(1, Math.round((first.width / first.height) * height)));
    }
  }

  /** The size options handed to the encoder for one entry. */
  private sizeFor(entry: Entry): { width?: number; height?: number; maxDimension?: number } {
    if (!this.isResize()) {
      return { maxDimension: this.maxDimension() || undefined };
    }
    switch (this.resizeMode()) {
      case 'exact':
        return this.lockAspect()
          ? { width: this.outWidth() }
          : { width: this.outWidth(), height: this.outHeight() };
      case 'percent': {
        if (!entry.width) return {};
        const factor = this.scalePercent() / 100;
        return { width: Math.max(1, Math.round(entry.width * factor)) };
      }
      case 'longest':
        return { maxDimension: this.maxDimension() || undefined };
      default:
        return {};
    }
  }

  /** The format one entry is written in, resolving `auto` against its input. */
  private mimeFor(entry: Entry): ImageMime {
    const chosen = this.target();
    if (chosen !== 'auto') return chosen;
    const type = entry.source.type || entry.file.type;
    if (type === 'image/jpeg' || type === 'image/webp' || type === 'image/avif') return type;
    return 'image/png';
  }

  protected async convert(): Promise<void> {
    const entries = this.entries();
    if (!entries.length) return;

    const outputs = await this.run(
      this.isResize() ? 'Resizing images…' : 'Converting images…',
      async () => {
        const produced = [];
        let warned = false;

        for (const [index, entry] of entries.entries()) {
          const mime = this.mimeFor(entry);
          const lossy =
            mime === 'image/jpeg' || mime === 'image/webp' || mime === 'image/avif';
          const background =
            mime === 'image/jpeg' || this.needsBackground() ? this.background() : undefined;

          let blob: Blob;
          if (extensionOf(entry.file.name) === '.svg') {
            // SVG needs the markup path so it rasterises at the chosen scale.
            const svg = await readAsText(entry.file);
            blob = await svgToRaster(svg, { scale: this.scale(), mime, background });
          } else {
            blob = await encodeImage(entry.source, {
              mime,
              quality: lossy ? this.quality() : undefined,
              background,
              ...this.sizeFor(entry),
            });
          }

          // Some browsers silently fall back to PNG; name the file honestly.
          const actualExtension =
            blob.type === mime ? extensionForMime(mime) : extensionForMime(blob.type);
          if (blob.type !== mime && !warned) {
            warned = true;
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
      },
    );

    if (outputs) this.setOutputs(outputs);
  }

  protected startOver(): void {
    for (const entry of this.entries()) URL.revokeObjectURL(entry.url);
    this.entries.set([]);
    this.reset();
  }
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}
