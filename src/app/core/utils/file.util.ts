/** Small, dependency-free helpers shared by every tool. */

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot).toLowerCase() : '';
}

export function baseNameOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
}

/** Replaces the extension, e.g. `report.docx` + `.pdf` → `report.pdf`. */
export function withExtension(name: string, extension: string): string {
  const ext = extension.startsWith('.') ? extension : `.${extension}`;
  return baseNameOf(name) + ext;
}

/** Adds a suffix before the extension, e.g. `a.pdf` + `-merged` → `a-merged.pdf`. */
export function withSuffix(name: string, suffix: string): string {
  return `${baseNameOf(name)}${suffix}${extensionOf(name)}`;
}

/** Characters that Windows, macOS and Linux all reject in a file name. */
const ILLEGAL_FILENAME_CHARS = /[<>:"|?*\/]/g;

/** Strips characters that browsers and operating systems dislike. */
export function safeFileName(name: string, fallback = 'document'): string {
  const cleaned = name
    .replace(ILLEGAL_FILENAME_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || fallback;
}

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : decimals)} ${UNITS[i]}`;
}

export function matchesAccept(name: string, accepts: readonly string[] | undefined): boolean {
  if (!accepts || accepts.length === 0) return true;
  const ext = extensionOf(name);
  return accepts.some((a) => a.toLowerCase() === ext);
}

export function readAsArrayBuffer(file: Blob): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}

export function readAsText(file: Blob, encoding = 'utf-8'): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsText(file, encoding);
  });
}

export function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Parses a page-range expression such as `1, 3-5, 9-` into zero-based indices.
 * Out-of-range and reversed values are clamped rather than rejected, so the
 * field stays forgiving while the user types.
 */
export function parsePageRanges(input: string, pageCount: number): number[] {
  const out = new Set<number>();
  for (const chunk of input.split(/[,;\s]+/)) {
    if (!chunk) continue;
    const range = chunk.match(/^(\d+)?\s*-\s*(\d+)?$/);
    if (range) {
      const start = range[1] ? parseInt(range[1], 10) : 1;
      const end = range[2] ? parseInt(range[2], 10) : pageCount;
      const [lo, hi] = start <= end ? [start, end] : [end, start];
      for (let p = Math.max(1, lo); p <= Math.min(pageCount, hi); p++) out.add(p - 1);
      continue;
    }
    const single = parseInt(chunk, 10);
    if (Number.isFinite(single) && single >= 1 && single <= pageCount) out.add(single - 1);
  }
  return [...out].sort((a, b) => a - b);
}

/** Renders zero-based indices back into a compact `1, 3-5` string. */
export function formatPageRanges(indices: readonly number[]): string {
  const pages = [...indices].map((i) => i + 1).sort((a, b) => a - b);
  const parts: string[] = [];
  let start: number | null = null;
  let prev: number | null = null;

  for (const page of pages) {
    if (start === null) {
      start = prev = page;
      continue;
    }
    if (page === (prev as number) + 1) {
      prev = page;
      continue;
    }
    parts.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = prev = page;
  }
  if (start !== null) parts.push(start === prev ? `${start}` : `${start}-${prev}`);
  return parts.join(', ');
}

/** Yields to the event loop so long loops do not block painting. */
export function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export function uid(prefix = 'id'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Human-friendly relative time, e.g. "3 minutes ago". */
export function timeAgo(epochMs: number, now = Date.now()): string {
  const seconds = Math.round((now - epochMs) / 1000);
  if (seconds < 45) return 'just now';
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'second'],
    [3600, 'minute'],
    [86400, 'hour'],
    [604800, 'day'],
    [2629800, 'week'],
    [31557600, 'month'],
    [Infinity, 'year'],
  ];
  const divisors = [1, 60, 3600, 86400, 604800, 2629800, 31557600];
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  for (let i = 0; i < units.length; i++) {
    if (seconds < units[i][0]) {
      return formatter.format(-Math.round(seconds / divisors[i]), units[i][1]);
    }
  }
  return formatter.format(-Math.round(seconds / 31557600), 'year');
}
