import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { DocBlock, InlineRun, ListItem } from './doc-model';
import { closePdf, openPdf } from './pdfjs.engine';

/**
 * Recovering document structure from a PDF.
 *
 * A PDF stores glyphs at coordinates. It does not store paragraphs, headings or
 * lists — that information was thrown away when the file was produced, and no
 * converter can read it back with certainty. What follows infers structure from
 * the only evidence left: font size, font name, and the geometry of the text.
 *
 * The inference is deliberately conservative. Producing a plain paragraph where
 * the original had a heading is a small loss; inventing headings throughout a
 * document because one page used a larger font is a document nobody can edit.
 */

/** One positioned run of text as pdf.js reports it. */
interface RawItem {
  readonly str: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly font: string;
}

/** Items sharing a baseline, assembled back into a visual line. */
interface Line {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly page: number;
}

export interface PdfExtractOptions {
  /** Promote larger-than-body lines to headings. */
  readonly detectHeadings?: boolean;
  /** Turn bulleted and numbered lines into real list blocks. */
  readonly detectLists?: boolean;
  /** Join wrapped lines back into single paragraphs. */
  readonly mergeParagraphs?: boolean;
  /** Drop running headers and footers repeated across pages. */
  readonly dropRepeated?: boolean;
  /** Emit a page break between pages. */
  readonly pageBreaks?: boolean;
}

const DEFAULTS: Required<PdfExtractOptions> = {
  detectHeadings: true,
  detectLists: true,
  mergeParagraphs: true,
  dropRepeated: true,
  pageBreaks: false,
};

export interface PdfExtractResult {
  readonly blocks: DocBlock[];
  readonly text: string;
  readonly pageCount: number;
  /**
   * False when the PDF carries no selectable text at all — almost always a
   * scan. Nothing can be extracted without OCR, and the caller should say so
   * rather than handing back an empty document.
   */
  readonly hasTextLayer: boolean;
  /** Running headers/footers that were removed, for disclosure in the UI. */
  readonly droppedLines: readonly string[];
  readonly headingCount: number;
}

/** Bold and italic survive only in the font's name, e.g. `ABCDEE+Calibri-BoldItalic`. */
const BOLD_HINT = /bold|black|heavy|semibold|demi/i;
const ITALIC_HINT = /italic|oblique/i;

/** Leading bullet glyphs, and `1.` / `a)` / `iv.` style numbering. */
const BULLET = /^\s*[•‣▪◦·–—*-]\s+/;
const NUMBERED = /^\s*(\d{1,3}|[a-z]|[ivxlc]{1,5})\s*[.)]\s+/i;

/** A line ending mid-sentence is a wrap, not a paragraph end. */
const SENTENCE_END = /[.!?:;"')\]]\s*$/;

export async function extractPdfDocument(
  file: Blob,
  options: PdfExtractOptions = {},
  onProgress?: (page: number, total: number) => void,
): Promise<PdfExtractResult> {
  const settings = { ...DEFAULTS, ...options };
  const doc = await openPdf(await file.arrayBuffer());

  try {
    const pages: Line[][] = [];
    for (let index = 1; index <= doc.numPages; index++) {
      pages.push(await linesOfPage(doc, index));
      onProgress?.(index, doc.numPages);
    }

    const all = pages.flat();
    if (all.length === 0) {
      return {
        blocks: [],
        text: '',
        pageCount: doc.numPages,
        hasTextLayer: false,
        droppedLines: [],
        headingCount: 0,
      };
    }

    const repeated = settings.dropRepeated ? findRepeated(pages) : new Set<string>();
    const bodySize = modalSize(all);

    const blocks: DocBlock[] = [];
    let headingCount = 0;

    pages.forEach((lines, pageIndex) => {
      if (settings.pageBreaks && pageIndex > 0) blocks.push({ type: 'pagebreak' });

      const kept = lines.filter((line) => !repeated.has(normalise(line.text)));
      const produced = blocksOfPage(kept, bodySize, settings);
      headingCount += produced.filter((b) => b.type === 'heading').length;
      blocks.push(...produced);
    });

    return {
      blocks,
      text: pages
        .map((lines) =>
          lines
            .filter((line) => !repeated.has(normalise(line.text)))
            .map((line) => line.text)
            .join('\n'),
        )
        .join('\n\n'),
      pageCount: doc.numPages,
      hasTextLayer: true,
      droppedLines: [...repeated],
      headingCount,
    };
  } finally {
    await closePdf(doc);
  }
}

/* ------------------------------------------------------------------
   Page → lines
   ------------------------------------------------------------------ */

async function linesOfPage(doc: PDFDocumentProxy, pageNumber: number): Promise<Line[]> {
  const page = await doc.getPage(pageNumber);
  try {
    const content = await page.getTextContent();

    const items: RawItem[] = [];
    for (const entry of content.items) {
      if (!('str' in entry)) continue;
      const item = entry as {
        str: string;
        width: number;
        height: number;
        transform: number[];
        fontName?: string;
      };
      if (!item.str) continue;
      const [, , , , x, y] = item.transform;
      items.push({
        str: item.str,
        x,
        y,
        width: item.width,
        height: item.height,
        font: item.fontName ?? '',
      });
    }
    if (items.length === 0) return [];

    // Group by baseline. A tolerance proportional to glyph height keeps
    // superscripts and mixed sizes on the line they visually belong to.
    const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
    const groups: RawItem[][] = [];
    let current: RawItem[] = [sorted[0]];

    for (const item of sorted.slice(1)) {
      const previous = current[current.length - 1];
      const tolerance = Math.max(2, Math.min(previous.height, item.height) * 0.5);
      if (Math.abs(item.y - previous.y) <= tolerance) current.push(item);
      else {
        groups.push(current);
        current = [item];
      }
    }
    groups.push(current);

    return groups
      .map((group) => toLine(group, pageNumber))
      .filter((line): line is Line => line !== null);
  } finally {
    page.cleanup();
  }
}

function toLine(group: RawItem[], page: number): Line | null {
  const ordered = [...group].sort((a, b) => a.x - b.x);

  let text = '';
  let previous: RawItem | null = null;
  for (const item of ordered) {
    if (previous) {
      const gap = item.x - (previous.x + previous.width);
      // PDFs often position each word separately with no space glyph, so a
      // horizontal gap has to be turned back into a space.
      const spaceWidth = Math.max(previous.height, item.height) * 0.2;
      if (gap > spaceWidth && !/\s$/.test(text) && !/^\s/.test(item.str)) text += ' ';
    }
    text += item.str;
    previous = item;
  }

  text = text.replace(/\s+/g, ' ').trim();
  if (!text) return null;

  // Weight by character count: a short bold lead-in should not make a whole
  // paragraph bold.
  const weight = (predicate: (f: string) => boolean) =>
    ordered.reduce((sum, i) => sum + (predicate(i.font) ? i.str.length : 0), 0);
  const total = ordered.reduce((sum, i) => sum + i.str.length, 0) || 1;

  return {
    text,
    x: ordered[0].x,
    y: ordered[0].y,
    size: Math.max(...ordered.map((i) => i.height)),
    bold: weight((f) => BOLD_HINT.test(f)) / total > 0.6,
    italic: weight((f) => ITALIC_HINT.test(f)) / total > 0.6,
    page,
  };
}

/* ------------------------------------------------------------------
   Lines → blocks
   ------------------------------------------------------------------ */

function blocksOfPage(
  lines: readonly Line[],
  bodySize: number,
  settings: Required<PdfExtractOptions>,
): DocBlock[] {
  const blocks: DocBlock[] = [];
  let paragraph: Line[] = [];
  let listItems: ListItem[] = [];
  let listOrdered = false;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({
      type: 'paragraph',
      content: runsOf(paragraph.map((l) => l.text).join(' '), paragraph[0]),
    });
    paragraph = [];
  };

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push({ type: 'list', ordered: listOrdered, items: listItems });
    listItems = [];
  };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const previous = lines[index - 1];

    const bulleted = settings.detectLists && BULLET.test(line.text);
    const numbered = settings.detectLists && NUMBERED.test(line.text);

    if (bulleted || numbered) {
      flushParagraph();
      // A switch between bullets and numbers starts a separate list.
      if (listItems.length && listOrdered !== !!numbered) flushList();
      listOrdered = !!numbered;
      listItems.push({
        content: runsOf(line.text.replace(bulleted ? BULLET : NUMBERED, ''), line),
      });
      continue;
    }
    flushList();

    const level = settings.detectHeadings ? headingLevel(line, bodySize) : null;
    if (level) {
      flushParagraph();
      blocks.push({ type: 'heading', level, content: runsOf(line.text, line) });
      continue;
    }

    if (!settings.mergeParagraphs) {
      blocks.push({ type: 'paragraph', content: runsOf(line.text, line) });
      continue;
    }

    if (paragraph.length && previous && startsNewParagraph(previous, line, bodySize)) {
      flushParagraph();
    }
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

/**
 * Decides whether a line continues the paragraph above it.
 *
 * Two signals, both needed: an unusually large vertical gap, or a previous line
 * that ended a sentence well short of the right margin. Either alone produces
 * false splits in justified text.
 */
function startsNewParagraph(previous: Line, line: Line, bodySize: number): boolean {
  const gap = previous.y - line.y;
  if (gap > bodySize * 1.8) return true;
  // An indent marks a new paragraph in most typeset documents.
  if (line.x - previous.x > bodySize * 0.8) return true;
  return SENTENCE_END.test(previous.text) && previous.text.length < 60;
}

function headingLevel(line: Line, bodySize: number): 1 | 2 | 3 | null {
  const ratio = line.size / bodySize;
  // Long lines are body text however they are set; headings are short.
  if (line.text.length > 120) return null;
  if (ratio >= 1.55) return 1;
  if (ratio >= 1.28) return 2;
  if (ratio >= 1.12) return 3;
  // A short, fully bold line above body text reads as a heading even at the
  // same size — a very common pattern in reports written in Word.
  if (line.bold && ratio >= 0.98 && line.text.length < 70) return 3;
  return null;
}

function runsOf(text: string, line: Line): InlineRun[] {
  const run: InlineRun = {
    text,
    ...(line.bold ? { bold: true } : {}),
    ...(line.italic ? { italic: true } : {}),
  };
  return [run];
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

/**
 * The most common line height, taken as the body size.
 *
 * A mean would be dragged upwards by titles; the mode is what the bulk of the
 * document is actually set in. Sizes are bucketed to a tenth of a point because
 * PDF font sizes are rarely exact integers.
 */
function modalSize(lines: readonly Line[]): number {
  const counts = new Map<number, number>();
  for (const line of lines) {
    const bucket = Math.round(line.size * 10) / 10;
    counts.set(bucket, (counts.get(bucket) ?? 0) + line.text.length);
  }
  let best = 12;
  let bestCount = -1;
  for (const [size, count] of counts) {
    if (count > bestCount) {
      best = size;
      bestCount = count;
    }
  }
  return best || 12;
}

const normalise = (text: string) => text.replace(/\d+/g, '#').replace(/\s+/g, ' ').trim();

/**
 * Finds running headers and footers.
 *
 * A line counts as furniture when the same text — with digits masked, so
 * "Page 4 of 9" matches "Page 5 of 9" — appears near the top or bottom of most
 * pages. Requiring a majority avoids stripping a phrase that simply recurs.
 */
function findRepeated(pages: readonly Line[][]): Set<string> {
  const repeated = new Set<string>();
  if (pages.length < 3) return repeated;

  const counts = new Map<string, number>();
  for (const lines of pages) {
    if (lines.length === 0) continue;
    const ys = lines.map((l) => l.y);
    const top = Math.max(...ys);
    const bottom = Math.min(...ys);
    const band = (top - bottom) * 0.12;

    const edge = new Set<string>();
    for (const line of lines) {
      if (line.y >= top - band || line.y <= bottom + band) edge.add(normalise(line.text));
    }
    for (const key of edge) counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const threshold = Math.max(2, Math.ceil(pages.length * 0.6));
  for (const [key, count] of counts) {
    if (count >= threshold && key.length > 0) repeated.add(key);
  }
  return repeated;
}
