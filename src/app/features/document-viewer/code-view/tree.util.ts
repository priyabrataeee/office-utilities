/**
 * Flattens JSON and XML into a list of rows.
 *
 * A flat list with an explicit depth renders and virtualises far better than a
 * recursive component tree, and collapsing becomes a filter rather than a
 * re-render of the whole subtree.
 */

export type TreeValueKind =
  | 'object'
  | 'array'
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'element'
  | 'attribute'
  | 'text';

export interface TreeRow {
  readonly id: string;
  readonly depth: number;
  readonly key: string;
  readonly kind: TreeValueKind;
  /** Rendered scalar value, empty for containers. */
  readonly value: string;
  /** Number of direct children, for the "3 items" hint. */
  readonly childCount: number;
  readonly hasChildren: boolean;
  /** Path used as the collapse key and for "copy path". */
  readonly path: string;
}

export function flattenJson(value: unknown, rootKey = 'root'): TreeRow[] {
  const rows: TreeRow[] = [];

  const walk = (node: unknown, key: string, depth: number, path: string): void => {
    const kind = kindOf(node);
    const isContainer = kind === 'object' || kind === 'array';
    const entries = isContainer
      ? Array.isArray(node)
        ? (node as unknown[]).map((item, index) => [String(index), item] as const)
        : Object.entries(node as Record<string, unknown>)
      : [];

    rows.push({
      id: path,
      depth,
      key,
      kind,
      value: isContainer ? '' : renderScalar(node),
      childCount: entries.length,
      hasChildren: entries.length > 0,
      path,
    });

    for (const [childKey, childValue] of entries) {
      walk(childValue, childKey, depth + 1, `${path}.${childKey}`);
    }
  };

  walk(value, rootKey, 0, '$');
  return rows;
}

function kindOf(value: unknown): TreeValueKind {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  switch (typeof value) {
    case 'object':
      return 'object';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    default:
      return 'string';
  }
}

function renderScalar(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  return String(value);
}

export function flattenXml(doc: Document): TreeRow[] {
  const rows: TreeRow[] = [];

  const walk = (node: Element, depth: number, path: string): void => {
    const attributes = Array.from(node.attributes);
    const elementChildren = Array.from(node.children);
    const ownText = Array.from(node.childNodes)
      .filter((child) => child.nodeType === Node.TEXT_NODE)
      .map((child) => child.textContent ?? '')
      .join('')
      .trim();

    rows.push({
      id: path,
      depth,
      key: node.tagName,
      kind: 'element',
      value: elementChildren.length === 0 ? ownText : '',
      childCount: elementChildren.length + attributes.length,
      hasChildren: elementChildren.length + attributes.length > 0,
      path,
    });

    attributes.forEach((attribute, index) => {
      rows.push({
        id: `${path}@${index}`,
        depth: depth + 1,
        key: `@${attribute.name}`,
        kind: 'attribute',
        value: attribute.value,
        childCount: 0,
        hasChildren: false,
        path: `${path}@${attribute.name}`,
      });
    });

    elementChildren.forEach((child, index) => {
      walk(child, depth + 1, `${path}/${child.tagName}[${index}]`);
    });
  };

  if (doc.documentElement) walk(doc.documentElement, 0, `/${doc.documentElement.tagName}`);
  return rows;
}

/**
 * Hides rows whose ancestor is collapsed.
 *
 * A row is hidden when any collapsed path is a strict prefix of its own — one
 * pass, no tree walking.
 */
export function visibleRows(rows: readonly TreeRow[], collapsed: ReadonlySet<string>): TreeRow[] {
  if (!collapsed.size) return [...rows];

  const out: TreeRow[] = [];
  let skipPrefix: string | null = null;

  for (const row of rows) {
    if (skipPrefix !== null) {
      if (isDescendant(row.path, skipPrefix)) continue;
      skipPrefix = null;
    }
    out.push(row);
    if (collapsed.has(row.path) && row.hasChildren) skipPrefix = row.path;
  }

  return out;
}

function isDescendant(path: string, ancestor: string): boolean {
  return path.length > ancestor.length && path.startsWith(ancestor);
}

/** Pretty-prints XML with indentation. */
export function formatXml(xml: string, indent = '  '): string {
  const withBreaks = xml
    .replace(/\r?\n\s*/g, '')
    .replace(/>(<)/g, '>\n<')
    .split('\n');

  let depth = 0;
  return withBreaks
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (/^<\/.+>$/.test(trimmed)) depth = Math.max(0, depth - 1);
      const result = indent.repeat(depth) + trimmed;
      // Opening tags that are not self-closing or immediately closed nest.
      if (/^<[^!?/][^>]*[^/]>$/.test(trimmed) && !/^<.+<\/.+>$/.test(trimmed)) depth++;
      return result;
    })
    .filter(Boolean)
    .join('\n');
}
