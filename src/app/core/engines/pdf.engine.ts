import type { PDFDocument, PDFPage } from '@cantoo/pdf-lib';
import { PAGE_SIZES, type PageSizeName } from './doc-model';

/**
 * PDF *writing* operations, built on pdf-lib.
 *
 * Reading and rendering live in `pdfjs.engine.ts`; this module is everything
 * that produces a new PDF. Pages are copied rather than re-encoded, so text
 * stays selectable and images are untouched unless a tool explicitly asks for
 * re-encoding (which only `compressPdf` does).
 */

export type PdfLib = typeof import('@cantoo/pdf-lib');

let libPromise: Promise<PdfLib> | null = null;

export function loadPdfLib(): Promise<PdfLib> {
  libPromise ??= import('@cantoo/pdf-lib');
  return libPromise;
}

export interface LoadOptions {
  readonly password?: string;
  /** Open an encrypted document without supplying the password. */
  readonly ignoreEncryption?: boolean;
}

export async function loadPdf(
  bytes: ArrayBuffer | Uint8Array,
  options: LoadOptions = {},
): Promise<PDFDocument> {
  const { PDFDocument } = await loadPdfLib();
  return PDFDocument.load(bytes as never, {
    password: options.password,
    ignoreEncryption: options.ignoreEncryption ?? false,
    updateMetadata: false,
  } as never);
}

export async function toBlob(pdf: PDFDocument): Promise<Blob> {
  const bytes = await pdf.save({ addDefaultPage: false });
  return new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
}

async function bytesOf(file: Blob): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

/* ------------------------------------------------------------------
   Merge / split / page operations
   ------------------------------------------------------------------ */

export interface MergeSource {
  readonly file: Blob;
  readonly name: string;
  /** Zero-based page indices to take. Omit for the whole document. */
  readonly pages?: readonly number[];
  readonly password?: string;
}

export async function mergePdfs(
  sources: readonly MergeSource[],
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> {
  const { PDFDocument } = await loadPdfLib();
  const merged = await PDFDocument.create();

  for (const [index, source] of sources.entries()) {
    const donor = await loadPdf(await bytesOf(source.file), {
      password: source.password,
      ignoreEncryption: true,
    });
    const indices = source.pages ? [...source.pages] : donor.getPageIndices();
    const copied = await merged.copyPages(donor, indices);
    for (const page of copied) merged.addPage(page);
    onProgress?.(index + 1, sources.length);
  }

  merged.setProducer('Office Utilities');
  merged.setCreationDate(new Date());
  return toBlob(merged);
}

/** Builds a new PDF from a subset of pages, in the order supplied. */
export async function extractPages(
  file: Blob,
  indices: readonly number[],
  password?: string,
): Promise<Blob> {
  const { PDFDocument } = await loadPdfLib();
  const source = await loadPdf(await bytesOf(file), { password, ignoreEncryption: true });
  const output = await PDFDocument.create();
  const valid = indices.filter((i) => i >= 0 && i < source.getPageCount());
  const copied = await output.copyPages(source, [...valid]);
  for (const page of copied) output.addPage(page);
  return toBlob(output);
}

export interface SplitPart {
  readonly name: string;
  readonly indices: readonly number[];
}

/** Splits one PDF into several, according to the supplied groupings. */
export async function splitPdf(
  file: Blob,
  parts: readonly SplitPart[],
  password?: string,
  onProgress?: (done: number, total: number) => void,
): Promise<{ name: string; blob: Blob }[]> {
  const { PDFDocument } = await loadPdfLib();
  const bytes = await bytesOf(file);
  const source = await loadPdf(bytes, { password, ignoreEncryption: true });
  const out: { name: string; blob: Blob }[] = [];

  for (const [index, part] of parts.entries()) {
    const output = await PDFDocument.create();
    const copied = await output.copyPages(source, [...part.indices]);
    for (const page of copied) output.addPage(page);
    out.push({ name: part.name, blob: await toBlob(output) });
    onProgress?.(index + 1, parts.length);
  }

  return out;
}

/** Groups page indices into split parts of a fixed size. */
export function chunkPages(pageCount: number, chunkSize: number): number[][] {
  const chunks: number[][] = [];
  for (let start = 0; start < pageCount; start += chunkSize) {
    chunks.push(
      Array.from({ length: Math.min(chunkSize, pageCount - start) }, (_, i) => start + i),
    );
  }
  return chunks;
}

/** Splits at the given zero-based page indices (each starts a new part). */
export function splitAt(pageCount: number, breakpoints: readonly number[]): number[][] {
  const sorted = [...new Set(breakpoints)].filter((p) => p > 0 && p < pageCount).sort((a, b) => a - b);
  const parts: number[][] = [];
  let start = 0;
  for (const breakpoint of [...sorted, pageCount]) {
    parts.push(Array.from({ length: breakpoint - start }, (_, i) => start + i));
    start = breakpoint;
  }
  return parts.filter((part) => part.length > 0);
}

export interface PageEdit {
  /** Index in the *source* document. */
  readonly sourceIndex: number;
  /** Extra rotation in degrees, added to whatever the page already has. */
  readonly rotate?: number;
}

/**
 * Applies a full page plan — order, rotation, deletion and duplication — in a
 * single rebuild. The page organiser sends its whole state through here.
 */
export async function applyPagePlan(
  file: Blob,
  plan: readonly PageEdit[],
  password?: string,
): Promise<Blob> {
  const { PDFDocument, degrees } = await loadPdfLib();
  const source = await loadPdf(await bytesOf(file), { password, ignoreEncryption: true });
  const output = await PDFDocument.create();

  const copied = await output.copyPages(
    source,
    plan.map((entry) => entry.sourceIndex),
  );

  copied.forEach((page: PDFPage, index: number) => {
    const rotation = plan[index].rotate ?? 0;
    if (rotation) {
      const current = page.getRotation().angle;
      page.setRotation(degrees(normaliseAngle(current + rotation)));
    }
    output.addPage(page);
  });

  return toBlob(output);
}

function normaliseAngle(angle: number): number {
  return ((Math.round(angle / 90) * 90) % 360 + 360) % 360;
}

/* ------------------------------------------------------------------
   Images to PDF
   ------------------------------------------------------------------ */

export interface ImagesToPdfOptions {
  readonly pageSize: PageSizeName | 'fit';
  readonly orientation: 'portrait' | 'landscape' | 'auto';
  readonly margin: number;
  readonly background?: string;
}

export async function imagesToPdf(
  images: readonly Blob[],
  options: ImagesToPdfOptions,
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> {
  const { PDFDocument, rgb } = await loadPdfLib();
  const { encodeImage } = await import('./image.engine');
  const pdf = await PDFDocument.create();

  for (const [index, source] of images.entries()) {
    // pdf-lib embeds PNG and JPEG only; anything else is re-encoded locally.
    const isJpeg = /jpe?g/i.test(source.type);
    const isPng = /png/i.test(source.type);
    const usable = isJpeg || isPng ? source : await encodeImage(source, { mime: 'image/png' });

    const bytes = new Uint8Array(await usable.arrayBuffer());
    const embedded = /jpe?g/i.test(usable.type)
      ? await pdf.embedJpg(bytes)
      : await pdf.embedPng(bytes);

    const imageWidth = embedded.width;
    const imageHeight = embedded.height;
    const margin = options.margin;

    let pageWidth: number;
    let pageHeight: number;

    if (options.pageSize === 'fit') {
      pageWidth = imageWidth + margin * 2;
      pageHeight = imageHeight + margin * 2;
    } else {
      const [w, h] = PAGE_SIZES[options.pageSize];
      const landscape =
        options.orientation === 'landscape' ||
        (options.orientation === 'auto' && imageWidth > imageHeight);
      pageWidth = landscape ? h : w;
      pageHeight = landscape ? w : h;
    }

    const page = pdf.addPage([pageWidth, pageHeight]);
    if (options.background) {
      page.drawRectangle({
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
        color: hexToRgb(rgb, options.background),
      });
    }

    const available = { width: pageWidth - margin * 2, height: pageHeight - margin * 2 };
    const scale = Math.min(available.width / imageWidth, available.height / imageHeight, 1);
    const drawWidth = imageWidth * scale;
    const drawHeight = imageHeight * scale;

    page.drawImage(embedded, {
      x: (pageWidth - drawWidth) / 2,
      y: (pageHeight - drawHeight) / 2,
      width: drawWidth,
      height: drawHeight,
    });

    onProgress?.(index + 1, images.length);
  }

  return toBlob(pdf);
}

function hexToRgb(rgb: PdfLib['rgb'], hex: string) {
  const value = hex.replace('#', '').padEnd(6, '0').slice(0, 6);
  const int = Number.parseInt(value, 16);
  if (Number.isNaN(int)) return rgb(1, 1, 1);
  return rgb(((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255);
}

/* ------------------------------------------------------------------
   Watermarks
   ------------------------------------------------------------------ */

export interface TextWatermarkOptions {
  readonly kind: 'text';
  readonly text: string;
  readonly fontSize: number;
  readonly opacity: number;
  readonly rotation: number;
  readonly color: string;
  readonly position: WatermarkPosition;
  readonly tile: boolean;
  readonly pages?: readonly number[];
}

export interface ImageWatermarkOptions {
  readonly kind: 'image';
  readonly image: Blob;
  readonly scale: number;
  readonly opacity: number;
  readonly rotation: number;
  readonly position: WatermarkPosition;
  readonly tile: boolean;
  readonly pages?: readonly number[];
}

export type WatermarkOptions = TextWatermarkOptions | ImageWatermarkOptions;

export type WatermarkPosition =
  | 'center'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top-center'
  | 'bottom-center';

export async function addWatermark(
  file: Blob,
  options: WatermarkOptions,
  password?: string,
): Promise<Blob> {
  const lib = await loadPdfLib();
  const { StandardFonts, degrees, rgb } = lib;
  const pdf = await loadPdf(await bytesOf(file), { password, ignoreEncryption: true });
  const pages = pdf.getPages();
  const targets = options.pages ? new Set(options.pages) : null;

  const font =
    options.kind === 'text' ? await pdf.embedFont(StandardFonts.HelveticaBold) : undefined;

  let embeddedImage: Awaited<ReturnType<PDFDocument['embedPng']>> | undefined;
  if (options.kind === 'image') {
    const { encodeImage } = await import('./image.engine');
    const isJpeg = /jpe?g/i.test(options.image.type);
    const usable = isJpeg || /png/i.test(options.image.type)
      ? options.image
      : await encodeImage(options.image, { mime: 'image/png' });
    const bytes = new Uint8Array(await usable.arrayBuffer());
    embeddedImage = /jpe?g/i.test(usable.type) ? await pdf.embedJpg(bytes) : await pdf.embedPng(bytes);
  }

  pages.forEach((page, index) => {
    if (targets && !targets.has(index)) return;
    const { width, height } = page.getSize();

    if (options.kind === 'text' && font) {
      const textWidth = font.widthOfTextAtSize(options.text, options.fontSize);
      const textHeight = options.fontSize;

      const draw = (x: number, y: number): void => {
        page.drawText(options.text, {
          x,
          y,
          size: options.fontSize,
          font,
          color: hexToRgb(rgb, options.color),
          opacity: options.opacity,
          rotate: degrees(options.rotation),
        });
      };

      if (options.tile) {
        const stepX = Math.max(textWidth * 1.6, 120);
        const stepY = Math.max(textHeight * 5, 100);
        for (let y = -stepY; y < height + stepY; y += stepY) {
          for (let x = -stepX; x < width + stepX; x += stepX) draw(x, y);
        }
      } else {
        const spot = anchor(options.position, width, height, textWidth, textHeight, 36);
        draw(spot.x, spot.y);
      }
      return;
    }

    if (options.kind === 'image' && embeddedImage) {
      const image = embeddedImage;
      const drawWidth = image.width * options.scale;
      const drawHeight = image.height * options.scale;

      const draw = (x: number, y: number): void => {
        page.drawImage(image, {
          x,
          y,
          width: drawWidth,
          height: drawHeight,
          opacity: options.opacity,
          rotate: degrees(options.rotation),
        });
      };

      if (options.tile) {
        const stepX = drawWidth * 1.4;
        const stepY = drawHeight * 1.4;
        for (let y = -stepY; y < height + stepY; y += stepY) {
          for (let x = -stepX; x < width + stepX; x += stepX) draw(x, y);
        }
      } else {
        const spot = anchor(options.position, width, height, drawWidth, drawHeight, 36);
        draw(spot.x, spot.y);
      }
    }
  });

  return toBlob(pdf);
}

function anchor(
  position: WatermarkPosition,
  pageWidth: number,
  pageHeight: number,
  itemWidth: number,
  itemHeight: number,
  inset: number,
): { x: number; y: number } {
  switch (position) {
    case 'top-left':
      return { x: inset, y: pageHeight - inset - itemHeight };
    case 'top-right':
      return { x: pageWidth - inset - itemWidth, y: pageHeight - inset - itemHeight };
    case 'top-center':
      return { x: (pageWidth - itemWidth) / 2, y: pageHeight - inset - itemHeight };
    case 'bottom-left':
      return { x: inset, y: inset };
    case 'bottom-right':
      return { x: pageWidth - inset - itemWidth, y: inset };
    case 'bottom-center':
      return { x: (pageWidth - itemWidth) / 2, y: inset };
    default:
      return { x: (pageWidth - itemWidth) / 2, y: (pageHeight - itemHeight) / 2 };
  }
}

/* ------------------------------------------------------------------
   Watermark removal
   ------------------------------------------------------------------ */

export interface WatermarkFinding {
  readonly kind: 'annotation' | 'xobject';
  readonly label: string;
  /** Pages the candidate appears on (zero-based). */
  readonly pages: readonly number[];
  readonly id: string;
}

/**
 * Looks for the two ways a watermark is usually added: stamp/watermark
 * annotations, and a form XObject drawn onto every page.
 *
 * A watermark burned into a page image is deliberately *not* reported — there
 * is no lossless way to remove it, and pretending otherwise would be worse
 * than saying so.
 */
export async function findWatermarks(file: Blob, password?: string): Promise<WatermarkFinding[]> {
  const lib = await loadPdfLib();
  const { PDFName, PDFDict, PDFArray } = lib;
  const pdf = await loadPdf(await bytesOf(file), { password, ignoreEncryption: true });
  const pages = pdf.getPages();

  const annotations = new Map<string, number[]>();
  const xobjects = new Map<string, number[]>();

  pages.forEach((page, index) => {
    const annots = page.node.lookup(PDFName.of('Annots'), PDFArray);
    if (annots) {
      for (let i = 0; i < annots.size(); i++) {
        const dict = annots.lookup(i, PDFDict);
        const subtype = dict?.get(PDFName.of('Subtype'))?.toString() ?? '';
        if (/Watermark|Stamp/i.test(subtype)) {
          const key = subtype.replace('/', '');
          annotations.set(key, [...(annotations.get(key) ?? []), index]);
        }
      }
    }

    const resources = page.node.Resources();
    const forms = resources?.lookup(PDFName.of('XObject'), PDFDict);
    if (forms) {
      for (const [name] of forms.entries()) {
        const key = name.asString().replace('/', '');
        if (/wm|watermark|stamp|draft|confidential|logo/i.test(key)) {
          xobjects.set(key, [...(xobjects.get(key) ?? []), index]);
        }
      }
    }
  });

  const findings: WatermarkFinding[] = [];
  for (const [label, list] of annotations) {
    findings.push({ kind: 'annotation', label: `${label} annotation`, pages: list, id: `a:${label}` });
  }
  for (const [label, list] of xobjects) {
    // Something drawn on nearly every page is far more likely to be a
    // watermark than a one-off illustration.
    if (list.length >= Math.max(2, pages.length * 0.6)) {
      findings.push({ kind: 'xobject', label: `Repeated object "${label}"`, pages: list, id: `x:${label}` });
    }
  }

  return findings;
}

export async function removeWatermarks(
  file: Blob,
  ids: readonly string[],
  password?: string,
): Promise<Blob> {
  const lib = await loadPdfLib();
  const { PDFName, PDFDict, PDFArray } = lib;
  const pdf = await loadPdf(await bytesOf(file), { password, ignoreEncryption: true });

  const annotationLabels = new Set(
    ids.filter((id) => id.startsWith('a:')).map((id) => id.slice(2)),
  );
  const xobjectNames = new Set(ids.filter((id) => id.startsWith('x:')).map((id) => id.slice(2)));

  for (const page of pdf.getPages()) {
    const annots = page.node.lookup(PDFName.of('Annots'), PDFArray);
    if (annots && annotationLabels.size) {
      for (let i = annots.size() - 1; i >= 0; i--) {
        const dict = annots.lookup(i, PDFDict);
        const subtype = (dict?.get(PDFName.of('Subtype'))?.toString() ?? '').replace('/', '');
        if (annotationLabels.has(subtype)) annots.remove(i);
      }
    }

    if (xobjectNames.size) {
      const forms = page.node.Resources()?.lookup(PDFName.of('XObject'), PDFDict);
      if (forms) {
        for (const [name] of forms.entries()) {
          const key = name.asString().replace('/', '');
          if (xobjectNames.has(key)) forms.delete(name);
        }
      }
    }
  }

  return toBlob(pdf);
}

/**
 * Fallback for flattened watermarks: paints an opaque rectangle over the
 * region on every page. Honest about what it is — a cover, not a removal.
 */
export async function coverRegion(
  file: Blob,
  region: { x: number; y: number; width: number; height: number },
  color = '#ffffff',
  password?: string,
): Promise<Blob> {
  const { rgb } = await loadPdfLib();
  const pdf = await loadPdf(await bytesOf(file), { password, ignoreEncryption: true });

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    page.drawRectangle({
      x: region.x * width,
      y: region.y * height,
      width: region.width * width,
      height: region.height * height,
      color: hexToRgb(rgb, color),
    });
  }

  return toBlob(pdf);
}

/* ------------------------------------------------------------------
   Encryption
   ------------------------------------------------------------------ */

export interface ProtectOptions {
  readonly userPassword?: string;
  readonly ownerPassword?: string;
  readonly permissions: {
    readonly printing: boolean;
    readonly modifying: boolean;
    readonly copying: boolean;
    readonly annotating: boolean;
    readonly fillingForms: boolean;
    readonly contentAccessibility: boolean;
    readonly documentAssembly: boolean;
  };
}

export async function protectPdf(file: Blob, options: ProtectOptions): Promise<Blob> {
  const pdf = await loadPdf(await bytesOf(file), { ignoreEncryption: true });

  pdf.encrypt({
    userPassword: options.userPassword || undefined,
    ownerPassword: options.ownerPassword || options.userPassword || undefined,
    permissions: {
      printing: options.permissions.printing ? 'highResolution' : undefined,
      modifying: options.permissions.modifying,
      copying: options.permissions.copying,
      annotating: options.permissions.annotating,
      fillingForms: options.permissions.fillingForms,
      contentAccessibility: options.permissions.contentAccessibility,
      documentAssembly: options.permissions.documentAssembly,
    },
  } as never);

  return toBlob(pdf);
}

/** Removes protection from a document whose password the user supplied. */
export async function unlockPdf(file: Blob, password: string): Promise<Blob> {
  const { PDFDocument } = await loadPdfLib();
  const source = await loadPdf(await bytesOf(file), { password });

  // Copying every page into a fresh document is what actually drops the
  // security handler — saving in place would keep it.
  const output = await PDFDocument.create();
  const copied = await output.copyPages(source, source.getPageIndices());
  for (const page of copied) output.addPage(page);

  const title = source.getTitle();
  const author = source.getAuthor();
  if (title) output.setTitle(title);
  if (author) output.setAuthor(author);
  output.setProducer('Office Utilities');

  return toBlob(output);
}

/* ------------------------------------------------------------------
   Compression
   ------------------------------------------------------------------ */

export interface CompressOptions {
  /** Longest edge for embedded images, in pixels. */
  readonly maxImageDimension: number;
  readonly imageQuality: number;
  readonly stripMetadata: boolean;
  readonly grayscale: boolean;
}

export interface CompressResult {
  readonly blob: Blob;
  readonly originalSize: number;
  readonly imagesProcessed: number;
}

/**
 * Rebuilds a PDF with its raster pages re-encoded at a lower quality.
 *
 * pdf-lib cannot rewrite an image stream in place, so pages that are mostly
 * scanned artwork are rasterised through PDF.js and re-embedded. Pages that
 * are predominantly vector text are copied untouched, because rasterising
 * those would make the file both larger and worse.
 */
export async function compressPdf(
  file: Blob,
  options: CompressOptions,
  onProgress?: (done: number, total: number) => void,
): Promise<CompressResult> {
  const { PDFDocument } = await loadPdfLib();
  const { openPdf, renderPage, closePdf } = await import('./pdfjs.engine');
  const { canvasToBlob } = await import('./image.engine');

  const bytes = await bytesOf(file);
  const source = await loadPdf(bytes, { ignoreEncryption: true });
  const rendering = await openPdf(bytes);

  const output = await PDFDocument.create();
  let imagesProcessed = 0;

  for (let index = 0; index < source.getPageCount(); index++) {
    const page = await rendering.getPage(index + 1);
    const textContent = await page.getTextContent();
    const hasText = textContent.items.some((item) => 'str' in item && item.str.trim().length > 2);
    const viewport = page.getViewport({ scale: 1 });
    page.cleanup();

    if (hasText) {
      // Keep vector/text pages exactly as they are.
      const [copied] = await output.copyPages(source, [index]);
      output.addPage(copied);
    } else {
      const scale = Math.min(
        2,
        options.maxImageDimension / Math.max(viewport.width, viewport.height),
      );
      const canvas = await renderPage(rendering, index + 1, {
        scale: Math.max(0.4, scale),
        background: '#ffffff',
      });

      if (options.grayscale) applyGrayscale(canvas);

      const jpeg = await canvasToBlob(canvas, 'image/jpeg', options.imageQuality);
      const embedded = await output.embedJpg(new Uint8Array(await jpeg.arrayBuffer()));
      const newPage = output.addPage([viewport.width, viewport.height]);
      newPage.drawImage(embedded, {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
      });
      imagesProcessed++;
    }

    onProgress?.(index + 1, source.getPageCount());
  }

  if (!options.stripMetadata) {
    const title = source.getTitle();
    const author = source.getAuthor();
    const subject = source.getSubject();
    if (title) output.setTitle(title);
    if (author) output.setAuthor(author);
    if (subject) output.setSubject(subject);
  }
  output.setProducer('Office Utilities');

  await closePdf(rendering);

  const blob = await new Promise<Blob>((resolve) => {
    void output
      .save({ useObjectStreams: true })
      .then((saved) =>
        resolve(new Blob([saved as unknown as BlobPart], { type: 'application/pdf' })),
      );
  });

  return { blob, originalSize: file.size, imagesProcessed };
}

function applyGrayscale(canvas: HTMLCanvasElement): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = data[i + 1] = data[i + 2] = luminance;
  }
  context.putImageData(image, 0, 0);
}
