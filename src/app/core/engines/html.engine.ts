import type { BlockAlign, DocBlock, InlineRun, ListItem, TableCell } from './doc-model';

/**
 * HTML in, HTML out.
 *
 * Parsing uses the browser's own DOM parser inside an inert document, so no
 * script runs, no image or stylesheet is fetched, and untrusted markup is safe
 * to inspect. Serialising escapes every value it writes.
 */

const BLOCK_TAGS = new Set([
  'P',
  'DIV',
  'SECTION',
  'ARTICLE',
  'MAIN',
  'HEADER',
  'FOOTER',
  'ASIDE',
  'NAV',
  'FIGURE',
  'FIGCAPTION',
  'ADDRESS',
]);

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'HEAD', 'META', 'LINK', 'TEMPLATE']);

/* ------------------------------------------------------------------
   HTML -> document model
   ------------------------------------------------------------------ */

export function htmlToDocument(html: string): DocBlock[] {
  if (typeof DOMParser === 'undefined') return [];
  // `text/html` parses into an inert document: no scripts, no fetches.
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const root = doc.body ?? doc.documentElement;
  const blocks: DocBlock[] = [];
  walk(root, blocks);
  return blocks.filter(nonEmpty);
}

function nonEmpty(block: DocBlock): boolean {
  if (block.type === 'paragraph' || block.type === 'heading' || block.type === 'quote') {
    return block.content.some((run) => run.text.trim().length > 0);
  }
  if (block.type === 'list') return block.items.length > 0;
  if (block.type === 'table') return block.rows.length > 0 || !!block.header?.length;
  return true;
}

function walk(node: Node, out: DocBlock[]): void {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = (child.textContent ?? '').replace(/\s+/g, ' ');
      if (text.trim()) out.push({ type: 'paragraph', content: [{ text: text.trim() }] });
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;

    const element = child as HTMLElement;
    const tag = element.tagName;
    if (SKIP_TAGS.has(tag)) continue;

    switch (tag) {
      case 'H1':
      case 'H2':
      case 'H3':
      case 'H4':
      case 'H5':
      case 'H6':
        out.push({
          type: 'heading',
          level: Number(tag[1]) as 1,
          content: inlineRuns(element),
          align: alignOf(element),
        });
        break;

      case 'UL':
      case 'OL':
        out.push(listFrom(element, tag === 'OL', 0));
        break;

      case 'TABLE':
        out.push(tableFrom(element));
        break;

      case 'PRE':
        out.push({
          type: 'code',
          text: element.textContent ?? '',
          language: element.querySelector('code')?.className.replace(/^language-/, '') || undefined,
        });
        break;

      case 'BLOCKQUOTE':
        out.push({ type: 'quote', content: inlineRuns(element) });
        break;

      case 'HR':
        out.push({ type: 'divider' });
        break;

      case 'IMG': {
        const src = element.getAttribute('src') ?? '';
        // Only inline data URIs are kept — remote images are never fetched.
        if (src.startsWith('data:image/')) {
          out.push({
            type: 'image',
            dataUrl: src,
            alt: element.getAttribute('alt') ?? undefined,
            width: numberAttr(element, 'width'),
            height: numberAttr(element, 'height'),
          });
        }
        break;
      }

      case 'BR':
        break;

      default: {
        if (BLOCK_TAGS.has(tag)) {
          // A wrapper that only contains other blocks should not become a
          // paragraph of its own.
          if (hasBlockChildren(element)) {
            walk(element, out);
          } else {
            const runs = inlineRuns(element);
            if (runs.length) {
              out.push({ type: 'paragraph', content: runs, align: alignOf(element) });
            }
            // Pick up any images nested inside the wrapper.
            for (const image of Array.from(element.querySelectorAll('img'))) {
              const src = image.getAttribute('src') ?? '';
              if (src.startsWith('data:image/')) {
                out.push({ type: 'image', dataUrl: src, alt: image.alt || undefined });
              }
            }
          }
        } else {
          // Inline-level element at block position, e.g. a bare <span>.
          const runs = inlineRuns(element);
          if (runs.length) out.push({ type: 'paragraph', content: runs });
        }
      }
    }
  }
}

function hasBlockChildren(element: HTMLElement): boolean {
  return Array.from(element.children).some((child) =>
    ['P', 'DIV', 'UL', 'OL', 'TABLE', 'PRE', 'BLOCKQUOTE', 'HR', 'SECTION', 'ARTICLE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(
      child.tagName,
    ),
  );
}

function numberAttr(element: HTMLElement, name: string): number | undefined {
  const raw = element.getAttribute(name);
  const value = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(value) ? value : undefined;
}

function alignOf(element: HTMLElement): BlockAlign | undefined {
  const value = (element.style?.textAlign || element.getAttribute('align') || '').toLowerCase();
  return value === 'center' || value === 'right' || value === 'justify' ? value : undefined;
}

function listFrom(element: HTMLElement, ordered: boolean, level: number): DocBlock {
  const items: ListItem[] = [];
  for (const li of Array.from(element.children)) {
    if (li.tagName !== 'LI') continue;
    items.push({ content: inlineRuns(li as HTMLElement, true), level });

    // Flatten nested lists into the same block with a deeper level.
    for (const nested of Array.from(li.children)) {
      if (nested.tagName === 'UL' || nested.tagName === 'OL') {
        const child = listFrom(nested as HTMLElement, nested.tagName === 'OL', level + 1);
        if (child.type === 'list') items.push(...child.items);
      }
    }
  }
  return { type: 'list', ordered, items };
}

function tableFrom(element: HTMLElement): DocBlock {
  const rows = Array.from(element.querySelectorAll('tr'));
  let header: TableCell[] | undefined;
  const body: TableCell[][] = [];

  for (const row of rows) {
    const cells = Array.from(row.children).filter((c) => c.tagName === 'TD' || c.tagName === 'TH');
    const converted = cells.map((cell) => inlineRuns(cell as HTMLElement, true));
    const isHeader = cells.length > 0 && cells.every((c) => c.tagName === 'TH');
    if (isHeader && !header) header = converted;
    else body.push(converted);
  }

  return { type: 'table', header, rows: body, repeatHeader: true };
}

/** Mutable view of a run's styling while it is being accumulated. */
type RunStyle = {
  -readonly [K in keyof Omit<InlineRun, 'text'>]?: InlineRun[K];
};

/** Collects inline runs, carrying style down through nested elements. */
function inlineRuns(element: HTMLElement | Element, skipNestedLists = false): InlineRun[] {
  const runs: InlineRun[] = [];

  const visit = (node: Node, style: RunStyle): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? '').replace(/\s+/g, ' ');
      if (text) runs.push({ ...style, text });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;
    if (SKIP_TAGS.has(el.tagName)) return;
    if (skipNestedLists && (el.tagName === 'UL' || el.tagName === 'OL')) return;
    if (el.tagName === 'BR') {
      runs.push({ ...style, text: '\n' });
      return;
    }

    const next: RunStyle = { ...style };
    switch (el.tagName) {
      case 'STRONG':
      case 'B':
        next.bold = true;
        break;
      case 'EM':
      case 'I':
        next.italic = true;
        break;
      case 'U':
        next.underline = true;
        break;
      case 'S':
      case 'STRIKE':
      case 'DEL':
        next.strike = true;
        break;
      case 'CODE':
      case 'KBD':
      case 'SAMP':
        next.code = true;
        break;
      case 'A': {
        const href = el.getAttribute('href') ?? '';
        if (/^(https?:|mailto:|tel:)/i.test(href)) next.href = href;
        break;
      }
    }

    const color = el.style?.color;
    if (color) {
      const hex = cssColorToHex(color);
      if (hex) next.color = hex;
    }
    if (el.style?.fontWeight && Number(el.style.fontWeight) >= 600) next.bold = true;
    if (el.style?.fontStyle === 'italic') next.italic = true;

    for (const child of Array.from(el.childNodes)) visit(child, next);
  };

  for (const child of Array.from(element.childNodes)) visit(child, {});
  return mergeRuns(runs);
}

function mergeRuns(runs: InlineRun[]): InlineRun[] {
  const out: InlineRun[] = [];
  for (const run of runs) {
    if (!run.text) continue;
    const previous = out[out.length - 1];
    if (
      previous &&
      previous.bold === run.bold &&
      previous.italic === run.italic &&
      previous.underline === run.underline &&
      previous.strike === run.strike &&
      previous.code === run.code &&
      previous.href === run.href &&
      previous.color === run.color
    ) {
      out[out.length - 1] = { ...previous, text: previous.text + run.text };
    } else {
      out.push(run);
    }
  }
  return out;
}

function cssColorToHex(value: string): string | null {
  const rgb = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) {
    return (
      '#' +
      [rgb[1], rgb[2], rgb[3]]
        .map((n) => Number(n).toString(16).padStart(2, '0'))
        .join('')
    );
  }
  return /^#[0-9a-f]{3,6}$/i.test(value.trim()) ? value.trim() : null;
}

/* ------------------------------------------------------------------
   Document model -> HTML
   ------------------------------------------------------------------ */

export interface HtmlWriteOptions {
  /** Wrap in a full document with a stylesheet instead of a fragment. */
  readonly standalone?: boolean;
  readonly title?: string;
}

export function documentToHtml(
  blocks: readonly DocBlock[],
  options: HtmlWriteOptions = {},
): string {
  const body = blocks.map(blockToHtml).filter(Boolean).join('\n');
  if (!options.standalone) return body;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(options.title ?? 'Document')}</title>
<style>
:root { color-scheme: light dark; }
body {
  margin: 0 auto; padding: 2.5rem 1.25rem; max-width: 46rem;
  font: 16px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #16181f; background: #fff;
}
@media (prefers-color-scheme: dark) { body { color: #e9ebf2; background: #101218; } }
h1, h2, h3, h4 { line-height: 1.25; margin: 1.6em 0 .5em; }
p, ul, ol, table, pre, blockquote { margin: 0 0 1em; }
img { max-width: 100%; height: auto; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #d9dce4; padding: .45em .7em; text-align: left; }
th { background: #f1f2f6; }
pre { background: #f4f5f8; padding: 1em; overflow-x: auto; border-radius: 6px; }
code { font-family: ui-monospace, Consolas, monospace; font-size: .9em; }
blockquote { border-left: 3px solid #c9cdd8; margin-left: 0; padding-left: 1em; color: #555; }
hr { border: 0; border-top: 1px solid #d9dce4; margin: 2em 0; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

function blockToHtml(block: DocBlock): string {
  switch (block.type) {
    case 'heading':
      return `<h${block.level}${styleAttr(block.align)}>${runsToHtml(block.content)}</h${block.level}>`;

    case 'paragraph':
      return `<p${styleAttr(block.align)}>${runsToHtml(block.content)}</p>`;

    case 'list': {
      const tag = block.ordered ? 'ol' : 'ul';
      const items = block.items
        .map((item) => `  <li>${runsToHtml(item.content)}</li>`)
        .join('\n');
      return `<${tag}>\n${items}\n</${tag}>`;
    }

    case 'quote':
      return `<blockquote>${runsToHtml(block.content)}</blockquote>`;

    case 'code':
      return `<pre><code${
        block.language ? ` class="language-${escapeHtml(block.language)}"` : ''
      }>${escapeHtml(block.text)}</code></pre>`;

    case 'table': {
      const head = block.header
        ? `<thead><tr>${block.header.map((c) => `<th>${runsToHtml(c)}</th>`).join('')}</tr></thead>`
        : '';
      const body = block.rows
        .map((row) => `<tr>${row.map((c) => `<td>${runsToHtml(c)}</td>`).join('')}</tr>`)
        .join('\n');
      return `<table>${head}<tbody>\n${body}\n</tbody></table>`;
    }

    case 'image':
      return `<p${styleAttr(block.align)}><img src="${escapeHtml(block.dataUrl)}" alt="${escapeHtml(
        block.alt ?? '',
      )}"${block.width ? ` width="${block.width}"` : ''}></p>`;

    case 'divider':
      return '<hr>';

    case 'pagebreak':
      return '<div style="page-break-after:always"></div>';

    case 'spacer':
      return `<div style="height:${block.height}px"></div>`;

    case 'columns':
      return `<div style="display:flex;gap:1.5rem">
<div style="flex:${block.ratio ?? 0.5}">${block.left.map(blockToHtml).join('\n')}</div>
<div style="flex:${1 - (block.ratio ?? 0.5)}">${block.right.map(blockToHtml).join('\n')}</div>
</div>`;

    default:
      return '';
  }
}

function styleAttr(align: BlockAlign | undefined): string {
  return align && align !== 'left' ? ` style="text-align:${align}"` : '';
}

function runsToHtml(runs: readonly InlineRun[]): string {
  return runs
    .map((run) => {
      let html = escapeHtml(run.text).replace(/\n/g, '<br>');
      if (run.code) html = `<code>${html}</code>`;
      if (run.bold) html = `<strong>${html}</strong>`;
      if (run.italic) html = `<em>${html}</em>`;
      if (run.underline) html = `<u>${html}</u>`;
      if (run.strike) html = `<s>${html}</s>`;
      if (run.color) html = `<span style="color:${escapeHtml(run.color)}">${html}</span>`;
      if (run.href) {
        html = `<a href="${escapeHtml(run.href)}" rel="noopener noreferrer">${html}</a>`;
      }
      return html;
    })
    .join('');
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ------------------------------------------------------------------
   Document model -> Markdown
   ------------------------------------------------------------------ */

export function documentToMarkdown(blocks: readonly DocBlock[]): string {
  const parts: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case 'heading':
        parts.push(`${'#'.repeat(block.level)} ${runsToMarkdown(block.content)}`);
        break;
      case 'paragraph':
        parts.push(runsToMarkdown(block.content));
        break;
      case 'list':
        parts.push(
          block.items
            .map((item, index) => {
              const indent = '  '.repeat(item.level ?? 0);
              const marker = block.ordered ? `${index + 1}.` : '-';
              return `${indent}${marker} ${runsToMarkdown(item.content)}`;
            })
            .join('\n'),
        );
        break;
      case 'quote':
        parts.push(
          runsToMarkdown(block.content)
            .split('\n')
            .map((line) => `> ${line}`)
            .join('\n'),
        );
        break;
      case 'code':
        parts.push(`\`\`\`${block.language ?? ''}\n${block.text}\n\`\`\``);
        break;
      case 'table': {
        const header = block.header ?? [];
        const columnCount = Math.max(header.length, ...block.rows.map((r) => r.length), 1);
        const headerCells =
          header.length > 0
            ? header.map((c) => runsToMarkdown(c))
            : Array.from({ length: columnCount }, () => ' ');
        const lines = [
          `| ${headerCells.join(' | ')} |`,
          `| ${headerCells.map(() => '---').join(' | ')} |`,
          ...block.rows.map((row) => {
            const cells = [...row.map((c) => runsToMarkdown(c))];
            while (cells.length < columnCount) cells.push('');
            return `| ${cells.join(' | ')} |`;
          }),
        ];
        parts.push(lines.join('\n'));
        break;
      }
      case 'image':
        parts.push(`![${block.alt ?? ''}](${block.dataUrl})`);
        break;
      case 'divider':
        parts.push('---');
        break;
      case 'pagebreak':
        parts.push('<!-- page break -->');
        break;
      case 'columns':
        parts.push(documentToMarkdown([...block.left, ...block.right]));
        break;
    }
  }

  return parts.filter(Boolean).join('\n\n') + '\n';
}

function runsToMarkdown(runs: readonly InlineRun[]): string {
  return runs
    .map((run) => {
      let text = run.text.replace(/([*_`[\]])/g, '\\$1');
      if (run.code) text = `\`${run.text}\``;
      if (run.bold && run.italic) text = `***${text}***`;
      else if (run.bold) text = `**${text}**`;
      else if (run.italic) text = `*${text}*`;
      if (run.strike) text = `~~${text}~~`;
      if (run.href) text = `[${text}](${run.href})`;
      return text;
    })
    .join('');
}

export function htmlToMarkdown(html: string): string {
  return documentToMarkdown(htmlToDocument(html));
}
