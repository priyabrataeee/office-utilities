import {
  centreOf,
  edgeMidpoint,
  edgePath,
  shapePath,
  type Diagram,
  type DiagramEdge,
  type DiagramNode,
} from './diagram.model';

/**
 * Serialises a diagram to standalone SVG.
 *
 * The live canvas is an Angular template because it has to be interactive;
 * this is the export path, and it produces clean markup with no framework
 * attributes — which is what makes the SVG usable in other tools and what the
 * PNG rasteriser consumes.
 */

export interface SvgOptions {
  /** Blank margin around the content, in units. */
  readonly padding?: number;
  /** Crop to the content instead of using the full canvas. */
  readonly trim?: boolean;
  readonly background?: string;
}

export function diagramToSvg(diagram: Diagram, options: SvgOptions = {}): string {
  const padding = options.padding ?? 24;
  const bounds = options.trim === false ? fullBounds(diagram) : contentBounds(diagram, padding);

  const nodes = [...diagram.nodes].sort((a, b) => (a.z ?? 1) - (b.z ?? 1));
  const byId = new Map(diagram.nodes.map((node) => [node.id, node]));

  const parts: string[] = [];
  parts.push(defs());

  const background = options.background ?? diagram.background;
  if (background && background !== 'transparent') {
    parts.push(
      `<rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" fill="${background}"/>`,
    );
  }

  for (const edge of diagram.edges) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) continue;
    parts.push(renderEdge(edge, from, to));
  }

  for (const node of nodes) parts.push(renderNode(node));

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${Math.round(bounds.width)}" height="${Math.round(bounds.height)}" ` +
    `viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}" ` +
    `font-family="Inter, Segoe UI, system-ui, sans-serif">` +
    parts.join('') +
    `</svg>`
  );
}

function defs(): string {
  const marker = (id: string, path: string, filled: boolean): string =>
    `<marker id="${id}" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="9" markerHeight="9" ` +
    `orient="auto-start-reverse"><path d="${path}" fill="${filled ? 'context-stroke' : '#ffffff'}" ` +
    `stroke="context-stroke" stroke-width="1"/></marker>`;

  return (
    '<defs>' +
    marker('ou-arrow', 'M 1 2 L 11 6 L 1 10 z', true) +
    marker('ou-triangle', 'M 1 1 L 11 6 L 1 11 z', false) +
    marker('ou-diamond', 'M 6 1 L 11 6 L 6 11 L 1 6 z', false) +
    marker('ou-circle', 'M 3 6 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0', false) +
    '</defs>'
  );
}

function markerFor(head: DiagramEdge['startArrow']): string {
  switch (head) {
    case 'arrow':
      return 'url(#ou-arrow)';
    case 'triangle':
      return 'url(#ou-triangle)';
    case 'diamond':
      return 'url(#ou-diamond)';
    case 'circle':
      return 'url(#ou-circle)';
    default:
      return '';
  }
}

function renderEdge(edge: DiagramEdge, from: DiagramNode, to: DiagramNode): string {
  const path = edgePath(edge, from, to);
  const start = markerFor(edge.startArrow);
  const end = markerFor(edge.endArrow);

  const line =
    `<path d="${path}" fill="none" stroke="${edge.stroke}" stroke-width="1.6" ` +
    `${edge.dashed ? 'stroke-dasharray="6 4" ' : ''}` +
    `${start ? `marker-start="${start}" ` : ''}` +
    `${end ? `marker-end="${end}" ` : ''}/>`;

  if (!edge.label) return line;

  const mid = edgeMidpoint(from, to);
  const width = edge.label.length * 6.4 + 10;
  return (
    line +
    `<rect x="${mid.x - width / 2}" y="${mid.y - 10}" width="${width}" height="19" rx="4" fill="#ffffff" opacity="0.92"/>` +
    `<text x="${mid.x}" y="${mid.y + 4}" text-anchor="middle" font-size="11" fill="#52607a">` +
    `${escapeXml(edge.label)}</text>`
  );
}

function renderNode(node: DiagramNode): string {
  const body = renderShape(node);
  const label = renderLabel(node);
  return `<g>${body}${label}</g>`;
}

function renderShape(node: DiagramNode): string {
  const { x, y, width: w, height: h, fill, stroke } = node;
  const common = `fill="${fill}" stroke="${stroke}" stroke-width="1.6"`;

  switch (node.kind) {
    case 'ellipse':
      return `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" ${common}/>`;

    case 'rounded':
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" ${common}/>`;

    case 'container':
      return (
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${fill}" ` +
        `stroke="${stroke}" stroke-width="1.4" stroke-dasharray="8 5"/>`
      );

    case 'cylinder': {
      const ry = Math.min(16, h * 0.18);
      return (
        `<path d="M ${x} ${y + ry} a ${w / 2} ${ry} 0 0 1 ${w} 0 v ${h - ry * 2} ` +
        `a ${w / 2} ${ry} 0 0 1 ${-w} 0 z" ${common}/>` +
        `<path d="M ${x} ${y + ry} a ${w / 2} ${ry} 0 0 0 ${w} 0" fill="none" stroke="${stroke}" stroke-width="1.4"/>`
      );
    }

    case 'cloud': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      return (
        `<path d="M ${x + w * 0.24} ${y + h * 0.82} a ${h * 0.26} ${h * 0.26} 0 0 1 ${-h * 0.04} ${-h * 0.52} ` +
        `a ${h * 0.34} ${h * 0.34} 0 0 1 ${w * 0.34} ${-h * 0.26} a ${h * 0.28} ${h * 0.28} 0 0 1 ${w * 0.4} ${h * 0.16} ` +
        `a ${h * 0.25} ${h * 0.25} 0 0 1 ${-w * 0.04} ${h * 0.62} z" ${common}/>` +
        `<!-- centre ${cx},${cy} -->`
      );
    }

    case 'actor': {
      const cx = x + w / 2;
      const headR = Math.min(14, w * 0.18);
      const top = y + headR + 4;
      return (
        `<circle cx="${cx}" cy="${top}" r="${headR}" ${common}/>` +
        `<path d="M ${cx} ${top + headR} v ${h * 0.3} M ${cx - w * 0.3} ${top + headR + h * 0.1} ` +
        `h ${w * 0.6} M ${cx} ${top + headR + h * 0.3} l ${-w * 0.25} ${h * 0.28} ` +
        `M ${cx} ${top + headR + h * 0.3} l ${w * 0.25} ${h * 0.28}" fill="none" stroke="${stroke}" stroke-width="1.8"/>`
      );
    }

    case 'record': {
      const headerHeight = 30;
      return (
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" ${common}/>` +
        `<line x1="${x}" y1="${y + headerHeight}" x2="${x + w}" y2="${y + headerHeight}" stroke="${stroke}" stroke-width="1.4"/>`
      );
    }

    case 'text':
      return '';

    default: {
      const path = shapePath(node);
      if (path) {
        return `<path d="${path}" transform="translate(${x} ${y})" ${common}/>`;
      }
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" ${common}/>`;
    }
  }
}

function renderLabel(node: DiagramNode): string {
  const lines = node.text ? node.text.split('\n') : [];
  const parts: string[] = [];

  if (node.kind === 'record') {
    const headerY = node.y + 20;
    parts.push(
      `<text x="${node.x + node.width / 2}" y="${headerY}" text-anchor="middle" ` +
        `font-size="${node.fontSize}" font-weight="700" fill="${node.textColor}">` +
        `${escapeXml(lines.join(' '))}</text>`,
    );
    (node.rows ?? []).forEach((row, index) => {
      parts.push(
        `<text x="${node.x + 10}" y="${node.y + 48 + index * 17}" font-size="${node.fontSize - 1}" ` +
          `fill="${node.textColor}" font-family="ui-monospace, Consolas, monospace">${escapeXml(row)}</text>`,
      );
    });
    return parts.join('');
  }

  if (!lines.length) return '';

  // Containers label their top-left corner; everything else centres.
  if (node.kind === 'container') {
    return (
      `<text x="${node.x + 12}" y="${node.y + 22}" font-size="${node.fontSize}" font-weight="700" ` +
      `fill="${node.textColor}">${escapeXml(lines[0])}</text>`
    );
  }

  const centre = centreOf(node);
  const lineHeight = node.fontSize * 1.35;
  const startY = centre.y - ((lines.length - 1) * lineHeight) / 2 + node.fontSize * 0.35;

  return lines
    .map(
      (line, index) =>
        `<text x="${centre.x}" y="${startY + index * lineHeight}" text-anchor="middle" ` +
        `font-size="${node.fontSize}" ${node.bold || index === 0 ? 'font-weight="600"' : ''} ` +
        `fill="${node.textColor}">${escapeXml(line)}</text>`,
    )
    .join('');
}

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function fullBounds(diagram: Diagram): Bounds {
  return { x: 0, y: 0, width: diagram.width, height: diagram.height };
}

function contentBounds(diagram: Diagram, padding: number): Bounds {
  if (!diagram.nodes.length) return fullBounds(diagram);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of diagram.nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  }

  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
