import type { PDFDocument, PDFFont, PDFImage, PDFPage, RGB } from '@cantoo/pdf-lib';
import {
  DEFAULT_PAGE_OPTIONS,
  pageDimensions,
  type BlockAlign,
  type DocBlock,
  type DocMeta,
  type InlineRun,
  type PageOptions,
  type TableBlock,
  type TableCell,
} from './doc-model';
import { SITE } from '../site.config';

/**
 * Renders the document model onto real PDF pages.
 *
 * This is a genuine (if compact) layout engine: it wraps mixed bold/italic
 * runs, paginates lists and tables, repeats table headers across page breaks,
 * draws link annotations, and adds page numbers in a second pass once the
 * total page count is known.
 */

export interface PdfWriteOptions extends Partial<PageOptions> {
  readonly meta?: DocMeta;
}

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  boldItalic: PDFFont;
  mono: PDFFont;
  monoBold: PDFFont;
}

interface Ctx {
  pdf: PDFDocument;
  page: PDFPage;
  pages: PDFPage[];
  fonts: Fonts;
  options: PageOptions;
  pageWidth: number;
  pageHeight: number;
  /** Cursor measured from the bottom of the page, as PDF space is. */
  y: number;
  images: Map<string, { image: PDFImage; width: number; height: number }>;
  lib: typeof import('@cantoo/pdf-lib');
  dropped: number;
}

const HEADING_SIZES: Record<number, number> = { 1: 22, 2: 17, 3: 14.5, 4: 12.5, 5: 11.5, 6: 11 };
const HEADING_SPACE_BEFORE: Record<number, number> = { 1: 16, 2: 14, 3: 12, 4: 10, 5: 8, 6: 8 };

/** Characters WinAnsi can represent above U+00FF. */
const WIN_ANSI_HIGH = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152,
  0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a,
  0x0153, 0x017e, 0x0178,
]);

/**
 * Sensible ASCII stand-ins for characters the standard PDF fonts cannot draw.
 * Written as escapes so the source stays plain ASCII.
 */
const FALLBACK_PAIRS: readonly (readonly [number, string])[] = [
  [0x00a0, ' '], // no-break space
  [0x2009, ' '], // thin space
  [0x200a, ' '], // hair space
  [0x202f, ' '], // narrow no-break space
  [0x200b, ''], // zero-width space
  [0xfeff, ''], // byte-order mark
  [0x2212, '-'], // minus sign
  [0x2010, '-'],
  [0x2011, '-'],
  [0x2044, '/'], // fraction slash
  [0x2192, '->'],
  [0x2190, '<-'],
  [0x21d2, '=>'],
  [0x2264, '<='],
  [0x2265, '>='],
  [0x2260, '!='],
  [0x2713, 'v'], // check mark
  [0x2714, 'v'],
  [0x2717, 'x'],
  [0x25cf, '•'], // black circle -> bullet
  [0x25aa, '•'],
  [0x25a0, '•'],
  [0x2500, '-'], // box drawing
  [0x2502, '|'],
];

const FALLBACKS = new Map<string, string>(
  FALLBACK_PAIRS.map(([code, replacement]) => [String.fromCodePoint(code), replacement]),
);

let droppedCharacters = 0;

/**
 * The 14 standard PDF fonts use WinAnsi encoding, so scripts outside it — CJK,
 * Devanagari, emoji — cannot be drawn without embedding a font file. Rather
 * than throwing mid-document we substitute and count, so callers can warn the
 * user honestly instead of silently mangling their text.
 */
export function toWinAnsi(text: string): string {
  let out = '';
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 256 || WIN_ANSI_HIGH.has(code)) {
      out += char;
      continue;
    }
    const replacement = FALLBACKS.get(char);
    if (replacement !== undefined) {
      out += replacement;
      continue;
    }
    droppedCharacters++;
    out += '?';
  }
  return out;
}

/* ------------------------------------------------------------------
   Entry point
   ------------------------------------------------------------------ */

export interface PdfRenderResult {
  readonly blob: Blob;
  /** Characters that had to be substituted because of font encoding. */
  readonly droppedCharacters: number;
  readonly pageCount: number;
}

export async function renderDocumentToPdf(
  blocks: readonly DocBlock[],
  options: PdfWriteOptions = {},
): Promise<PdfRenderResult> {
  const lib = await import('@cantoo/pdf-lib');
  const resolved: PageOptions = { ...DEFAULT_PAGE_OPTIONS, ...options };
  droppedCharacters = 0;

  const pdf = await lib.PDFDocument.create();
  const [pageWidth, pageHeight] = pageDimensions(resolved);
  const fonts = await loadFonts(pdf, lib, resolved.font);

  // Images must be embedded before layout, because embedding is async and the
  // layout pass is deliberately synchronous.
  const images = await embedImages(pdf, blocks);

  const ctx: Ctx = {
    pdf,
    page: pdf.addPage([pageWidth, pageHeight]),
    pages: [],
    fonts,
    options: resolved,
    pageWidth,
    pageHeight,
    y: pageHeight - resolved.margin,
    images,
    lib,
    dropped: 0,
  };
  ctx.pages.push(ctx.page);
  drawRunningHeader(ctx);

  const contentWidth = pageWidth - resolved.margin * 2;
  for (const block of blocks) drawBlock(ctx, block, resolved.margin, contentWidth);

  if (resolved.pageNumbers || resolved.footerText) drawFooters(ctx);
  applyMeta(pdf, options.meta);

  const bytes = await pdf.save();
  return {
    blob: new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }),
    droppedCharacters,
    pageCount: ctx.pages.length,
  };
}

/* ------------------------------------------------------------------
   Fonts, pages, metadata
   ------------------------------------------------------------------ */

async function loadFonts(
  pdf: PDFDocument,
  lib: typeof import('@cantoo/pdf-lib'),
  family: PageOptions['font'],
): Promise<Fonts> {
  const { StandardFonts } = lib;
  const set =
    family === 'serif'
      ? [
          StandardFonts.TimesRoman,
          StandardFonts.TimesRomanBold,
          StandardFonts.TimesRomanItalic,
          StandardFonts.TimesRomanBoldItalic,
        ]
      : family === 'mono'
        ? [
            StandardFonts.Courier,
            StandardFonts.CourierBold,
            StandardFonts.CourierOblique,
            StandardFonts.CourierBoldOblique,
          ]
        : [
            StandardFonts.Helvetica,
            StandardFonts.HelveticaBold,
            StandardFonts.HelveticaOblique,
            StandardFonts.HelveticaBoldOblique,
          ];

  const [regular, bold, italic, boldItalic] = await Promise.all(set.map((f) => pdf.embedFont(f)));
  const [mono, monoBold] = await Promise.all([
    pdf.embedFont(StandardFonts.Courier),
    pdf.embedFont(StandardFonts.CourierBold),
  ]);
  return { regular, bold, italic, boldItalic, mono, monoBold };
}

function fontFor(fonts: Fonts, style: InlineRun): PDFFont {
  if (style.code) return style.bold ? fonts.monoBold : fonts.mono;
  if (style.bold && style.italic) return fonts.boldItalic;
  if (style.bold) return fonts.bold;
  if (style.italic) return fonts.italic;
  return fonts.regular;
}

function colorOf(ctx: Ctx, hex: string | undefined, fallback = '#111111'): RGB {
  const value = (hex ?? fallback).replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value.padEnd(6, '0').slice(0, 6);
  const int = Number.parseInt(full, 16);
  if (Number.isNaN(int)) return ctx.lib.rgb(0.07, 0.07, 0.09);
  return ctx.lib.rgb(((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255);
}

function newPage(ctx: Ctx): void {
  ctx.page = ctx.pdf.addPage([ctx.pageWidth, ctx.pageHeight]);
  ctx.pages.push(ctx.page);
  ctx.y = ctx.pageHeight - ctx.options.margin;
  drawRunningHeader(ctx);
}

function drawRunningHeader(ctx: Ctx): void {
  const text = ctx.options.headerText;
  if (!text) return;
  ctx.page.drawText(toWinAnsi(text), {
    x: ctx.options.margin,
    y: ctx.pageHeight - ctx.options.margin + 14,
    size: 8.5,
    font: ctx.fonts.regular,
    color: colorOf(ctx, '#888888'),
  });
}

function ensureSpace(ctx: Ctx, needed: number): void {
  if (ctx.y - needed < ctx.options.margin) newPage(ctx);
}

function drawFooters(ctx: Ctx): void {
  const total = ctx.pages.length;
  ctx.pages.forEach((page, index) => {
    const parts: string[] = [];
    if (ctx.options.footerText) parts.push(ctx.options.footerText);
    if (ctx.options.pageNumbers) parts.push(`Page ${index + 1} of ${total}`);
    const text = toWinAnsi(parts.join('   ·   '));
    if (!text) return;
    const width = safeWidth(ctx.fonts.regular, text, 8.5);
    page.drawText(text, {
      x: (ctx.pageWidth - width) / 2,
      y: Math.max(14, ctx.options.margin - 22),
      size: 8.5,
      font: ctx.fonts.regular,
      color: colorOf(ctx, '#888888'),
    });
  });
}

function applyMeta(pdf: PDFDocument, meta: DocMeta | undefined): void {
  try {
    pdf.setProducer(SITE.name);
    pdf.setCreator(meta?.creator ?? `${SITE.name} (client-side)`);
    if (meta?.title) pdf.setTitle(meta.title);
    if (meta?.author) pdf.setAuthor(meta.author);
    if (meta?.subject) pdf.setSubject(meta.subject);
    if (meta?.keywords?.length) pdf.setKeywords([...meta.keywords]);
    pdf.setCreationDate(new Date());
    pdf.setModificationDate(new Date());
  } catch {
    /* metadata is cosmetic; never fail an export over it */
  }
}

/* ------------------------------------------------------------------
   Inline layout
   ------------------------------------------------------------------ */

interface Token {
  text: string;
  style: InlineRun;
  width: number;
  space: boolean;
}

function safeWidth(font: PDFFont, text: string, size: number): number {
  try {
    return font.widthOfTextAtSize(text, size);
  } catch {
    return text.length * size * 0.5;
  }
}

function tokenise(ctx: Ctx, runs: readonly InlineRun[], size: number): Token[] {
  const tokens: Token[] = [];
  for (const style of runs) {
    const font = fontFor(ctx.fonts, style);
    const runSize = style.size ?? size;
    // Spaces become their own tokens so line breaking can drop them cleanly.
    for (const piece of toWinAnsi(style.text).split(/(\s+)/)) {
      if (!piece) continue;
      const isSpace = /^\s+$/.test(piece);
      const text = isSpace ? ' ' : piece;
      tokens.push({
        text,
        style: { ...style, size: runSize },
        width: safeWidth(font, text, runSize),
        space: isSpace,
      });
    }
  }
  return tokens;
}

interface Line {
  tokens: Token[];
  width: number;
}

function breakIntoLines(tokens: readonly Token[], maxWidth: number): Line[] {
  const lines: Line[] = [];
  let current: Token[] = [];
  let width = 0;

  const flush = (): void => {
    while (current.length && current[current.length - 1].space) {
      width -= current[current.length - 1].width;
      current.pop();
    }
    if (current.length) lines.push({ tokens: current, width });
    current = [];
    width = 0;
  };

  for (const token of tokens) {
    if (token.space && current.length === 0) continue;
    if (width + token.width > maxWidth && current.length) {
      flush();
      if (token.space) continue;
    }
    current.push(token);
    width += token.width;
  }
  flush();
  return lines;
}

interface TextOptions {
  size: number;
  lineHeight: number;
  align?: BlockAlign;
  color?: string;
  indent?: number;
}

/** Draws wrapped runs at the cursor, advancing it. Returns the height used. */
function drawRuns(
  ctx: Ctx,
  runs: readonly InlineRun[],
  x: number,
  maxWidth: number,
  options: TextOptions,
): number {
  const { size, lineHeight } = options;
  const lineStep = size * lineHeight;
  const indent = options.indent ?? 0;
  const lines = breakIntoLines(tokenise(ctx, runs, size), Math.max(24, maxWidth - indent));
  if (!lines.length) return 0;

  let used = 0;
  for (const line of lines) {
    ensureSpace(ctx, lineStep);
    const baseline = ctx.y - size;
    let cursorX = x + indent;
    const available = maxWidth - indent;

    if (options.align === 'center') cursorX += (available - line.width) / 2;
    else if (options.align === 'right') cursorX += available - line.width;

    for (const token of line.tokens) {
      if (!token.space) {
        const font = fontFor(ctx.fonts, token.style);
        const tokenSize = token.style.size ?? size;
        const color = colorOf(
          ctx,
          token.style.color ?? (token.style.href ? '#2b5fd9' : options.color),
        );

        ctx.page.drawText(token.text, { x: cursorX, y: baseline, size: tokenSize, font, color });

        if (token.style.underline || token.style.href) {
          ctx.page.drawLine({
            start: { x: cursorX, y: baseline - 1.6 },
            end: { x: cursorX + token.width, y: baseline - 1.6 },
            thickness: 0.5,
            color,
          });
        }
        if (token.style.strike) {
          ctx.page.drawLine({
            start: { x: cursorX, y: baseline + tokenSize * 0.28 },
            end: { x: cursorX + token.width, y: baseline + tokenSize * 0.28 },
            thickness: 0.5,
            color,
          });
        }
        if (token.style.href) {
          addLink(ctx, cursorX, baseline - 2, token.width, tokenSize + 3, token.style.href);
        }
      }
      cursorX += token.width;
    }

    ctx.y -= lineStep;
    used += lineStep;
  }
  return used;
}

function addLink(ctx: Ctx, x: number, y: number, width: number, height: number, uri: string): void {
  const { PDFName, PDFString, PDFArray, PDFNumber } = ctx.lib;
  try {
    const context = ctx.pdf.context;
    const rect = PDFArray.withContext(context);
    for (const value of [x, y, x + width, y + height]) rect.push(PDFNumber.of(value));

    const border = PDFArray.withContext(context);
    for (const value of [0, 0, 0]) border.push(PDFNumber.of(value));

    const annotation = context.obj({
      Type: PDFName.of('Annot'),
      Subtype: PDFName.of('Link'),
      Rect: rect,
      Border: border,
      A: context.obj({
        Type: PDFName.of('Action'),
        S: PDFName.of('URI'),
        URI: PDFString.of(uri),
      }),
    });

    const existing = ctx.page.node.lookup(PDFName.of('Annots'), PDFArray);
    if (existing) {
      existing.push(context.register(annotation));
    } else {
      const annots = PDFArray.withContext(context);
      annots.push(context.register(annotation));
      ctx.page.node.set(PDFName.of('Annots'), annots);
    }
  } catch {
    /* a missing link annotation must never fail the whole export */
  }
}

/* ------------------------------------------------------------------
   Block layout
   ------------------------------------------------------------------ */

function drawBlock(ctx: Ctx, block: DocBlock, x: number, width: number): void {
  const base = ctx.options.fontSize;
  const lineHeight = ctx.options.lineHeight;
  const scale = base / 11;

  switch (block.type) {
    case 'heading': {
      const size = HEADING_SIZES[block.level] * scale;
      ctx.y -= HEADING_SPACE_BEFORE[block.level] * scale;
      ensureSpace(ctx, size * 1.5);
      drawRuns(
        ctx,
        block.content.map((r) => ({ ...r, bold: true })),
        x,
        width,
        { size, lineHeight: 1.22, align: block.align, color: '#0d0f17' },
      );
      ctx.y -= 4;
      break;
    }

    case 'paragraph': {
      if (block.spaceBefore) ctx.y -= block.spaceBefore;
      drawRuns(ctx, block.content, x, width, {
        size: base,
        lineHeight,
        align: block.align,
        indent: block.indent,
      });
      ctx.y -= block.spaceAfter ?? base * 0.5;
      break;
    }

    case 'list': {
      const indent = 16;
      block.items.forEach((item, index) => {
        const level = item.level ?? 0;
        const marker = block.ordered ? `${index + 1}.` : level > 0 ? '◦' : '•';
        const markerX = x + level * indent;
        ensureSpace(ctx, base * lineHeight);
        ctx.page.drawText(toWinAnsi(marker), {
          x: markerX,
          y: ctx.y - base,
          size: base,
          font: ctx.fonts.regular,
          color: colorOf(ctx, '#555555'),
        });
        drawRuns(ctx, item.content, markerX + indent, width - level * indent - indent, {
          size: base,
          lineHeight,
        });
        ctx.y -= 2;
      });
      ctx.y -= base * 0.45;
      break;
    }

    case 'quote': {
      const top = ctx.y;
      const used = drawRuns(ctx, block.content, x + 14, width - 14, {
        size: base,
        lineHeight,
        color: '#4a4f5e',
      });
      // Only draw the rule when the quote stayed on one page.
      if (used > 0 && ctx.y < top) {
        ctx.page.drawRectangle({
          x,
          y: ctx.y,
          width: 2.5,
          height: Math.min(used, top - ctx.y),
          color: colorOf(ctx, '#c9cdd8'),
        });
      }
      ctx.y -= base * 0.6;
      break;
    }

    case 'code': {
      const size = base * 0.88;
      const step = size * 1.34;
      const padding = 8;
      const lines = block.text.replace(/\t/g, '    ').split('\n');

      for (const rawLine of lines) {
        for (const chunk of wrapMonospace(ctx, rawLine, size, width - padding * 2)) {
          ensureSpace(ctx, step);
          ctx.page.drawRectangle({
            x,
            y: ctx.y - step + 2,
            width,
            height: step,
            color: colorOf(ctx, '#f4f5f8'),
          });
          ctx.page.drawText(toWinAnsi(chunk), {
            x: x + padding,
            y: ctx.y - size,
            size,
            font: ctx.fonts.mono,
            color: colorOf(ctx, '#22262f'),
          });
          ctx.y -= step;
        }
      }
      ctx.y -= base * 0.6;
      break;
    }

    case 'table':
      drawTable(ctx, block, x, width);
      break;

    case 'image':
      drawImageBlock(ctx, block, x, width);
      break;

    case 'divider': {
      ensureSpace(ctx, 16);
      ctx.y -= 6;
      ctx.page.drawLine({
        start: { x, y: ctx.y },
        end: { x: x + width, y: ctx.y },
        thickness: 0.7,
        color: colorOf(ctx, '#d9dce4'),
      });
      ctx.y -= 10;
      break;
    }

    case 'pagebreak':
      newPage(ctx);
      break;

    case 'spacer':
      ctx.y -= block.height;
      if (ctx.y < ctx.options.margin) newPage(ctx);
      break;

    case 'columns': {
      const ratio = block.ratio ?? 0.5;
      const gap = 18;
      const leftWidth = (width - gap) * ratio;
      const rightWidth = width - gap - leftWidth;
      const startY = ctx.y;
      const startPage = ctx.pages.length;

      for (const child of block.left) drawBlock(ctx, child, x, leftWidth);
      const leftEnd = ctx.y;

      if (ctx.pages.length === startPage) {
        // Both columns started level, so rewind and lay the right one out too.
        ctx.y = startY;
        for (const child of block.right) drawBlock(ctx, child, x + leftWidth + gap, rightWidth);
        ctx.y = Math.min(leftEnd, ctx.y);
      } else {
        for (const child of block.right) drawBlock(ctx, child, x + leftWidth + gap, rightWidth);
      }
      break;
    }
  }
}

function wrapMonospace(ctx: Ctx, text: string, size: number, maxWidth: number): string[] {
  if (!text) return [''];
  const charWidth = safeWidth(ctx.fonts.mono, 'M', size) || size * 0.6;
  const perLine = Math.max(8, Math.floor(maxWidth / charWidth));
  const out: string[] = [];
  for (let i = 0; i < text.length; i += perLine) out.push(text.slice(i, i + perLine));
  return out;
}

/* ------------------------------------------------------------------
   Tables
   ------------------------------------------------------------------ */

function drawTable(ctx: Ctx, block: TableBlock, x: number, width: number): void {
  const base = ctx.options.fontSize * (block.compact ? 0.86 : 0.94);
  const padding = block.compact ? 4 : 6;
  const columnCount = Math.max(block.header?.length ?? 0, ...block.rows.map((r) => r.length), 1);

  const weights =
    block.widths && block.widths.length === columnCount
      ? [...block.widths]
      : estimateWeights(ctx, block, columnCount, base);
  const total = weights.reduce((sum, w) => sum + w, 0) || columnCount;
  const columnWidths = weights.map((w) => (w / total) * width);

  ctx.y -= 4;

  const drawRow = (cells: readonly TableCell[], isHeader: boolean): void => {
    const padded = [...cells];
    while (padded.length < columnCount) padded.push([]);

    const rowHeight =
      Math.max(
        base * 1.5,
        ...padded.map((cell, i) => measureCell(ctx, cell, columnWidths[i] - padding * 2, base)),
      ) +
      padding * 2;

    ensureSpace(ctx, rowHeight);
    const top = ctx.y;

    if (isHeader) {
      ctx.page.drawRectangle({
        x,
        y: top - rowHeight,
        width,
        height: rowHeight,
        color: colorOf(ctx, '#f1f2f6'),
      });
    }

    let cellX = x;
    padded.forEach((cell, index) => {
      const cellWidth = columnWidths[index];
      const saved = ctx.y;
      ctx.y = top - padding;
      drawRuns(ctx, cell, cellX + padding, cellWidth - padding * 2, {
        size: base,
        lineHeight: 1.32,
        align: block.align?.[index],
      });
      ctx.y = saved;

      ctx.page.drawRectangle({
        x: cellX,
        y: top - rowHeight,
        width: cellWidth,
        height: rowHeight,
        borderColor: colorOf(ctx, '#d9dce4'),
        borderWidth: 0.6,
      });
      cellX += cellWidth;
    });

    ctx.y = top - rowHeight;
  };

  if (block.header) drawRow(block.header, true);

  for (const row of block.rows) {
    const pagesBefore = ctx.pages.length;
    drawRow(row, false);
    if (block.repeatHeader && block.header && ctx.pages.length > pagesBefore) {
      // The row spilled onto a new page — repeat the header above it.
      const rowTop = ctx.y;
      ctx.y = ctx.pageHeight - ctx.options.margin;
      drawRow(block.header, true);
      const headerHeight = ctx.pageHeight - ctx.options.margin - ctx.y;
      ctx.y = rowTop - headerHeight;
    }
  }

  ctx.y -= 8;
}

function estimateWeights(ctx: Ctx, block: TableBlock, columnCount: number, size: number): number[] {
  const weights = new Array<number>(columnCount).fill(1);
  const sample = [...(block.header ? [block.header] : []), ...block.rows.slice(0, 60)];
  for (let column = 0; column < columnCount; column++) {
    let longest = 1;
    for (const row of sample) {
      const cell = row[column];
      if (!cell) continue;
      const text = cell.map((r) => r.text).join('');
      longest = Math.max(longest, safeWidth(ctx.fonts.regular, toWinAnsi(text), size));
    }
    weights[column] = Math.min(longest, 260) + 12;
  }
  return weights;
}

function measureCell(ctx: Ctx, cell: TableCell, maxWidth: number, size: number): number {
  const lines = breakIntoLines(tokenise(ctx, cell, size), Math.max(20, maxWidth));
  return Math.max(lines.length, 1) * size * 1.32;
}

/* ------------------------------------------------------------------
   Images
   ------------------------------------------------------------------ */

async function embedImages(
  pdf: PDFDocument,
  blocks: readonly DocBlock[],
): Promise<Map<string, { image: PDFImage; width: number; height: number }>> {
  const urls = new Set<string>();
  const collect = (list: readonly DocBlock[]): void => {
    for (const block of list) {
      if (block.type === 'image') urls.add(block.dataUrl);
      else if (block.type === 'columns') {
        collect(block.left);
        collect(block.right);
      }
    }
  };
  collect(blocks);

  const out = new Map<string, { image: PDFImage; width: number; height: number }>();
  for (const dataUrl of urls) {
    try {
      const isJpeg = /^data:image\/jpe?g/i.test(dataUrl);
      let usable = dataUrl;
      if (!isJpeg && !/^data:image\/png/i.test(dataUrl)) {
        // pdf-lib only embeds PNG and JPEG; re-encode anything else locally.
        const { convertDataUrl } = await import('./image.engine');
        usable = await convertDataUrl(dataUrl, 'image/png');
      }
      const bytes = new Uint8Array(await (await fetch(usable)).arrayBuffer());
      const image = /^data:image\/jpe?g/i.test(usable)
        ? await pdf.embedJpg(bytes)
        : await pdf.embedPng(bytes);
      out.set(dataUrl, { image, width: image.width, height: image.height });
    } catch {
      /* an unreadable image is skipped rather than aborting the export */
    }
  }
  return out;
}

function drawImageBlock(
  ctx: Ctx,
  block: Extract<DocBlock, { type: 'image' }>,
  x: number,
  containerWidth: number,
): void {
  const entry = ctx.images.get(block.dataUrl);
  if (!entry) return;

  const naturalWidth = block.width ?? entry.width;
  const naturalHeight = block.height ?? entry.height;
  const aspect = naturalHeight / naturalWidth;

  let drawWidth = Math.min(naturalWidth, containerWidth);
  let drawHeight = drawWidth * aspect;

  const maxHeight = ctx.pageHeight - ctx.options.margin * 2;
  if (drawHeight > maxHeight) {
    drawHeight = maxHeight;
    drawWidth = drawHeight / aspect;
  }

  ensureSpace(ctx, drawHeight + 10);

  const offset =
    block.align === 'center'
      ? (containerWidth - drawWidth) / 2
      : block.align === 'right'
        ? containerWidth - drawWidth
        : 0;

  ctx.page.drawImage(entry.image, {
    x: x + offset,
    y: ctx.y - drawHeight,
    width: drawWidth,
    height: drawHeight,
  });
  ctx.y -= drawHeight + 10;
}
