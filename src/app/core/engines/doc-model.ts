/**
 * The intermediate document model.
 *
 * Word, Markdown, HTML, spreadsheets and the document generators all convert
 * into these blocks, and the PDF, DOCX and HTML writers all consume them. That
 * keeps N input formats × M output formats down to N + M pieces of code
 * instead of N × M.
 */

export interface InlineRun {
  readonly text: string;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly underline?: boolean;
  readonly strike?: boolean;
  readonly code?: boolean;
  /** Absolute or relative URL; rendered as a link in every writer. */
  readonly href?: string;
  /** Hex colour, e.g. `#333333`. */
  readonly color?: string;
  /** Point size override for this run. */
  readonly size?: number;
}

export type BlockAlign = 'left' | 'center' | 'right' | 'justify';

export interface HeadingBlock {
  readonly type: 'heading';
  readonly level: 1 | 2 | 3 | 4 | 5 | 6;
  readonly content: readonly InlineRun[];
  readonly align?: BlockAlign;
}

export interface ParagraphBlock {
  readonly type: 'paragraph';
  readonly content: readonly InlineRun[];
  readonly align?: BlockAlign;
  /** Extra space before the paragraph, in points. */
  readonly spaceBefore?: number;
  readonly spaceAfter?: number;
  readonly indent?: number;
}

export interface ListItem {
  readonly content: readonly InlineRun[];
  /** 0-based nesting depth. */
  readonly level?: number;
}

export interface ListBlock {
  readonly type: 'list';
  readonly ordered: boolean;
  readonly items: readonly ListItem[];
}

export type TableCell = readonly InlineRun[];

export interface TableBlock {
  readonly type: 'table';
  readonly header?: readonly TableCell[];
  readonly rows: readonly (readonly TableCell[])[];
  /** Relative column weights; normalised by the writers. */
  readonly widths?: readonly number[];
  readonly align?: readonly BlockAlign[];
  /** Repeat the header on every page in PDF output. */
  readonly repeatHeader?: boolean;
  readonly compact?: boolean;
}

export interface ImageBlock {
  readonly type: 'image';
  /** `data:` URL — the writers never fetch over the network. */
  readonly dataUrl: string;
  readonly width?: number;
  readonly height?: number;
  readonly alt?: string;
  readonly align?: BlockAlign;
}

export interface CodeBlock {
  readonly type: 'code';
  readonly text: string;
  readonly language?: string;
}

export interface QuoteBlock {
  readonly type: 'quote';
  readonly content: readonly InlineRun[];
}

export interface DividerBlock {
  readonly type: 'divider';
}

export interface PageBreakBlock {
  readonly type: 'pagebreak';
}

export interface SpacerBlock {
  readonly type: 'spacer';
  readonly height: number;
}

/** Two independently-flowing columns, used by letterheads and invoices. */
export interface ColumnsBlock {
  readonly type: 'columns';
  readonly left: readonly DocBlock[];
  readonly right: readonly DocBlock[];
  /** Left column share, 0–1. Defaults to 0.5. */
  readonly ratio?: number;
}

export type DocBlock =
  | HeadingBlock
  | ParagraphBlock
  | ListBlock
  | TableBlock
  | ImageBlock
  | CodeBlock
  | QuoteBlock
  | DividerBlock
  | PageBreakBlock
  | SpacerBlock
  | ColumnsBlock;

export interface DocMeta {
  readonly title?: string;
  readonly author?: string;
  readonly subject?: string;
  readonly keywords?: readonly string[];
  readonly creator?: string;
}

export interface DocDocument {
  readonly blocks: readonly DocBlock[];
  readonly meta?: DocMeta;
}

/* ------------------------------------------------------------------
   Page geometry
   ------------------------------------------------------------------ */

export type PageSizeName = 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal' | 'Tabloid';

export const PAGE_SIZES: Record<PageSizeName, readonly [number, number]> = {
  A3: [841.89, 1190.55],
  A4: [595.28, 841.89],
  A5: [419.53, 595.28],
  Letter: [612, 792],
  Legal: [612, 1008],
  Tabloid: [792, 1224],
};

export type FontFamily = 'sans' | 'serif' | 'mono';

export interface PageOptions {
  readonly size: PageSizeName;
  readonly orientation: 'portrait' | 'landscape';
  /** Margins in points. */
  readonly margin: number;
  readonly font: FontFamily;
  readonly fontSize: number;
  readonly lineHeight: number;
  /** Adds "Page n of m" at the bottom. */
  readonly pageNumbers: boolean;
  readonly headerText?: string;
  readonly footerText?: string;
}

export const DEFAULT_PAGE_OPTIONS: PageOptions = {
  size: 'A4',
  orientation: 'portrait',
  margin: 56,
  font: 'sans',
  fontSize: 11,
  lineHeight: 1.42,
  pageNumbers: false,
};

export function pageDimensions(options: Pick<PageOptions, 'size' | 'orientation'>): [number, number] {
  const [width, height] = PAGE_SIZES[options.size];
  return options.orientation === 'landscape' ? [height, width] : [width, height];
}

/* ------------------------------------------------------------------
   Small builders — they make generator templates far easier to read
   ------------------------------------------------------------------ */

export function run(text: string, style: Omit<InlineRun, 'text'> = {}): InlineRun {
  return { text, ...style };
}

export function para(
  text: string | readonly InlineRun[],
  style: Omit<ParagraphBlock, 'type' | 'content'> = {},
): ParagraphBlock {
  return {
    type: 'paragraph',
    content: typeof text === 'string' ? [run(text)] : text,
    ...style,
  };
}

export function heading(
  level: HeadingBlock['level'],
  text: string | readonly InlineRun[],
  align?: BlockAlign,
): HeadingBlock {
  return {
    type: 'heading',
    level,
    content: typeof text === 'string' ? [run(text)] : text,
    align,
  };
}

export function bullets(items: readonly (string | readonly InlineRun[])[]): ListBlock {
  return {
    type: 'list',
    ordered: false,
    items: items.map((item) => ({
      content: typeof item === 'string' ? [run(item)] : item,
    })),
  };
}

export function numbered(items: readonly (string | readonly InlineRun[])[]): ListBlock {
  return { ...bullets(items), ordered: true };
}

export function table(
  header: readonly string[],
  rows: readonly (readonly (string | InlineRun)[])[],
  options: Omit<TableBlock, 'type' | 'header' | 'rows'> = {},
): TableBlock {
  const toCell = (value: string | InlineRun): TableCell =>
    typeof value === 'string' ? [run(value)] : [value];
  return {
    type: 'table',
    header: header.map((h) => [run(h, { bold: true })]),
    rows: rows.map((row) => row.map(toCell)),
    repeatHeader: true,
    ...options,
  };
}

export const divider: DividerBlock = { type: 'divider' };
export const pageBreak: PageBreakBlock = { type: 'pagebreak' };

export function spacer(height: number): SpacerBlock {
  return { type: 'spacer', height };
}

/** Flattens a block's inline content to plain text (used for word counts). */
export function blockText(block: DocBlock): string {
  switch (block.type) {
    case 'heading':
    case 'paragraph':
    case 'quote':
      return block.content.map((r) => r.text).join('');
    case 'list':
      return block.items.map((i) => i.content.map((r) => r.text).join('')).join('\n');
    case 'table':
      return [...(block.header ? [block.header] : []), ...block.rows]
        .map((row) => row.map((cell) => cell.map((r) => r.text).join('')).join('\t'))
        .join('\n');
    case 'code':
      return block.text;
    case 'columns':
      return [...block.left, ...block.right].map(blockText).join('\n');
    default:
      return '';
  }
}

export function documentText(blocks: readonly DocBlock[]): string {
  return blocks.map(blockText).filter(Boolean).join('\n\n');
}
