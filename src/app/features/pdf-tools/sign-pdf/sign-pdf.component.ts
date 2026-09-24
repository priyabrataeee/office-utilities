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
import { ToolBase } from '../../../shared/tool-base';
import { loadPdf, loadPdfLib, toBlob } from '../../../core/engines/pdf.engine';
import { closePdf, openPdf, renderPage } from '../../../core/engines/pdfjs.engine';
import {
  blobToDataUrl,
  dataUrlToBytes,
  prepareForCanvas,
} from '../../../core/engines/image.engine';
import { clamp, withSuffix } from '../../../core/utils/file.util';

export type SignatureMode = 'draw' | 'type' | 'upload';

interface Placement {
  x: number;
  y: number;
  width: number;
}

const HANDWRITING = '"Segoe Script", "Brush Script MT", "Snell Roundhand", cursive';

@Component({
  selector: 'app-sign-pdf',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    ResultPanelComponent,
    BusyOverlayComponent,
    IconComponent,
  ],
  templateUrl: './sign-pdf.component.html',
  styleUrl: './sign-pdf.component.scss',
})
export class SignPdfComponent extends ToolBase {
  readonly toolId = 'sign-pdf';

  private readonly pad = viewChild<ElementRef<HTMLCanvasElement>>('pad');
  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');

  protected readonly pageCount = signal(0);
  protected readonly pageIndex = signal(1);
  protected readonly pageImage = signal<string | null>(null);
  protected readonly rendering = signal(false);
  protected readonly pageAspect = signal(1 / Math.SQRT2);

  protected readonly mode = signal<SignatureMode>('draw');
  protected readonly typedName = signal('');
  protected readonly inkColor = signal('#11224b');
  protected readonly signature = signal<string | null>(null);
  protected readonly signatureAspect = signal(3);
  protected readonly hasInk = signal(false);

  protected readonly placement = signal<Placement>({ x: 0.58, y: 0.78, width: 0.28 });
  protected readonly includeDate = signal(false);
  protected readonly dateText = signal(today());

  protected readonly ready = computed(() => this.hasFile() && !!this.signature());

  protected readonly boxStyle = computed(() => {
    const place = this.placement();
    return {
      left: `${place.x * 100}%`,
      top: `${place.y * 100}%`,
      width: `${place.width * 100}%`,
    };
  });

  private drawing = false;
  private dragOffset: { x: number; y: number } | null = null;

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override afterFiles(files: File[]): void {
    if (!files[0]) return;
    this.pageIndex.set(1);
    void this.open(files[0]);
  }

  private async open(file: File): Promise<void> {
    const opened = await this.run('Opening the PDF…', async () => {
      const doc = await openPdf(await file.arrayBuffer());
      try {
        return doc.numPages;
      } finally {
        await closePdf(doc);
      }
    });
    if (!opened) return;
    this.pageCount.set(opened);
    await this.renderCurrent(file, this.pageIndex());
  }

  private async renderCurrent(file: File, pageNumber: number): Promise<void> {
    if (this.rendering()) return;
    this.rendering.set(true);
    try {
      const doc = await openPdf(await file.arrayBuffer());
      try {
        const page = await doc.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1, rotation: page.rotate });
        this.pageAspect.set(viewport.width / viewport.height);
        page.cleanup();

        const canvas = await renderPage(doc, pageNumber, {
          scale: 1.5,
          background: '#ffffff',
          maxDimension: 1600,
        });
        this.pageImage.set(canvas.toDataURL('image/jpeg', 0.85));
        canvas.width = 0;
        canvas.height = 0;
      } finally {
        await closePdf(doc);
      }
    } catch (error) {
      this.pageImage.set(null);
      this.toast.warning(
        'That page could not be drawn',
        'You can still place a signature, but you will be doing it blind.',
      );
      console.warn('sign-pdf: page preview failed', error);
    } finally {
      this.rendering.set(false);
    }
  }

  protected goToPage(delta: number): void {
    const next = clamp(this.pageIndex() + delta, 1, this.pageCount());
    if (next === this.pageIndex()) return;
    this.pageIndex.set(next);
    const file = this.primaryFile();
    if (file) void this.renderCurrent(file, next);
  }

  protected setMode(mode: SignatureMode): void {
    this.mode.set(mode);
    this.signature.set(null);
    this.hasInk.set(false);
    if (mode === 'draw') queueMicrotask(() => this.clearPad());
  }

  private context(): CanvasRenderingContext2D | null {
    const canvas = this.pad()?.nativeElement;
    if (!canvas) return null;
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(canvas.clientWidth * ratio);
    const height = Math.round(canvas.clientHeight * ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = 2.4 * ratio;
    context.strokeStyle = this.inkColor();
    return context;
  }

  protected startStroke(event: PointerEvent): void {
    const canvas = this.pad()?.nativeElement;
    const context = this.context();
    if (!canvas || !context) return;
    canvas.setPointerCapture(event.pointerId);
    this.drawing = true;
    const point = this.padPoint(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.lineTo(point.x + 0.01, point.y);
    context.stroke();
    this.hasInk.set(true);
  }

  protected continueStroke(event: PointerEvent): void {
    if (!this.drawing) return;
    const context = this.context();
    if (!context) return;
    const point = this.padPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  protected endStroke(): void {
    if (!this.drawing) return;
    this.drawing = false;
    this.commitPad();
  }

  private padPoint(event: PointerEvent): { x: number; y: number } {
    const canvas = this.pad()!.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const ratio = canvas.width / rect.width;
    return { x: (event.clientX - rect.left) * ratio, y: (event.clientY - rect.top) * ratio };
  }

  protected clearPad(): void {
    const canvas = this.pad()?.nativeElement;
    const context = this.context();
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    this.hasInk.set(false);
    this.signature.set(null);
  }

  private commitPad(): void {
    const canvas = this.pad()?.nativeElement;
    if (!canvas) return;
    const trimmed = trimToInk(canvas);
    if (!trimmed) {
      this.signature.set(null);
      return;
    }
    this.signature.set(trimmed.dataUrl);
    this.signatureAspect.set(trimmed.width / trimmed.height);
  }

  protected setTypedName(event: Event): void {
    this.typedName.set((event.target as HTMLInputElement).value);
    this.renderTyped();
  }

  protected setInk(event: Event): void {
    this.inkColor.set((event.target as HTMLInputElement).value);
    if (this.mode() === 'type') this.renderTyped();
  }

  private renderTyped(): void {
    const name = this.typedName().trim();
    if (!name) {
      this.signature.set(null);
      return;
    }

    const size = 120;
    const canvas = document.createElement('canvas');
    const measure = canvas.getContext('2d');
    if (!measure) return;

    measure.font = `${size}px ${HANDWRITING}`;
    const width = Math.ceil(measure.measureText(name).width) + size;
    canvas.width = Math.max(width, size);
    canvas.height = Math.round(size * 2);

    const context = canvas.getContext('2d');
    if (!context) return;
    context.font = `${size}px ${HANDWRITING}`;
    context.fillStyle = this.inkColor();
    context.textBaseline = 'middle';
    context.fillText(name, size / 2, canvas.height / 2);

    const trimmed = trimToInk(canvas);
    if (!trimmed) return;
    this.signature.set(trimmed.dataUrl);
    this.signatureAspect.set(trimmed.width / trimmed.height);
  }

  protected async onSignatureImage(files: File[]): Promise<void> {
    const file = files[0];
    if (!file) return;
    await this.run('Reading the signature…', async () => {
      const source = await prepareForCanvas(file);
      const dataUrl = await blobToDataUrl(source);
      const image = await loadImageElement(dataUrl);
      this.signature.set(dataUrl);
      this.signatureAspect.set(image.naturalWidth / image.naturalHeight || 3);
    });
  }

  protected setWidth(event: Event): void {
    const width = Number((event.target as HTMLInputElement).value) / 100;
    this.placement.update((place) => ({ ...place, width }));
  }

  protected toggleDate(event: Event): void {
    this.includeDate.set((event.target as HTMLInputElement).checked);
  }

  protected setDate(event: Event): void {
    this.dateText.set((event.target as HTMLInputElement).value);
  }

  protected placeAt(event: PointerEvent): void {
    const host = this.stage()?.nativeElement;
    if (!host || !this.signature()) return;
    const rect = host.getBoundingClientRect();
    const place = this.placement();
    const boxHeight = (place.width / this.signatureAspect()) * (rect.width / rect.height);
    this.placement.set({
      ...place,
      x: clampFraction((event.clientX - rect.left) / rect.width - place.width / 2, place.width),
      y: clampFraction((event.clientY - rect.top) / rect.height - boxHeight / 2, boxHeight),
    });
  }

  protected startDrag(event: PointerEvent): void {
    const host = this.stage()?.nativeElement;
    if (!host) return;
    event.stopPropagation();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    const rect = host.getBoundingClientRect();
    const place = this.placement();
    this.dragOffset = {
      x: (event.clientX - rect.left) / rect.width - place.x,
      y: (event.clientY - rect.top) / rect.height - place.y,
    };
  }

  protected onDrag(event: PointerEvent): void {
    const host = this.stage()?.nativeElement;
    const offset = this.dragOffset;
    if (!host || !offset) return;
    const rect = host.getBoundingClientRect();
    const place = this.placement();
    const boxHeight = (place.width / this.signatureAspect()) * (rect.width / rect.height);
    this.placement.set({
      ...place,
      x: clampFraction((event.clientX - rect.left) / rect.width - offset.x, place.width),
      y: clampFraction((event.clientY - rect.top) / rect.height - offset.y, boxHeight),
    });
  }

  protected endDrag(): void {
    this.dragOffset = null;
  }

  protected async apply(): Promise<void> {
    const file = this.primaryFile();
    const signature = this.signature();
    if (!file || !signature) return;

    const blob = await this.run('Signing…', async () => {
      const lib = await loadPdfLib();
      const pdf = await loadPdf(await file.arrayBuffer());
      const page = pdf.getPages()[this.pageIndex() - 1];
      if (!page) throw new Error('That page is no longer in the document.');

      const bytes = dataUrlToBytes(signature);
      const image = signature.startsWith('data:image/jpeg')
        ? await pdf.embedJpg(bytes)
        : await pdf.embedPng(bytes);

      const { width: mediaWidth, height: mediaHeight } = page.getSize();
      const rotation = ((page.getRotation().angle % 360) + 360) % 360;
      const quarter = rotation === 90 || rotation === 270;

      const visibleWidth = quarter ? mediaHeight : mediaWidth;
      const visibleHeight = quarter ? mediaWidth : mediaHeight;

      const place = this.placement();
      const boxWidth = place.width * visibleWidth;
      const boxHeight = boxWidth / this.signatureAspect();
      const left = place.x * visibleWidth;
      const top = place.y * visibleHeight;
      const anchor = toUserSpace(
        left,
        top + boxHeight,
        rotation,
        mediaWidth,
        mediaHeight,
      );

      page.drawImage(image, {
        x: anchor.x,
        y: anchor.y,
        width: boxWidth,
        height: boxHeight,
        rotate: lib.degrees(rotation),
      });

      if (this.includeDate() && this.dateText().trim()) {
        const font = await pdf.embedFont(lib.StandardFonts.Helvetica);
        const size = Math.max(7, Math.min(13, boxHeight * 0.28));
        const gap = size * 0.9;
        const dateAnchor = toUserSpace(
          left,
          top + boxHeight + gap + size,
          rotation,
          mediaWidth,
          mediaHeight,
        );
        page.drawText(this.dateText().trim(), {
          x: dateAnchor.x,
          y: dateAnchor.y,
          size,
          font,
          color: lib.rgb(0.16, 0.18, 0.24),
          rotate: lib.degrees(rotation),
        });
      }

      return toBlob(pdf);
    });

    if (blob) this.setOutputs([this.output(withSuffix(file.name, '-signed'), blob)]);
  }

  protected startOver(): void {
    this.pageCount.set(0);
    this.pageIndex.set(1);
    this.pageImage.set(null);
    this.signature.set(null);
    this.typedName.set('');
    this.hasInk.set(false);
    this.reset();
  }
}

function toUserSpace(
  vx: number,
  vy: number,
  rotation: number,
  width: number,
  height: number,
): { x: number; y: number } {
  switch (rotation) {
    case 90:
      return { x: vy, y: vx };
    case 180:
      return { x: width - vx, y: vy };
    case 270:
      return { x: width - vy, y: height - vx };
    default:
      return { x: vx, y: height - vy };
  }
}

function trimToInk(
  canvas: HTMLCanvasElement,
): { dataUrl: string; width: number; height: number } | null {
  const context = canvas.getContext('2d');
  if (!context || !canvas.width || !canvas.height) return null;

  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (data[(y * canvas.width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;

  const pad = Math.round(Math.max(canvas.width, canvas.height) * 0.01);
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(canvas.width - 1, maxX + pad);
  maxY = Math.min(canvas.height - 1, maxY + pad);

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  out.getContext('2d')?.drawImage(canvas, minX, minY, width, height, 0, 0, width, height);

  return { dataUrl: out.toDataURL('image/png'), width, height };
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('That signature image could not be read.'));
    image.src = src;
  });
}

function clampFraction(value: number, size: number): number {
  return Math.min(Math.max(value, 0), Math.max(0, 1 - size));
}

function today(): string {
  return new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
