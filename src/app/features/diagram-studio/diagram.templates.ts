import {
  emptyDiagram,
  uid,
  type Diagram,
  type DiagramEdge,
  type DiagramNode,
  type ShapeKind,
} from './diagram.model';

/**
 * Starter diagrams for the type-specific landing pages.
 *
 * Each opens the studio with a stencil selected and something real on the
 * canvas — an empty grid is a poor first impression, and editing an example is
 * faster than starting from nothing.
 */

export interface DiagramTemplate {
  readonly toolId: string;
  readonly stencil: string;
  readonly title: string;
  readonly build: () => Diagram;
}

interface NodeSpec {
  id: string;
  kind: ShapeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  fill?: string;
  stroke?: string;
  rows?: string[];
  z?: number;
}

function node(spec: NodeSpec): DiagramNode {
  return {
    id: spec.id,
    kind: spec.kind,
    x: spec.x,
    y: spec.y,
    width: spec.w,
    height: spec.h,
    text: spec.text,
    fill: spec.fill ?? '#eef2ff',
    stroke: spec.stroke ?? '#5b5bd6',
    textColor: '#16181f',
    fontSize: 13,
    rows: spec.rows,
    z: spec.z ?? 1,
  };
}

function edge(
  from: string,
  to: string,
  label = '',
  options: Partial<Omit<DiagramEdge, 'id' | 'from' | 'to' | 'label'>> = {},
): DiagramEdge {
  return {
    id: uid('e'),
    from,
    to,
    label,
    routing: options.routing ?? 'orthogonal',
    dashed: options.dashed ?? false,
    startArrow: options.startArrow ?? 'none',
    endArrow: options.endArrow ?? 'arrow',
    stroke: options.stroke ?? '#52607a',
  };
}

function diagram(title: string, nodes: DiagramNode[], edges: DiagramEdge[]): Diagram {
  return { ...emptyDiagram(title), nodes, edges };
}

const GREEN = { fill: '#e6f6ee', stroke: '#167c53' };
const AMBER = { fill: '#fdf3e3', stroke: '#a05e03' };
const SLATE = { fill: '#f1f3f7', stroke: '#52607a' };
const TEAL = { fill: '#e4f6f7', stroke: '#0e7c86' };

export const TEMPLATES: Record<string, DiagramTemplate> = {
  'flowchart-maker': {
    toolId: 'flowchart-maker',
    stencil: 'flowchart',
    title: 'Flowchart',
    build: () =>
      diagram(
        'Order approval flow',
        [
          node({ id: 'start', kind: 'rounded', x: 340, y: 60, w: 150, h: 60, text: 'Order received', ...GREEN }),
          node({ id: 'check', kind: 'diamond', x: 330, y: 180, w: 170, h: 110, text: 'In stock?', ...AMBER }),
          node({ id: 'pick', kind: 'rect', x: 130, y: 350, w: 170, h: 70, text: 'Pick and pack' }),
          node({ id: 'backorder', kind: 'rect', x: 530, y: 350, w: 170, h: 70, text: 'Raise back-order', ...SLATE }),
          node({ id: 'ship', kind: 'rect', x: 130, y: 470, w: 170, h: 70, text: 'Ship to customer' }),
          node({ id: 'notify', kind: 'parallelogram', x: 520, y: 470, w: 190, h: 70, text: 'Notify customer', ...TEAL }),
          node({ id: 'end', kind: 'rounded', x: 340, y: 600, w: 150, h: 60, text: 'Done', ...GREEN }),
        ],
        [
          edge('start', 'check'),
          edge('check', 'pick', 'yes'),
          edge('check', 'backorder', 'no'),
          edge('pick', 'ship'),
          edge('backorder', 'notify'),
          edge('ship', 'end'),
          edge('notify', 'end'),
        ],
      ),
  },

  'uml-diagram': {
    toolId: 'uml-diagram',
    stencil: 'uml',
    title: 'UML class diagram',
    build: () =>
      diagram(
        'Domain model',
        [
          node({
            id: 'order',
            kind: 'record',
            x: 120,
            y: 90,
            w: 220,
            h: 140,
            text: 'Order',
            rows: ['- id: UUID', '- placedAt: Date', '+ total(): Money', '+ cancel(): void'],
          }),
          node({
            id: 'customer',
            kind: 'record',
            x: 500,
            y: 90,
            w: 220,
            h: 120,
            text: 'Customer',
            rows: ['- id: UUID', '- email: String', '+ orders(): Order[]'],
            ...TEAL,
          }),
          node({
            id: 'line',
            kind: 'record',
            x: 120,
            y: 320,
            w: 220,
            h: 120,
            text: 'OrderLine',
            rows: ['- quantity: int', '- unitPrice: Money', '+ subtotal(): Money'],
            ...SLATE,
          }),
          node({
            id: 'payable',
            kind: 'record',
            x: 500,
            y: 320,
            w: 220,
            h: 90,
            text: '«interface»\nPayable',
            rows: ['+ amountDue(): Money'],
            ...AMBER,
          }),
        ],
        [
          edge('customer', 'order', '1 … *', { endArrow: 'diamond', routing: 'straight' }),
          edge('order', 'line', '1 … *', { endArrow: 'diamond', routing: 'straight' }),
          edge('order', 'payable', 'implements', {
            dashed: true,
            endArrow: 'triangle',
            routing: 'straight',
          }),
        ],
      ),
  },

  'er-diagram': {
    toolId: 'er-diagram',
    stencil: 'er',
    title: 'ER diagram',
    build: () =>
      diagram(
        'Shop schema',
        [
          node({
            id: 'customer',
            kind: 'record',
            x: 120,
            y: 100,
            w: 230,
            h: 130,
            text: 'customer',
            rows: ['PK id: uuid', 'email: text', 'created_at: timestamptz'],
          }),
          node({
            id: 'order',
            kind: 'record',
            x: 520,
            y: 100,
            w: 230,
            h: 150,
            text: 'order',
            rows: ['PK id: uuid', 'FK customer_id: uuid', 'placed_at: timestamptz', 'status: text'],
            ...TEAL,
          }),
          node({
            id: 'item',
            kind: 'record',
            x: 520,
            y: 340,
            w: 230,
            h: 130,
            text: 'order_item',
            rows: ['PK id: uuid', 'FK order_id: uuid', 'quantity: int'],
            ...SLATE,
          }),
          node({
            id: 'product',
            kind: 'record',
            x: 120,
            y: 340,
            w: 230,
            h: 130,
            text: 'product',
            rows: ['PK id: uuid', 'sku: text', 'price_cents: int'],
            ...GREEN,
          }),
        ],
        [
          edge('customer', 'order', 'places 1:N', { routing: 'straight' }),
          edge('order', 'item', 'contains 1:N', { routing: 'straight' }),
          edge('product', 'item', 'appears in 1:N', { routing: 'straight' }),
        ],
      ),
  },

  'aws-architecture-diagram': {
    toolId: 'aws-architecture-diagram',
    stencil: 'cloud',
    title: 'Cloud architecture',
    build: () =>
      diagram(
        'Web application architecture',
        [
          node({
            id: 'region',
            kind: 'container',
            x: 90,
            y: 120,
            w: 780,
            h: 420,
            text: 'Region — eu-west-1',
            fill: '#f5f8ff',
            stroke: '#5b5bd6',
            z: 0,
          }),
          node({
            id: 'vpc',
            kind: 'container',
            x: 130,
            y: 190,
            w: 700,
            h: 320,
            text: 'VPC 10.0.0.0/16',
            fill: '#f2fbf6',
            stroke: '#167c53',
            z: 0,
          }),
          node({ id: 'cdn', kind: 'cloud', x: 360, y: 20, w: 170, h: 80, text: 'CDN', ...SLATE }),
          node({ id: 'lb', kind: 'hexagon', x: 370, y: 230, w: 170, h: 66, text: 'Load balancer' }),
          node({ id: 'app1', kind: 'rounded', x: 200, y: 350, w: 150, h: 66, text: 'App server', ...AMBER }),
          node({ id: 'app2', kind: 'rounded', x: 380, y: 350, w: 150, h: 66, text: 'App server', ...AMBER }),
          node({ id: 'db', kind: 'cylinder', x: 600, y: 340, w: 140, h: 100, text: 'Primary DB' }),
          node({ id: 'queue', kind: 'parallelogram', x: 600, y: 220, w: 150, h: 60, text: 'Job queue', ...TEAL }),
        ],
        [
          edge('cdn', 'lb', 'https'),
          edge('lb', 'app1'),
          edge('lb', 'app2'),
          edge('app1', 'db', 'sql', { routing: 'straight' }),
          edge('app2', 'db', 'sql', { routing: 'straight' }),
          edge('app2', 'queue', 'enqueue', { routing: 'straight', dashed: true }),
        ],
      ),
  },

  'network-diagram': {
    toolId: 'network-diagram',
    stencil: 'network',
    title: 'Network diagram',
    build: () =>
      diagram(
        'Office network',
        [
          node({ id: 'internet', kind: 'cloud', x: 360, y: 40, w: 180, h: 100, text: 'Internet', ...SLATE }),
          node({ id: 'firewall', kind: 'rect', x: 380, y: 190, w: 150, h: 70, text: 'Firewall', fill: '#fdecec', stroke: '#cc2f3f' }),
          node({ id: 'router', kind: 'ellipse', x: 380, y: 310, w: 150, h: 84, text: 'Core router' }),
          node({ id: 'switch1', kind: 'rect', x: 180, y: 450, w: 150, h: 60, text: 'Switch — floor 1', ...TEAL }),
          node({ id: 'switch2', kind: 'rect', x: 580, y: 450, w: 150, h: 60, text: 'Switch — floor 2', ...TEAL }),
          node({ id: 'clients1', kind: 'rounded', x: 180, y: 570, w: 150, h: 66, text: '24 workstations', ...GREEN }),
          node({ id: 'clients2', kind: 'rounded', x: 580, y: 570, w: 150, h: 66, text: '18 workstations', ...GREEN }),
          node({ id: 'nas', kind: 'rect', x: 380, y: 570, w: 150, h: 90, text: 'File server', ...SLATE }),
        ],
        [
          edge('internet', 'firewall', 'WAN'),
          edge('firewall', 'router'),
          edge('router', 'switch1', 'VLAN 10'),
          edge('router', 'switch2', 'VLAN 20'),
          edge('router', 'nas', '10 GbE', { routing: 'straight' }),
          edge('switch1', 'clients1'),
          edge('switch2', 'clients2'),
        ],
      ),
  },

  'mind-map': {
    toolId: 'mind-map',
    stencil: 'org',
    title: 'Mind map',
    build: () =>
      diagram(
        'Product launch',
        [
          node({ id: 'core', kind: 'ellipse', x: 400, y: 300, w: 200, h: 90, text: 'Product launch', fill: '#eef2ff', stroke: '#5b5bd6' }),
          node({ id: 'marketing', kind: 'ellipse', x: 130, y: 150, w: 170, h: 70, text: 'Marketing', ...AMBER }),
          node({ id: 'engineering', kind: 'ellipse', x: 700, y: 150, w: 170, h: 70, text: 'Engineering', ...TEAL }),
          node({ id: 'support', kind: 'ellipse', x: 130, y: 470, w: 170, h: 70, text: 'Support', ...GREEN }),
          node({ id: 'legal', kind: 'ellipse', x: 700, y: 470, w: 170, h: 70, text: 'Legal', ...SLATE }),
          node({ id: 'press', kind: 'rounded', x: 60, y: 40, w: 150, h: 56, text: 'Press kit', ...AMBER }),
          node({ id: 'pricing', kind: 'rounded', x: 240, y: 40, w: 150, h: 56, text: 'Pricing page', ...AMBER }),
          node({ id: 'loadtest', kind: 'rounded', x: 700, y: 40, w: 150, h: 56, text: 'Load testing', ...TEAL }),
          node({ id: 'docs', kind: 'rounded', x: 60, y: 580, w: 150, h: 56, text: 'Help articles', ...GREEN }),
        ],
        [
          edge('core', 'marketing', '', { routing: 'curved', endArrow: 'none' }),
          edge('core', 'engineering', '', { routing: 'curved', endArrow: 'none' }),
          edge('core', 'support', '', { routing: 'curved', endArrow: 'none' }),
          edge('core', 'legal', '', { routing: 'curved', endArrow: 'none' }),
          edge('marketing', 'press', '', { routing: 'curved', endArrow: 'none' }),
          edge('marketing', 'pricing', '', { routing: 'curved', endArrow: 'none' }),
          edge('engineering', 'loadtest', '', { routing: 'curved', endArrow: 'none' }),
          edge('support', 'docs', '', { routing: 'curved', endArrow: 'none' }),
        ],
      ),
  },

  'org-chart': {
    toolId: 'org-chart',
    stencil: 'org',
    title: 'Org chart',
    build: () =>
      diagram(
        'Organisation chart',
        [
          node({ id: 'ceo', kind: 'rounded', x: 400, y: 60, w: 190, h: 74, text: 'A. Whitfield\nChief Executive' }),
          node({ id: 'cto', kind: 'rounded', x: 180, y: 230, w: 190, h: 74, text: 'M. Oyelaran\nCTO', ...TEAL }),
          node({ id: 'coo', kind: 'rounded', x: 400, y: 230, w: 190, h: 74, text: 'S. Kapoor\nCOO', ...AMBER }),
          node({ id: 'cfo', kind: 'rounded', x: 620, y: 230, w: 190, h: 74, text: 'T. Lindqvist\nCFO', ...GREEN }),
          node({ id: 'eng', kind: 'rect', x: 80, y: 400, w: 180, h: 66, text: 'Engineering', ...SLATE }),
          node({ id: 'design', kind: 'rect', x: 280, y: 400, w: 180, h: 66, text: 'Design', ...SLATE }),
          node({ id: 'ops', kind: 'rect', x: 480, y: 400, w: 180, h: 66, text: 'Operations', ...SLATE }),
          node({ id: 'finance', kind: 'rect', x: 680, y: 400, w: 180, h: 66, text: 'Finance', ...SLATE }),
        ],
        [
          edge('ceo', 'cto', '', { endArrow: 'none' }),
          edge('ceo', 'coo', '', { endArrow: 'none' }),
          edge('ceo', 'cfo', '', { endArrow: 'none' }),
          edge('cto', 'eng', '', { endArrow: 'none' }),
          edge('cto', 'design', '', { endArrow: 'none' }),
          edge('coo', 'ops', '', { endArrow: 'none' }),
          edge('cfo', 'finance', '', { endArrow: 'none' }),
        ],
      ),
  },

  'process-diagram': {
    toolId: 'process-diagram',
    stencil: 'org',
    title: 'Process diagram',
    build: () =>
      diagram(
        'Expense approval',
        [
          node({ id: 'lane1', kind: 'container', x: 60, y: 100, w: 820, h: 160, text: 'Employee', fill: '#f7f8fa', stroke: '#cdd2dc', z: 0 }),
          node({ id: 'lane2', kind: 'container', x: 60, y: 280, w: 820, h: 160, text: 'Manager', fill: '#f2f6ff', stroke: '#cdd2dc', z: 0 }),
          node({ id: 'lane3', kind: 'container', x: 60, y: 460, w: 820, h: 160, text: 'Finance', fill: '#f5f2fb', stroke: '#cdd2dc', z: 0 }),
          node({ id: 'submit', kind: 'ellipse', x: 180, y: 150, w: 100, h: 90, text: 'Submit', ...GREEN }),
          node({ id: 'receipt', kind: 'rect', x: 340, y: 158, w: 160, h: 66, text: 'Attach receipts' }),
          node({ id: 'review', kind: 'rect', x: 340, y: 336, w: 160, h: 66, text: 'Review claim', ...AMBER }),
          node({ id: 'gate', kind: 'diamond', x: 560, y: 320, w: 130, h: 98, text: 'Approve?', ...AMBER }),
          node({ id: 'pay', kind: 'rect', x: 560, y: 516, w: 160, h: 66, text: 'Schedule payment', ...TEAL }),
          node({ id: 'reject', kind: 'rect', x: 740, y: 158, w: 130, h: 66, text: 'Amend claim', ...SLATE }),
        ],
        [
          edge('submit', 'receipt'),
          edge('receipt', 'review'),
          edge('review', 'gate'),
          edge('gate', 'pay', 'yes'),
          edge('gate', 'reject', 'no'),
          edge('reject', 'receipt', '', { dashed: true }),
        ],
      ),
  },
};

export function templateFor(toolId: string): DiagramTemplate | null {
  return TEMPLATES[toolId] ?? null;
}
