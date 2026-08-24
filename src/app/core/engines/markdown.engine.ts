import type { DocBlock, InlineRun, ListItem, TableCell } from './doc-model';

/**
 * Markdown support.
 *
 * `markdownToDocument` walks Marked's token stream directly rather than going
 * via HTML, which preserves table alignment, task lists and nesting that a
 * round-trip through the DOM would blur.
 */

export async function markdownToHtml(markdown: string): Promise<string> {
  const { marked } = await import('marked');
  const raw = await marked.parse(markdown, { gfm: true, breaks: false, async: true });
  return sanitizeHtml(raw);
}

/** Sanitises untrusted HTML before it is ever inserted into the page. */
export async function sanitizeHtml(html: string): Promise<string> {
  const DOMPurify = (await import('dompurify')).default;
  if (typeof window === 'undefined') return stripTags(html);
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'rel'],
    FORBID_TAGS: ['style', 'form', 'input', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'style'],
  });
}

/** Server-side fallback: no DOM, so drop markup rather than trusting it. */
function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

export async function markdownToDocument(markdown: string): Promise<DocBlock[]> {
  const { marked } = await import('marked');
  const tokens = marked.lexer(markdown, { gfm: true });
  return tokensToBlocks(tokens as MarkedToken[]);
}

/* Marked's token types are loosely modelled; this is the shape we rely on. */
interface MarkedToken {
  type: string;
  text?: string;
  raw?: string;
  depth?: number;
  ordered?: boolean;
  start?: number | '';
  lang?: string;
  href?: string;
  title?: string;
  align?: (string | null)[];
  header?: { text: string; tokens?: MarkedToken[] }[];
  rows?: { text: string; tokens?: MarkedToken[] }[][];
  items?: { text: string; task?: boolean; checked?: boolean; tokens?: MarkedToken[] }[];
  tokens?: MarkedToken[];
}

function tokensToBlocks(tokens: readonly MarkedToken[], level = 0): DocBlock[] {
  const blocks: DocBlock[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case 'heading':
        blocks.push({
          type: 'heading',
          level: Math.min(6, Math.max(1, token.depth ?? 1)) as 1,
          content: inline(token.tokens ?? [{ type: 'text', text: token.text ?? '' }]),
        });
        break;

      case 'paragraph':
        blocks.push({ type: 'paragraph', content: inline(token.tokens ?? []) });
        break;

      case 'text':
        if (token.tokens?.length) {
          blocks.push({ type: 'paragraph', content: inline(token.tokens) });
        } else if (token.text?.trim()) {
          blocks.push({ type: 'paragraph', content: [{ text: token.text }] });
        }
        break;

      case 'code':
        blocks.push({ type: 'code', text: token.text ?? '', language: token.lang || undefined });
        break;

      case 'blockquote':
        blocks.push({
          type: 'quote',
          content: inline(flattenInline(token.tokens ?? [])),
        });
        break;

      case 'hr':
        blocks.push({ type: 'divider' });
        break;

      case 'list': {
        const items: ListItem[] = [];
        for (const item of token.items ?? []) {
          const prefix: InlineRun[] = item.task
            ? [{ text: item.checked ? '[x] ' : '[ ] ', bold: true }]
            : [];
          const itemTokens = item.tokens ?? [];
          const inlineTokens = itemTokens.filter((t) => t.type === 'text' || t.type === 'paragraph');
          items.push({
            content: [...prefix, ...inline(flattenInline(inlineTokens))],
            level,
          });

          // Nested lists become deeper items in the same block.
          for (const nested of itemTokens) {
            if (nested.type === 'list') {
              const child = tokensToBlocks([nested], level + 1)[0];
              if (child?.type === 'list') items.push(...child.items);
            }
          }
        }
        blocks.push({ type: 'list', ordered: !!token.ordered, items });
        break;
      }

      case 'table': {
        const header: TableCell[] = (token.header ?? []).map((cell) =>
          inline(cell.tokens ?? [{ type: 'text', text: cell.text }]),
        );
        const rows = (token.rows ?? []).map((row) =>
          row.map((cell) => inline(cell.tokens ?? [{ type: 'text', text: cell.text }])),
        );
        blocks.push({
          type: 'table',
          header: header.map((cell) => cell.map((run) => ({ ...run, bold: true }))),
          rows,
          repeatHeader: true,
          align: (token.align ?? []).map((a) => (a === 'center' || a === 'right' ? a : 'left')),
        });
        break;
      }

      case 'space':
        break;

      case 'html': {
        const text = (token.text ?? '').trim();
        if (/^<hr\s*\/?>$/i.test(text)) blocks.push({ type: 'divider' });
        else if (/page[-\s]?break/i.test(text)) blocks.push({ type: 'pagebreak' });
        break;
      }

      default:
        if (token.tokens?.length) blocks.push(...tokensToBlocks(token.tokens, level));
        else if (token.text?.trim()) {
          blocks.push({ type: 'paragraph', content: [{ text: token.text }] });
        }
    }
  }

  return blocks;
}

/** Pulls the inline tokens out of paragraph-ish wrappers. */
function flattenInline(tokens: readonly MarkedToken[]): MarkedToken[] {
  const out: MarkedToken[] = [];
  for (const token of tokens) {
    if (token.type === 'paragraph' || token.type === 'text') {
      if (token.tokens?.length) out.push(...token.tokens);
      else if (token.text) out.push({ type: 'text', text: token.text });
    } else {
      out.push(token);
    }
  }
  return out;
}

function inline(tokens: readonly MarkedToken[], style: Omit<InlineRun, 'text'> = {}): InlineRun[] {
  const runs: InlineRun[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case 'strong':
        runs.push(...inline(token.tokens ?? [], { ...style, bold: true }));
        break;
      case 'em':
        runs.push(...inline(token.tokens ?? [], { ...style, italic: true }));
        break;
      case 'del':
        runs.push(...inline(token.tokens ?? [], { ...style, strike: true }));
        break;
      case 'codespan':
        runs.push({ ...style, code: true, text: decodeEntities(token.text ?? '') });
        break;
      case 'link':
        runs.push(
          ...inline(token.tokens ?? [{ type: 'text', text: token.text ?? '' }], {
            ...style,
            href: token.href,
          }),
        );
        break;
      case 'image':
        runs.push({ ...style, text: token.text ? `[${token.text}]` : '[image]', italic: true });
        break;
      case 'br':
        runs.push({ ...style, text: '\n' });
        break;
      case 'escape':
      case 'text':
      case 'html':
        if (token.tokens?.length) runs.push(...inline(token.tokens, style));
        else runs.push({ ...style, text: decodeEntities(token.text ?? '') });
        break;
      default:
        if (token.tokens?.length) runs.push(...inline(token.tokens, style));
        else if (token.text) runs.push({ ...style, text: decodeEntities(token.text) });
    }
  }

  return runs.filter((run) => run.text.length > 0);
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

function decodeEntities(text: string): string {
  return text.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (match) => ENTITIES[match] ?? match);
}

/** Extracts an outline for the markdown viewer's table of contents. */
export interface OutlineEntry {
  readonly level: number;
  readonly text: string;
  readonly id: string;
}

export function markdownOutline(blocks: readonly DocBlock[]): OutlineEntry[] {
  return blocks
    .filter((b): b is Extract<DocBlock, { type: 'heading' }> => b.type === 'heading')
    .map((heading) => {
      const text = heading.content.map((r) => r.text).join('');
      return {
        level: heading.level,
        text,
        id: text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, ''),
      };
    });
}
