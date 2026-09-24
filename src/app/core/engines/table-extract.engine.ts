import type { PDFDocumentProxy } from 'pdfjs-dist';
import { closePdf, openPdf } from './pdfjs.engine';

interface RawItem {
  readonly str: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface Segment {
  readonly text: string;
  readonly x: number;
  readonly end: number;
}

export interface TableExtractOptions {
  readonly columnSupport?: number;
  readonly dropEmptyRows?: boolean;
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
  readonly singleColumn: boolean;
}

export interface TableExtractResult {
  readonly pages: ExtractedPage[];
  readonly pageCount: number;
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
      const needsSpace = gap > item.height * 0.16 && !/\s$/.test(text) && !/^\s/.test(item.str);
      text += (needsSpace ? ' ' : '') + item.str;
    }
    end = item.x + item.width;
  }

  segments.push({ text: normalise(text), x: start, end });
  return segments.filter((segment) => segment.text.length > 0);
}

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

  const merged: number[] = [];
  for (const anchor of kept) {
    if (merged.length && anchor - merged[merged.length - 1] < tolerance) continue;
    merged.push(anchor);
  }
  return merged;
}

function columnFor(x: number, anchors: readonly number[]): number {
  let index = 0;
  for (let i = 0; i < anchors.length; i++) {
    if (x >= anchors[i] - 8) index = i;
    else break;
  }
  return index;
}

const normalise = (text: string) => text.replace(/\s+/g, ' ').trim();

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
  if (stripped.endsWith('%')) return text;

  const value = Number(stripped);
  if (!Number.isFinite(value)) return text;
  return negative ? -value : value;
}
