import type {
  PDFDocumentProxy,
  PDFPageProxy,
  TextItem,
} from 'pdfjs-dist/types/src/display/api';

export type PdfJs = typeof import('pdfjs-dist');

let pdfjsPromise: Promise<PdfJs> | null = null;

const ASSET_BASE = '/vendor/pdfjs/';

export function loadPdfJs(): Promise<PdfJs> {
  pdfjsPromise ??= (async () => {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = `${ASSET_BASE}pdf.worker.min.mjs`;
    return pdfjs;
  })();
  return pdfjsPromise;
}

export class PasswordRequiredError extends Error {
  constructor(readonly wrongPassword: boolean) {
    super(wrongPassword ? 'That password is not correct.' : 'This PDF is password protected.');
    this.name = 'PasswordRequiredError';
  }
}

export interface OpenOptions {
  readonly password?: string;
  readonly onProgress?: (fraction: number) => void;
}

export async function openPdf(
  data: ArrayBuffer | Uint8Array,
  options: OpenOptions = {},
): Promise<PDFDocumentProxy> {
  const pdfjs = await loadPdfJs();
  const bytes = data instanceof Uint8Array ? data.slice() : new Uint8Array(data.slice(0));

  const task = pdfjs.getDocument({
    data: bytes,
    password: options.password,
    cMapUrl: `${ASSET_BASE}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${ASSET_BASE}standard_fonts/`,
    wasmUrl: `${ASSET_BASE}wasm/`,
    disableAutoFetch: true,
  });

  if (options.onProgress) {
    task.onProgress = ({ loaded, total }: { loaded: number; total: number }) => {
      options.onProgress?.(total ? loaded / total : 0);
    };
  }

  try {
    return await task.promise;
  } catch (error) {
    const name = (error as { name?: string })?.name;
    if (name === 'PasswordException') {
      throw new PasswordRequiredError(!!options.password);
    }
    throw error;
  }
}

export async function closePdf(doc: PDFDocumentProxy | null | undefined): Promise<void> {
  if (!doc) return;
  try {
    await (doc as unknown as { destroy?: () => Promise<void> }).destroy?.();
  } catch {}
}

export interface PdfPageSize {
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
}

export async function pageSizes(doc: PDFDocumentProxy): Promise<PdfPageSize[]> {
  const sizes: PdfPageSize[] = [];
  for (let index = 1; index <= doc.numPages; index++) {
    const page = await doc.getPage(index);
    const viewport = page.getViewport({ scale: 1 });
    sizes.push({ width: viewport.width, height: viewport.height, rotation: page.rotate });
    page.cleanup();
  }
  return sizes;
}

export interface RenderOptions {
  readonly scale?: number;
  readonly rotation?: number;
  readonly maxDimension?: number;
  readonly background?: string;
}

export async function renderPage(
  doc: PDFDocumentProxy,
  pageNumber: number,
  options: RenderOptions = {},
): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNumber);
  try {
    return await renderPageProxy(page, options);
  } finally {
    page.cleanup();
  }
}

export async function renderPageProxy(
  page: PDFPageProxy,
  options: RenderOptions = {},
): Promise<HTMLCanvasElement> {
  let scale = options.scale ?? 1;
  const rotation = ((page.rotate + (options.rotation ?? 0)) % 360 + 360) % 360;
  let viewport = page.getViewport({ scale, rotation });

  const cap = options.maxDimension ?? 8192;
  const longest = Math.max(viewport.width, viewport.height);
  if (longest > cap) {
    scale = scale * (cap / longest);
    viewport = page.getViewport({ scale, rotation });
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));

  const context = canvas.getContext('2d', { alpha: !options.background });
  if (!context) throw new Error('Canvas is unavailable in this browser.');

  if (options.background) {
    context.fillStyle = options.background;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  await page.render({ canvas, canvasContext: context, viewport }).promise;
  return canvas;
}

export async function renderThumbnail(
  doc: PDFDocumentProxy,
  pageNumber: number,
  maxWidth = 220,
): Promise<string> {
  const page = await doc.getPage(pageNumber);
  try {
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(2, maxWidth / base.width);
    const canvas = await renderPageProxy(page, { scale, background: '#ffffff' });
    return canvas.toDataURL('image/jpeg', 0.72);
  } finally {
    page.cleanup();
  }
}

export interface PageText {
  readonly page: number;
  readonly text: string;
  readonly items: readonly { str: string; x: number; y: number; width: number; height: number }[];
}

export async function extractPageText(
  doc: PDFDocumentProxy,
  pageNumber: number,
): Promise<PageText> {
  const page = await doc.getPage(pageNumber);
  try {
    const content = await page.getTextContent();
    const items = content.items.filter((item): item is TextItem => 'str' in item);

    const lines: string[] = [];
    let currentLine = '';
    let lastY: number | null = null;

    const positioned = items.map((item) => {
      const [, , , , x, y] = item.transform as number[];
      return { str: item.str, x, y, width: item.width, height: item.height, eol: item.hasEOL };
    });

    for (const item of positioned) {
      if (lastY !== null && Math.abs(item.y - lastY) > 3) {
        lines.push(currentLine.trimEnd());
        currentLine = '';
      }
      currentLine += item.str;
      if (item.eol) {
        lines.push(currentLine.trimEnd());
        currentLine = '';
      }
      lastY = item.y;
    }
    if (currentLine.trim()) lines.push(currentLine.trimEnd());

    return {
      page: pageNumber,
      text: lines.join('\n'),
      items: positioned.map(({ str, x, y, width, height }) => ({ str, x, y, width, height })),
    };
  } finally {
    page.cleanup();
  }
}

export async function extractAllText(
  doc: PDFDocumentProxy,
  onProgress?: (page: number, total: number) => void,
): Promise<PageText[]> {
  const pages: PageText[] = [];
  for (let index = 1; index <= doc.numPages; index++) {
    pages.push(await extractPageText(doc, index));
    onProgress?.(index, doc.numPages);
  }
  return pages;
}

export interface SearchHit {
  readonly page: number;
  readonly index: number;
  readonly excerpt: string;
}

export function searchPages(pages: readonly PageText[], query: string): SearchHit[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];

  const hits: SearchHit[] = [];
  for (const page of pages) {
    const haystack = page.text.toLowerCase();
    let from = 0;
    for (;;) {
      const index = haystack.indexOf(needle, from);
      if (index === -1) break;
      hits.push({
        page: page.page,
        index,
        excerpt: buildExcerpt(page.text, index, needle.length),
      });
      from = index + needle.length;
      if (hits.length > 999) return hits;
    }
  }
  return hits;
}

function buildExcerpt(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 42);
  const end = Math.min(text.length, index + length + 42);
  return `${start > 0 ? '…' : ''}${text.slice(start, end).replace(/\s+/g, ' ')}${
    end < text.length ? '…' : ''
  }`;
}

export interface PdfDocumentInfo {
  readonly pageCount: number;
  readonly title?: string;
  readonly author?: string;
  readonly subject?: string;
  readonly keywords?: string;
  readonly creator?: string;
  readonly producer?: string;
  readonly creationDate?: string;
  readonly modificationDate?: string;
  readonly pdfVersion?: string;
  readonly encrypted: boolean;
  readonly hasTextLayer: boolean;
  readonly outline: readonly { title: string; page?: number; level: number }[];
}

export async function describePdf(doc: PDFDocumentProxy): Promise<PdfDocumentInfo> {
  const metadata = await doc.getMetadata().catch(() => null);
  const info = (metadata?.info ?? {}) as Record<string, unknown>;

  let hasTextLayer = false;
  for (let index = 1; index <= Math.min(3, doc.numPages); index++) {
    const page = await doc.getPage(index);
    const content = await page.getTextContent();
    if (content.items.some((item) => 'str' in item && item.str.trim())) hasTextLayer = true;
    page.cleanup();
    if (hasTextLayer) break;
  }

  const outline: { title: string; page?: number; level: number }[] = [];
  try {
    const raw = await doc.getOutline();
    const walk = (nodes: typeof raw, level: number): void => {
      for (const node of nodes ?? []) {
        outline.push({ title: node.title, level });
        if (node.items?.length) walk(node.items, level + 1);
      }
    };
    walk(raw, 0);
  } catch {}

  return {
    pageCount: doc.numPages,
    title: str(info['Title']),
    author: str(info['Author']),
    subject: str(info['Subject']),
    keywords: str(info['Keywords']),
    creator: str(info['Creator']),
    producer: str(info['Producer']),
    creationDate: formatPdfDate(str(info['CreationDate'])),
    modificationDate: formatPdfDate(str(info['ModDate'])),
    pdfVersion: str(info['PDFFormatVersion']),
    encrypted: !!info['IsEncrypted'],
    hasTextLayer,
    outline,
  };
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function formatPdfDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const match = value.match(/^D:(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?/);
  if (!match) return value;
  const [, year, month = '01', day = '01', hour = '00', minute = '00', second = '00'] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
