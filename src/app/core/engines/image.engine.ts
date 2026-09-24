export type ImageMime = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/avif';

export interface EncodeOptions {
  readonly mime: ImageMime;
  readonly quality?: number;
  readonly maxDimension?: number;
  readonly width?: number;
  readonly height?: number;
  readonly background?: string;
  readonly scale?: number;
}

export interface ImageInfo {
  readonly width: number;
  readonly height: number;
  readonly mime: string;
  readonly bytes: number;
}

const OPAQUE_FORMATS = new Set<ImageMime>(['image/jpeg']);

export async function inspectImage(file: Blob): Promise<ImageInfo> {
  const bitmap = await decode(file);
  const info: ImageInfo = {
    width: bitmap.width,
    height: bitmap.height,
    mime: file.type || 'image/unknown',
    bytes: file.size,
  };
  release(bitmap);
  return info;
}

export async function isHeicBlob(source: Blob): Promise<boolean> {
  if (source.size < 12) return false;
  try {
    const header = new Uint8Array(await source.slice(0, 16).arrayBuffer());
    const tag = String.fromCharCode(...header.subarray(4, 8));
    if (tag !== 'ftyp') return false;
    const brand = String.fromCharCode(...header.subarray(8, 12)).toLowerCase();
    return ['heic', 'heix', 'heim', 'heis', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand);
  } catch {
    return false;
  }
}

export async function prepareForCanvas(source: Blob): Promise<Blob> {
  if (!(await isHeicBlob(source))) return source;
  const { heicTo } = await import('heic-to/csp');
  try {
    return await heicTo({ blob: source, type: 'image/png' });
  } catch (error) {
    throw new Error(
      'That HEIC file could not be decoded — it may be truncated, or it may be a video frame rather than a photograph.',
      { cause: error },
    );
  }
}

async function decode(original: Blob): Promise<ImageBitmap | HTMLImageElement> {
  const source = await prepareForCanvas(original);
  const isSvg = source.type === 'image/svg+xml';
  if (!isSvg && typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(source);
    } catch {}
  }
  return decodeViaImage(URL.createObjectURL(source), true);
}

function decodeViaImage(url: string, revoke: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      if (revoke) setTimeout(() => URL.revokeObjectURL(url), 0);
      resolve(image);
    };
    image.onerror = () => {
      if (revoke) URL.revokeObjectURL(url);
      reject(new Error('That image could not be decoded by this browser.'));
    };
    image.src = url;
  });
}

function release(bitmap: ImageBitmap | HTMLImageElement): void {
  if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close();
}

function naturalSize(source: ImageBitmap | HTMLImageElement): { width: number; height: number } {
  if (source instanceof HTMLImageElement) {
    return {
      width: source.naturalWidth || source.width || 1024,
      height: source.naturalHeight || source.height || 1024,
    };
  }
  return { width: source.width, height: source.height };
}

function targetSize(
  natural: { width: number; height: number },
  options: EncodeOptions,
): { width: number; height: number } {
  let { width, height } = natural;

  if (options.scale && options.scale !== 1) {
    width = Math.round(width * options.scale);
    height = Math.round(height * options.scale);
  }

  if (options.width || options.height) {
    if (options.width && options.height) return { width: options.width, height: options.height };
    if (options.width) {
      return { width: options.width, height: Math.round((height / width) * options.width) };
    }
    return {
      width: Math.round((width / height) * (options.height as number)),
      height: options.height as number,
    };
  }

  const cap = options.maxDimension;
  if (cap && Math.max(width, height) > cap) {
    const ratio = cap / Math.max(width, height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  return { width: Math.max(1, width), height: Math.max(1, height) };
}

export async function encodeImage(source: Blob, options: EncodeOptions): Promise<Blob> {
  const decoded = await decode(source);
  try {
    const size = targetSize(naturalSize(decoded), options);
    const canvas = createCanvas(size.width, size.height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable in this browser.');

    const needsBackground = OPAQUE_FORMATS.has(options.mime) || options.background;
    if (needsBackground) {
      context.fillStyle = options.background ?? '#ffffff';
      context.fillRect(0, 0, size.width, size.height);
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(decoded as CanvasImageSource, 0, 0, size.width, size.height);

    return await canvasToBlob(canvas, options.mime, options.quality);
  } finally {
    release(decoded);
  }
}

export function createCanvas(width: number, height: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== 'undefined' && typeof document === 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export async function canvasToBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  mime: string,
  quality?: number,
): Promise<Blob> {
  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type: mime, quality });
  }
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mime, quality),
  );
  if (blob && blob.type === mime) return blob;
  if (blob) {
    return blob;
  }
  throw new Error(`This browser cannot encode ${mime}.`);
}

export async function supportsFormat(mime: ImageMime): Promise<boolean> {
  try {
    const canvas = createCanvas(2, 2);
    const blob = await canvasToBlob(canvas, mime, 0.8);
    return blob.type === mime;
  } catch {
    return false;
  }
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read image'));
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(',');
  if (!dataUrl.startsWith('data:') || comma < 0) {
    throw new Error('That is not a data URL.');
  }
  const header = dataUrl.slice(5, comma);
  const payload = dataUrl.slice(comma + 1);

  if (!/;base64$/i.test(header)) {
    return new TextEncoder().encode(decodeURIComponent(payload));
  }

  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function dataUrlMime(dataUrl: string): string {
  const header = dataUrl.slice(5, Math.max(5, dataUrl.indexOf(',')));
  return header.replace(/;base64$/i, '').split(';')[0] || 'application/octet-stream';
}

export function dataUrlToBlob(dataUrl: string): Blob {
  return new Blob([dataUrlToBytes(dataUrl) as unknown as BlobPart], {
    type: dataUrlMime(dataUrl),
  });
}

export async function convertDataUrl(dataUrl: string, mime: ImageMime): Promise<string> {
  const converted = await encodeImage(dataUrlToBlob(dataUrl), { mime, quality: 0.92 });
  return blobToDataUrl(converted);
}

export async function svgToRaster(
  svg: string,
  options: { scale?: number; width?: number; height?: number; mime?: ImageMime; background?: string } = {},
): Promise<Blob> {
  const withSize = ensureSvgDimensions(svg);
  const blob = new Blob([withSize], { type: 'image/svg+xml;charset=utf-8' });
  return encodeImage(blob, {
    mime: options.mime ?? 'image/png',
    scale: options.scale,
    width: options.width,
    height: options.height,
    background: options.background,
    quality: 0.95,
  });
}

function ensureSvgDimensions(svg: string): string {
  if (/<svg[^>]*\swidth=/i.test(svg) && /<svg[^>]*\sheight=/i.test(svg)) return svg;
  const viewBox = svg.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (!viewBox) return svg;
  const parts = viewBox[1].trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return svg;
  const [, , width, height] = parts;
  return svg.replace(/<svg\b/i, `<svg width="${width}" height="${height}"`);
}

export async function compressToTarget(
  source: Blob,
  targetBytes: number,
  options: { mime?: ImageMime; maxDimension?: number } = {},
): Promise<{ blob: Blob; quality: number }> {
  const mime = options.mime ?? 'image/jpeg';
  let best: { blob: Blob; quality: number } | null = null;

  for (const quality of [0.92, 0.85, 0.78, 0.7, 0.6, 0.5, 0.4, 0.3]) {
    const blob = await encodeImage(source, {
      mime,
      quality,
      maxDimension: options.maxDimension,
    });
    if (!best || blob.size < best.blob.size) best = { blob, quality };
    if (blob.size <= targetBytes) return { blob, quality };
  }

  return best ?? { blob: source, quality: 1 };
}

export function extensionForMime(mime: string): string {
  switch (mime) {
    case 'image/png':
      return '.png';
    case 'image/jpeg':
      return '.jpg';
    case 'image/webp':
      return '.webp';
    case 'image/avif':
      return '.avif';
    case 'image/gif':
      return '.gif';
    case 'image/svg+xml':
      return '.svg';
    case 'image/bmp':
      return '.bmp';
    default:
      return '.img';
  }
}
