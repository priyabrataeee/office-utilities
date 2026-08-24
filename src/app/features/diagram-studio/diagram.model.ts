/**
 * Diagram model.
 *
 * Deliberately plain data: the canvas renders it, the exporters serialise it,
 * and the text-to-diagram tool produces it. Nothing in the model knows about
 * the DOM, which is what makes SVG, PNG and JSON export the same operation
 * three ways.
 */

export type ShapeKind =
  | 'rect'
  | 'rounded'
  | 'ellipse'
  | 'diamond'
  | 'parallelogram'
  | 'cylinder'
  | 'hexagon'
  | 'note'
  | 'actor'
  | 'cloud'
  | 'text'
  | 'container'
  | 'record';

export interface DiagramNode {
  readonly id: string;
  kind: ShapeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fill: string;
  stroke: string;
  textColor: string;
  fontSize: number;
  bold?: boolean;
  /** Extra lines for class boxes and ER entities. */
  rows?: string[];
  /** Draw order; containers sit behind everything else. */
  z?: number;
}

export type EdgeRouting = 'straight' | 'orthogonal' | 'curved';
export type ArrowHead = 'none' | 'arrow' | 'triangle' | 'diamond' | 'circle';

export interface DiagramEdge {
  readonly id: string;
  from: string;
  to: string;
  label: string;
  routing: EdgeRouting;
  dashed: boolean;
  startArrow: ArrowHead;
  endArrow: ArrowHead;
  stroke: string;
}

export interface Diagram {
  title: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  width: number;
  height: number;
  background: string;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

export function emptyDiagram(title = 'Untitled diagram'): Diagram {
  return {
    title,
    nodes: [],
    edges: [],
    width: 1600,
    height: 1000,
    background: '#ffffff',
    showGrid: true,
    snapToGrid: true,
    gridSize: 10,
  };
}

export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

/* ------------------------------------------------------------------
   Geometry
   ------------------------------------------------------------------ */

export interface Point {
  readonly x: number;
  readonly y: number;
}

export function centreOf(node: DiagramNode): Point {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}

/**
 * Where an edge should meet a node's outline.
 *
 * Rays are clipped to the bounding box rather than the exact silhouette —
 * accurate enough for every shape here, and far cheaper than per-shape maths.
 */
export function anchorPoint(node: DiagramNode, towards: Point): Point {
  const centre = centreOf(node);
  const dx = towards.x - centre.x;
  const dy = towards.y - centre.y;

  if (dx === 0 && dy === 0) return centre;

  const halfWidth = node.width / 2;
  const halfHeight = node.height / 2;
  const scale = Math.min(
    dx === 0 ? Infinity : halfWidth / Math.abs(dx),
    dy === 0 ? Infinity : halfHeight / Math.abs(dy),
  );

  return { x: centre.x + dx * scale, y: centre.y + dy * scale };
}

/** Orthogonal route: out horizontally, across, then in. */
export function orthogonalPath(from: Point, to: Point): string {
  const midX = (from.x + to.x) / 2;
  return `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`;
}

export function curvedPath(from: Point, to: Point): string {
  const dx = Math.abs(to.x - from.x) * 0.5;
  return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
}

export function straightPath(from: Point, to: Point): string {
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}

export function edgePath(edge: DiagramEdge, from: DiagramNode, to: DiagramNode): string {
  const start = anchorPoint(from, centreOf(to));
  const end = anchorPoint(to, centreOf(from));

  switch (edge.routing) {
    case 'orthogonal':
      return orthogonalPath(start, end);
    case 'curved':
      return curvedPath(start, end);
    default:
      return straightPath(start, end);
  }
}

export function edgeMidpoint(from: DiagramNode, to: DiagramNode): Point {
  const start = anchorPoint(from, centreOf(to));
  const end = anchorPoint(to, centreOf(from));
  return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
}

/** SVG path for one shape, in the node's own coordinate space. */
export function shapePath(node: DiagramNode): string {
  const { width: w, height: h } = node;

  switch (node.kind) {
    case 'diamond':
      return `M ${w / 2} 0 L ${w} ${h / 2} L ${w / 2} ${h} L 0 ${h / 2} Z`;
    case 'parallelogram': {
      const skew = Math.min(24, w * 0.18);
      return `M ${skew} 0 L ${w} 0 L ${w - skew} ${h} L 0 ${h} Z`;
    }
    case 'hexagon': {
      const inset = Math.min(22, w * 0.16);
      return `M ${inset} 0 L ${w - inset} 0 L ${w} ${h / 2} L ${w - inset} ${h} L ${inset} ${h} L 0 ${h / 2} Z`;
    }
    case 'note': {
      const fold = 16;
      return `M 0 0 L ${w - fold} 0 L ${w} ${fold} L ${w} ${h} L 0 ${h} Z M ${w - fold} 0 L ${w - fold} ${fold} L ${w} ${fold}`;
    }
    default:
      return '';
  }
}

/* ------------------------------------------------------------------
   Stencils
   ------------------------------------------------------------------ */

export interface StencilItem {
  readonly label: string;
  readonly kind: ShapeKind;
  readonly icon: string;
  readonly width: number;
  readonly height: number;
  readonly fill?: string;
  readonly stroke?: string;
  readonly text?: string;
  readonly rows?: readonly string[];
}

export interface Stencil {
  readonly id: string;
  readonly title: string;
  readonly items: readonly StencilItem[];
}

const BLUE = { fill: '#eef2ff', stroke: '#5b5bd6' };
const GREEN = { fill: '#e6f6ee', stroke: '#167c53' };
const AMBER = { fill: '#fdf3e3', stroke: '#a05e03' };
const RED = { fill: '#fdecec', stroke: '#cc2f3f' };
const SLATE = { fill: '#f1f3f7', stroke: '#52607a' };
const TEAL = { fill: '#e4f6f7', stroke: '#0e7c86' };

export const STENCILS: readonly Stencil[] = [
  {
    id: 'basic',
    title: 'Basic shapes',
    items: [
      { label: 'Rectangle', kind: 'rect', icon: 'square', width: 150, height: 70, ...BLUE },
      { label: 'Rounded', kind: 'rounded', icon: 'square', width: 150, height: 70, ...BLUE },
      { label: 'Ellipse', kind: 'ellipse', icon: 'circle', width: 140, height: 90, ...GREEN },
      { label: 'Diamond', kind: 'diamond', icon: 'diamond', width: 140, height: 100, ...AMBER },
      { label: 'Text', kind: 'text', icon: 'type', width: 160, height: 40, fill: 'transparent', stroke: 'transparent' },
      { label: 'Note', kind: 'note', icon: 'file-text', width: 160, height: 100, ...AMBER },
      { label: 'Container', kind: 'container', icon: 'layout-grid', width: 400, height: 280, fill: '#f7f8fa', stroke: '#cdd2dc' },
    ],
  },
  {
    id: 'flowchart',
    title: 'Flowchart',
    items: [
      { label: 'Start / End', kind: 'rounded', icon: 'play', width: 150, height: 60, ...GREEN, text: 'Start' },
      { label: 'Process', kind: 'rect', icon: 'square', width: 160, height: 70, ...BLUE, text: 'Process' },
      { label: 'Decision', kind: 'diamond', icon: 'diamond', width: 150, height: 110, ...AMBER, text: 'Decision?' },
      { label: 'Input / Output', kind: 'parallelogram', icon: 'shuffle', width: 170, height: 70, ...TEAL, text: 'Input' },
      { label: 'Document', kind: 'note', icon: 'file-text', width: 160, height: 90, ...SLATE, text: 'Document' },
      { label: 'Database', kind: 'cylinder', icon: 'database', width: 130, height: 100, ...SLATE, text: 'Store' },
      { label: 'Preparation', kind: 'hexagon', icon: 'boxes', width: 170, height: 70, ...AMBER, text: 'Prepare' },
    ],
  },
  {
    id: 'uml',
    title: 'UML',
    items: [
      {
        label: 'Class',
        kind: 'record',
        icon: 'boxes',
        width: 200,
        height: 120,
        ...BLUE,
        text: 'ClassName',
        rows: ['- field: Type', '+ method(): void'],
      },
      {
        label: 'Interface',
        kind: 'record',
        icon: 'boxes',
        width: 200,
        height: 100,
        ...TEAL,
        text: '«interface»\nName',
        rows: ['+ method(): void'],
      },
      { label: 'Actor', kind: 'actor', icon: 'user', width: 90, height: 120, ...SLATE, text: 'Actor' },
      { label: 'Use case', kind: 'ellipse', icon: 'circle', width: 170, height: 80, ...GREEN, text: 'Use case' },
      { label: 'Package', kind: 'container', icon: 'folder', width: 320, height: 220, ...SLATE, text: 'Package' },
      { label: 'Note', kind: 'note', icon: 'file-text', width: 160, height: 90, ...AMBER, text: 'Note' },
    ],
  },
  {
    id: 'er',
    title: 'ER model',
    items: [
      {
        label: 'Entity',
        kind: 'record',
        icon: 'database',
        width: 210,
        height: 140,
        ...BLUE,
        text: 'customer',
        rows: ['PK id: uuid', 'email: text', 'created_at: timestamp'],
      },
      {
        label: 'Weak entity',
        kind: 'record',
        icon: 'database',
        width: 210,
        height: 110,
        ...SLATE,
        text: 'order_item',
        rows: ['FK order_id: uuid', 'quantity: int'],
      },
      { label: 'Relationship', kind: 'diamond', icon: 'diamond', width: 150, height: 100, ...AMBER, text: 'places' },
      { label: 'Attribute', kind: 'ellipse', icon: 'circle', width: 130, height: 60, ...GREEN, text: 'attribute' },
    ],
  },
  {
    id: 'cloud',
    title: 'Cloud & infrastructure',
    items: [
      { label: 'Region', kind: 'container', icon: 'cloud', width: 460, height: 320, fill: '#f5f8ff', stroke: '#5b5bd6', text: 'Region' },
      { label: 'VPC', kind: 'container', icon: 'network', width: 380, height: 240, fill: '#f2fbf6', stroke: '#167c53', text: 'VPC' },
      { label: 'Compute', kind: 'rounded', icon: 'square', width: 150, height: 70, ...AMBER, text: 'Compute' },
      { label: 'Load balancer', kind: 'hexagon', icon: 'shuffle', width: 160, height: 70, ...BLUE, text: 'Load balancer' },
      { label: 'Database', kind: 'cylinder', icon: 'database', width: 130, height: 100, ...BLUE, text: 'Database' },
      { label: 'Object store', kind: 'cylinder', icon: 'database', width: 130, height: 100, ...GREEN, text: 'Object store' },
      { label: 'Queue', kind: 'parallelogram', icon: 'layers', width: 160, height: 60, ...TEAL, text: 'Queue' },
      { label: 'CDN', kind: 'cloud', icon: 'cloud', width: 160, height: 90, ...SLATE, text: 'CDN' },
      { label: 'Gateway', kind: 'hexagon', icon: 'shield', width: 150, height: 70, ...RED, text: 'API gateway' },
    ],
  },
  {
    id: 'network',
    title: 'Network',
    items: [
      { label: 'Router', kind: 'ellipse', icon: 'network', width: 130, height: 80, ...BLUE, text: 'Router' },
      { label: 'Switch', kind: 'rect', icon: 'layers', width: 150, height: 60, ...TEAL, text: 'Switch' },
      { label: 'Firewall', kind: 'rect', icon: 'shield', width: 140, height: 70, ...RED, text: 'Firewall' },
      { label: 'Server', kind: 'rect', icon: 'database', width: 130, height: 100, ...SLATE, text: 'Server' },
      { label: 'Client', kind: 'rounded', icon: 'monitor', width: 130, height: 70, ...GREEN, text: 'Client' },
      { label: 'Wireless AP', kind: 'ellipse', icon: 'zap', width: 130, height: 80, ...AMBER, text: 'AP' },
      { label: 'Internet', kind: 'cloud', icon: 'cloud', width: 170, height: 100, ...SLATE, text: 'Internet' },
    ],
  },
  {
    id: 'org',
    title: 'Org & process',
    items: [
      { label: 'Person', kind: 'rounded', icon: 'user', width: 170, height: 74, ...BLUE, text: 'Name\nJob title' },
      { label: 'Team', kind: 'rect', icon: 'users', width: 180, height: 70, ...TEAL, text: 'Team' },
      { label: 'Swimlane', kind: 'container', icon: 'layout-grid', width: 700, height: 160, fill: '#f7f8fa', stroke: '#cdd2dc', text: 'Role' },
      { label: 'Step', kind: 'rect', icon: 'square', width: 150, height: 66, ...BLUE, text: 'Step' },
      { label: 'Gateway', kind: 'diamond', icon: 'diamond', width: 120, height: 90, ...AMBER, text: '?' },
      { label: 'Event', kind: 'ellipse', icon: 'circle', width: 90, height: 90, ...GREEN, text: 'Start' },
      { label: 'Idea', kind: 'ellipse', icon: 'sparkles', width: 150, height: 70, ...AMBER, text: 'Idea' },
    ],
  },
];

export function stencilById(id: string): Stencil {
  return STENCILS.find((stencil) => stencil.id === id) ?? STENCILS[0];
}
