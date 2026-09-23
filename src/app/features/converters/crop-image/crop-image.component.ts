import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
  viewChild,
  type ElementRef,
} from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { FileSizePipe } from '../../../shared/pipes/file-size.pipe';
import { ToolBase } from '../../../shared/tool-base';
import {
  canvasToBlob,
  createCanvas,
  extensionForMime,
  prepareForCanvas,
  type ImageMime,
} from '../../../core/engines/image.engine';
import { baseNameOf } from '../../../core/utils/file.util';

/** The crop, in the source image's own pixels. */
interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type Corner = 'nw' | 'ne' | 'sw' | 'se';

interface RatioOption {
  readonly label: string;
  /** Width ÷ height, or 0 for free-form. */
  readonly value: number;
}

const RATIOS: readonly RatioOption[] = [
  { label: 'Free', value: 0 },
  { label: 'Square 1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
  { label: '16:9', value: 16 / 9 },
  { label: 'Portrait 3:4', value: 3 / 4 },
  { label: 'Portrait 9:16', value: 9 / 16 },
];

const MIN_SIZE = 16;

@Component({
  selector: 'app-crop-image',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    ResultPanelComponent,
    BusyOverlayComponent,
    IconComponent,
    FileSizePipe,
  ],
  templateUrl: './crop-image.component.html',
  styleUrl: './crop-image.component.scss',
})
export class CropImageComponent extends ToolBase {
  readonly toolId = 'crop-image';

  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');

  protected readonly ratios = RATIOS;

  protected readonly imageUrl = signal<string | null>(null);
  protected readonly natural = signal<{ width: number; height: number } | null>(null);
  protected readonly crop = signal<Rect>({ x: 0, y: 0, width: 0, height: 0 });
  protected readonly ratio = signal(0);
  protected readonly format = signal<ImageMime>('image/png');
  protected readonly quality = signal(0.9);
  protected readonly background = signal('#ffffff');

  /** The canvas-ready source, which is a decoded PNG when a HEIC was dropped. */
  private source: Blob | null = null;
  private drag:
    | { kind: 'move'; startX: number; startY: number; origin: Rect }
    | { kind: 'resize'; corner: Corner; origin: Rect }
    | null = null;

  protected readonly isLossy = computed(
    () => this.format() === 'image/jpeg' || this.format() === 'image/webp',
  );

  protected readonly ready = computed(
    () => !!this.natural() && this.crop().width >= MIN_SIZE && this.crop().height >= MIN_SIZE,
  );

  /** Percentages, so the overlay tracks the preview at whatever size it is. */
  protected readonly boxStyle = computed(() => {
    const size = this.natural();
    const rect = this.crop();
    if (!size) return { left: '0%', top: '0%', width: '0%', height: '0%' };
    return {
      left: `${(rect.x / size.width) * 100}%`,
      top: `${(rect.y / size.height) * 100}%`,
      width: `${(rect.width / size.width) * 100}%`,
      height: `${(rect.height / size.height) * 100}%`,
    };
  });

  protected readonly formats: readonly { value: ImageMime; label: string }[] = [
    { value: 'image/png', label: 'PNG — lossless, keeps transparency' },
    { value: 'image/jpeg', label: 'JPEG — smaller, no transparency' },
    { value: 'image/webp', label: 'WebP — smallest' },
  ];

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override afterFiles(files: File[]): void {
    const file = files[0];
    if (!file) return;
    void this.load(file);
  }

  private async load(file: File): Promise<void> {
    await this.run('Reading the image…', async () => {
      const previous = this.imageUrl();
      if (previous) URL.revokeObjectURL(previous);

      this.source = await prepareForCanvas(file);
      const url = URL.createObjectURL(this.source);
      this.imageUrl.set(url);

      const image = await loadImage(url);
      const size = { width: image.naturalWidth, height: image.naturalHeight };
      this.natural.set(size);
      this.resetCrop(size);
    });
  }

  /** Starts with a generous centred box rather than the whole image. */
  private resetCrop(size: { width: number; height: number }): void {
    const side = Math.round(Math.min(size.width, size.height) * 0.8);
    const target = this.ratio();
    const width = target ? Math.min(size.width, Math.round(side * Math.max(1, target))) : side;
    const height = target ? Math.round(width / target) : side;
    this.crop.set({
      x: Math.round((size.width - width) / 2),
      y: Math.round((size.height - height) / 2),
      width: Math.min(width, size.width),
      height: Math.min(height, size.height),
    });
  }

  protected setRatio(value: number): void {
    this.ratio.set(value);
    const size = this.natural();
    if (!size || !value) return;
    // Keep the centre, adapt the shape.
    const rect = this.crop();
    const centreX = rect.x + rect.width / 2;
    const centreY = rect.y + rect.height / 2;
    let width = rect.width;
    let height = width / value;
    if (height > size.height) {
      height = size.height;
      width = height * value;
    }
    if (width > size.width) {
      width = size.width;
      height = width / value;
    }
    this.crop.set(
      this.contain(
        {
          x: Math.round(centreX - width / 2),
          y: Math.round(centreY - height / 2),
          width: Math.round(width),
          height: Math.round(height),
        },
        size,
      ),
    );
  }

  protected setFormat(event: Event): void {
    this.format.set((event.target as HTMLSelectElement).value as ImageMime);
  }
  protected setQuality(event: Event): void {
    this.quality.set(Number((event.target as HTMLInputElement).value));
  }
  protected setBackground(event: Event): void {
    this.background.set((event.target as HTMLInputElement).value);
  }

  protected setBound(key: keyof Rect, event: Event): void {
    const size = this.natural();
    if (!size) return;
    const value = Math.round(Number((event.target as HTMLInputElement).value));
    if (!Number.isFinite(value)) return;

    const next = { ...this.crop(), [key]: Math.max(0, value) } as Rect;
    const target = this.ratio();
    if (target && key === 'width') next.height = Math.round(next.width / target);
    if (target && key === 'height') next.width = Math.round(next.height * target);

    const applied = this.contain(next, size);
    this.crop.set(applied);
    // What you typed may not be what fits — a position is constrained by the
    // box's own size, and a size by the image. Put the number that was
    // actually applied back in the field rather than leaving it showing a
    // value the crop does not have.
    (event.target as HTMLInputElement).value = String(applied[key]);
  }

  /* ------------------------------------------------------------------
     Dragging
     ------------------------------------------------------------------ */

  protected startMove(event: PointerEvent): void {
    event.stopPropagation();
    const point = this.toImage(event);
    if (!point) return;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    this.drag = { kind: 'move', startX: point.x, startY: point.y, origin: { ...this.crop() } };
  }

  protected startResize(corner: Corner, event: PointerEvent): void {
    event.stopPropagation();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    this.drag = { kind: 'resize', corner, origin: { ...this.crop() } };
  }

  protected onMove(event: PointerEvent): void {
    const drag = this.drag;
    const size = this.natural();
    const point = this.toImage(event);
    if (!drag || !size || !point) return;

    if (drag.kind === 'move') {
      this.crop.set(
        this.contain(
          {
            ...drag.origin,
            x: Math.round(drag.origin.x + (point.x - drag.startX)),
            y: Math.round(drag.origin.y + (point.y - drag.startY)),
          },
          size,
        ),
      );
      return;
    }

    // Resizing works from the corner opposite the one being dragged, which
    // stays put — the behaviour everybody expects from a crop handle.
    const origin = drag.origin;
    const anchorX = drag.corner === 'nw' || drag.corner === 'sw' ? origin.x + origin.width : origin.x;
    const anchorY = drag.corner === 'nw' || drag.corner === 'ne' ? origin.y + origin.height : origin.y;

    let width = Math.abs(point.x - anchorX);
    let height = Math.abs(point.y - anchorY);

    const target = this.ratio();
    if (target) {
      // Follow whichever axis the pointer moved further along, so the box
      // does not fight the cursor.
      if (width / target >= height) height = width / target;
      else width = height * target;
    }

    width = Math.max(MIN_SIZE, Math.round(width));
    height = Math.max(MIN_SIZE, Math.round(height));

    const x = point.x < anchorX ? anchorX - width : anchorX;
    const y = point.y < anchorY ? anchorY - height : anchorY;

    this.crop.set(this.contain({ x: Math.round(x), y: Math.round(y), width, height }, size));
  }

  protected endDrag(): void {
    this.drag = null;
  }

  /** Pointer position in the source image's own pixels. */
  private toImage(event: PointerEvent): { x: number; y: number } | null {
    const host = this.stage()?.nativeElement;
    const size = this.natural();
    if (!host || !size) return null;
    const rect = host.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: ((event.clientX - rect.left) / rect.width) * size.width,
      y: ((event.clientY - rect.top) / rect.height) * size.height,
    };
  }

  /**
   * Keeps the crop inside the image.
   *
   * With a ratio locked, the box is scaled down as a whole rather than having
   * each side clipped separately — clipping one side is what makes a 16:9 box
   * quietly stop being 16:9 the moment it touches an edge.
   */
  private contain(rect: Rect, size: { width: number; height: number }): Rect {
    let width = Math.max(MIN_SIZE, rect.width);
    let height = Math.max(MIN_SIZE, rect.height);

    const target = this.ratio();
    if (target) {
      const shrink = Math.min(1, size.width / width, size.height / height);
      width = Math.max(MIN_SIZE, Math.round(width * shrink));
      height = Math.max(MIN_SIZE, Math.round(width / target));
    }

    width = Math.min(width, size.width);
    height = Math.min(height, size.height);

    return {
      width,
      height,
      x: Math.min(Math.max(0, rect.x), size.width - width),
      y: Math.min(Math.max(0, rect.y), size.height - height),
    };
  }

  /* ------------------------------------------------------------------
     Export
     ------------------------------------------------------------------ */

  protected async cropNow(): Promise<void> {
    const file = this.primaryFile();
    const url = this.imageUrl();
    const rect = this.crop();
    if (!file || !url || !this.ready()) return;

    const blob = await this.run('Cropping…', async () => {
      const image = await loadImage(url);
      const canvas = createCanvas(rect.width, rect.height);
      const context = canvas.getContext('2d') as CanvasRenderingContext2D | null;
      if (!context) throw new Error('Canvas is unavailable in this browser.');

      if (this.format() === 'image/jpeg') {
        context.fillStyle = this.background();
        context.fillRect(0, 0, rect.width, rect.height);
      }

      // The box was tracked in source pixels all along, so the crop comes
      // from the original image rather than from the scaled preview.
      context.drawImage(
        image,
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        0,
        0,
        rect.width,
        rect.height,
      );

      return canvasToBlob(canvas, this.format(), this.isLossy() ? this.quality() : undefined);
    });

    if (!blob) return;
    const extension = extensionForMime(blob.type || this.format());
    this.setOutputs([this.output(`${baseNameOf(file.name)}-cropped${extension}`, blob)]);
  }

  protected startOver(): void {
    const url = this.imageUrl();
    if (url) URL.revokeObjectURL(url);
    this.imageUrl.set(null);
    this.natural.set(null);
    this.source = null;
    this.reset();
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('That image could not be decoded by this browser.'));
    image.src = src;
  });
}
