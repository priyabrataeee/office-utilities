import type { PDFDocumentProxy } from 'pdfjs-dist';
import { closePdf, openPdf } from './pdfjs.engine';

/**
 * Recovering tabular data from a PDF.
 *
 * A PDF has no concept of a table. Even a document that was a spreadsheet an
 * hour ago stores only glyphs at coordinates, and whatever ruling lines it
 * draws are unrelated vector paths that need not line up with the text at all.
 * So the grid has to be inferred, and the only reliable evidence is where the
 * text sits.
 *
 * The approach here is deliberately geometric rather than clever:
 *
 *   1. Items sharing a baseline become a row.
 *   2. Within a row, a horizontal gap wider than a space becomes a cell break.
 *   3. The left edges of every cell on the page are clustered. A cluster that
 *      recurs down the page is a column; one that appears once is a stray.
 *   4. Each cell is assigned to the column it starts under.
 *
 * Step 3 is what makes this work on real documents. A single row tells you
 * nothing — two numbers with a gap between them could be two columns or one
 * sentence. Columns are a property of the page, so they are found by looking
 * at the page.
 *
 * What this cannot do is stated plainly in the UI rather than papered over:
 * a scanned page has no text to position and yields nothing, merged cells
 * arrive as a value in the first column they start in, and a cell whose text
 * wrapped onto a second line arrives as two rows.
 */

/** One positioned run of text, as pdf.js reports it. */
interface RawItem {
  readonly str: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Adjacent items with no column-sized gap between them. */
interface Segment {
  readonly text: string;
  readonly x: number;
  readonly end: number;
}

export interface TableExtractOptions {
  /**
   * How much of the page a column anchor must recur across before it counts
   * as a column rather than a one-off indent. 0–1.
   */
  readonly columnSupport?: number;
  /** Drop rows whose cells are all empty. */
  readonly dropEmptyRows?: boolean;
  /** Turn text that reads as a number into a real number. */
  readonly coerceNumbers?: boolean;
}

const DEFAULTS: Required<TableExtractOptions> = {
  columnSupport: 0.15,
  dropEmptyRows: true,
  coerceNumbers: true,
};

export type TableCellValue = string | number;

export interface ExtractedPage {
  readonly page: number;
  readonly rows: TableCellValue[][];
  readonly columnCount: number;
  /**
   * True when no column structure was found and the page was emitted as one
   * column of lines. Worth telling the visitor, because it usually means the
   * page was prose rather than a table.
   */
  readonly singleColumn: boolean;
}

export interface TableExtractResult {
  readonly pages: ExtractedPage[];
  readonly pageCount: number;
  /** False when the document carries no selectable text at all — a scan. */
  readonly hasTextLayer: boolean;
  readonly totalRows: number;
}

export async function extractTables(
  file: Blob,
  options: TableExtractOptions = {},
  onProgress?: (page: number, total: number) => void,
  password?: string,
): Promise<TableExtractResult> {
  const settings = { ...DEFAULTS, ...options };
  const doc = await openPdf(await file.arrayBuffer(), { password });

  try {
    const pages: ExtractedPage[] = [];
    let sawText = false;

    for (let index = 1; index <= doc.numPages; index++) {
      const items = await itemsOfPage(doc, index);
      if (items.length) sawText = true;
      pages.push(gridOfPage(items, index, settings));
      onProgress?.(index, doc.numPages);
    }

    return {
      pages,
      pageCount: doc.numPages,
      hasTextLayer: sawText,
      totalRows: pages.reduce((sum, page) => sum + page.rows.length, 0),
    };
  } finally {
    await closePdf(doc);
  }
}

/* ------------------------------------------------------------------
   Page → positioned items
   ------------------------------------------------------------------ */

async function itemsOfPage(doc: PDFDocumentProxy, pageNumber: number): Promise<RawItem[]> {
  const page = await doc.getPage(pageNumber);
  try {
    const content = await page.getTextContent();
    const items: RawItem[] = [];

    for (const entry of content.items) {
      if (!('str' in entry)) continue;
      const item = entry as { str: string; width: number; height: number; transform: number[] };
      if (!item.str || !item.str.trim()) continue;
      const [, , , , x, y] = item.transform;
      items.push({ str: item.str, x, y, width: item.width, height: item.height });
    }

    return items;
  } finally {
    page.cleanup();
  }
}

/* ------------------------------------------------------------------
   Items → grid
   ------------------------------------------------------------------ */

function gridOfPage(
  items: readonly RawItem[],
  pageNumber: number,
  settings: Required<TableExtractOptions>,
): ExtractedPage {
  if (!items.length) {
    return { page: pageNumber, rows: [], columnCount: 0, singleColumn: true };
  }

  const rows = groupIntoRows(items).map(segmentsOfRow);
  const anchors = findColumns(rows, settings.columnSupport);

  if (anchors.length < 2) {
    // No column structure. One column of lines is a truthful representation
    // of a page of prose, and far more useful than an invented grid.
    const lines = rows
      .map((segments) => segments.map((segment) => segment.text).join(' ').trim())
      .filter((line) => line.length > 0)
      .map((line) => [cell(line, settings.coerceNumbers)]);
    return { page: pageNumber, rows: lines, columnCount: 1, singleColumn: true };
  }

  const grid: TableCellValue[][] = [];
  for (const segments of rows) {
    const row: string[] = new Array(anchors.length).fill('');
    for (const segment of segments) {
      const column = columnFor(segment.x, anchors);
      row[column] = row[column] ? `${row[column]} ${segment.text}` : segment.text;
    }
    if (settings.dropEmptyRows && row.every((value) => !value.trim())) continue;
    grid.push(row.map((value) => cell(value.trim(), settings.coerceNumbers)));
  }

  return {
    page: pageNumber,
    rows: grid,
    columnCount: anchors.length,
    singleColumn: false,
  };
}

/**
 * Groups items onto shared baselines.
 *
 * The tolerance scales with glyph height so that a superscript, a footnote
 * marker or a smaller unit symbol stays on the line it visually belongs to,
 * while a genuinely new line is still separated.
 */
function groupIntoRows(items: readonly RawItem[]): RawItem[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: RawItem[][] = [];
  let current: RawItem[] = [sorted[0]];

  for (const item of sorted.slice(1)) {
    const previous = current[current.length - 1];
    const tolerance = Math.max(2, Math.min(previous.height, item.height) * 0.5);
    if (Math.abs(item.y - previous.y) <= tolerance) current.push(item);
    else {
      rows.push(current);
      current = [item];
    }
  }
  rows.push(current);
  return rows;
}

/**
 * Splits a row into cells.
 *
 * PDFs frequently position every word separately, so a gap between items is
 * normal and cannot on its own mean a new cell. The threshold is set well
 * above a single space — about two-and-a-half characters — because that is the
 * narrowest gap a typesetter would use to separate columns and the widest a
 * word space realistically gets, even in justified text.
 */
function segmentsOfRow(items: readonly RawItem[]): Segment[] {
  const ordered = [...items].sort((a, b) => a.x - b.x);
  const segments: Segment[] = [];

  let text = ordered[0].str;
  let start = ordered[0].x;
  let end = ordered[0].x + ordered[0].width;

  for (const item of ordered.slice(1)) {
    const gap = item.x - end;
    const threshold = Math.max(item.height, 6) * 0.9;

    if (gap > threshold) {
      segments.push({ text: normalise(text), x: start, end });
      text = item.str;
      start = item.x;
    } else {
      // Restore the space the gap stood in for.
      const needsSpace = gap > item.height * 0.16 && !/\s$/.test(text) && !/^\s/.test(item.str);
      text += (needsSpace ? ' ' : '') + item.str;
    }
    end = item.x + item.width;
  }

  segments.push({ text: normalise(text), x: start, end });
  return segments.filter((segment) => segment.text.length > 0);
}

/**
 * Finds the page's column positions.
 *
 * Every cell's left edge is a vote. Edges within a few points of each other are
 * the same column — PDF coordinates are floating point and a column is rarely
 * aligned to the same hundredth of a point on every row. A cluster only becomes
 * a column once enough separate rows agree on it, which is what stops a single
 * indented paragraph from inventing one.
 */
function findColumns(rows: readonly Segment[][], support: number): number[] {
  const edges: number[] = [];
  for (const segments of rows) for (const segment of segments) edges.push(segment.x);
  if (!edges.length) return [];

  edges.sort((a, b) => a - b);

  const clusters: { sum: number; count: number; rows: Set<number> }[] = [];
  const tolerance = 8;

  rows.forEach((segments, rowIndex) => {
    for (const segment of segments) {
      const existing = clusters.find(
        (cluster) => Math.abs(cluster.sum / cluster.count - segment.x) <= tolerance,
      );
      if (existing) {
        existing.sum += segment.x;
        existing.count += 1;
        existing.rows.add(rowIndex);
      } else {
        clusters.push({ sum: segment.x, count: 1, rows: new Set([rowIndex]) });
      }
    }
  });

  const threshold = Math.max(2, Math.ceil(rows.length * support));
  const kept = clusters
    .filter((cluster) => cluster.rows.size >= threshold)
    .map((cluster) => cluster.sum / cluster.count)
    .sort((a, b) => a - b);

  // Two anchors that survived within a tolerance of each other describe one
  // column that drifted; collapse them so a value does not land in a phantom.
  const merged: number[] = [];
  for (const anchor of kept) {
    if (merged.length && anchor - merged[merged.length - 1] < tolerance) continue;
    merged.push(anchor);
  }
  return merged;
}

/** The last column starting at or before this cell, or the first one. */
function columnFor(x: number, anchors: readonly number[]): number {
  let index = 0;
  for (let i = 0; i < anchors.length; i++) {
    if (x >= anchors[i] - 8) index = i;
    else break;
  }
  return index;
}

const normalise = (text: string) => text.replace(/\s+/g, ' ').trim();

/**
 * Turns a cell into a number where that is unambiguous.
 *
 * Thousands separators and a trailing or leading currency symbol are stripped,
 * and accounting parentheses become a negative. Anything else stays text —
 * guessing wrong here silently corrupts a figure, which is worse than leaving
 * the recipient to format a column.
 */
function cell(text: string, coerce: boolean): TableCellValue {
  if (!coerce || !text) return text;

  const negative = /^\(.*\)$/.test(text);
  const stripped = text
    .replace(/^\(|\)$/g, '')
    .replace(/[\s ]/g, '')
    .replace(/^[$£€¥₹]/, '')
    .replace(/[$£€¥₹]$/, '')
    .replace(/,(?=\d{3}\b)/g, '');

  if (!/^-?\d+(\.\d+)?%?$/.test(stripped)) return text;
  // A percentage is a number with a unit; keep the unit rather than silently
  // changing 45% into 45.
  if (stripped.endsWith('%')) return text;

  const value = Number(stripped);
  if (!Number.isFinite(value)) return text;
  return negative ? -value : value;
}
