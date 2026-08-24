import {
  divider,
  heading,
  para,
  run,
  spacer,
  type DocBlock,
  type TableCell,
} from '../../../core/engines/doc-model';
import {
  formatDate,
  list,
  money,
  num,
  rows,
  str,
  today,
  type FormData,
  type GeneratorDef,
} from '../generator.model';

/* Shared pieces --------------------------------------------------- */

const CURRENCIES = [
  { value: '$', label: 'USD  $' },
  { value: '€', label: 'EUR  €' },
  { value: '£', label: 'GBP  £' },
  { value: '₹', label: 'INR  ₹' },
  { value: '¥', label: 'JPY  ¥' },
  { value: 'A$', label: 'AUD  A$' },
  { value: 'C$', label: 'CAD  C$' },
];

const LINE_ITEM_COLUMNS = [
  { key: 'description', label: 'Description', type: 'text' as const, span: 2 as const },
  { key: 'quantity', label: 'Qty', type: 'number' as const, min: 0, step: 0.01 },
  { key: 'rate', label: 'Rate', type: 'number' as const, min: 0, step: 0.01 },
];

interface Totals {
  readonly subtotal: number;
  readonly discount: number;
  readonly taxable: number;
  readonly tax: number;
  readonly total: number;
}

function computeTotals(data: FormData): Totals {
  const subtotal = rows(data, 'items').reduce(
    (sum, item) => sum + num(item, 'quantity') * num(item, 'rate'),
    0,
  );
  const discount =
    str(data, 'discountType') === 'percent'
      ? (subtotal * num(data, 'discount')) / 100
      : num(data, 'discount');
  const taxable = Math.max(0, subtotal - discount);
  const tax = (taxable * num(data, 'taxRate')) / 100;
  return { subtotal, discount, taxable, tax, total: taxable + tax };
}

/** Company on the left, document meta on the right. */
function letterhead(data: FormData, title: string, metaRows: [string, string][]): DocBlock {
  return {
    type: 'columns',
    ratio: 0.58,
    left: [
      para([run(str(data, 'businessName', 'Your Business'), { bold: true, size: 16 })]),
      ...splitLines(str(data, 'businessAddress')).map((line) =>
        para([run(line, { size: 9.5, color: '#5b6274' })], { spaceAfter: 1 }),
      ),
      ...(str(data, 'businessEmail')
        ? [para([run(str(data, 'businessEmail'), { size: 9.5, color: '#5b6274' })], { spaceAfter: 1 })]
        : []),
      ...(str(data, 'businessPhone')
        ? [para([run(str(data, 'businessPhone'), { size: 9.5, color: '#5b6274' })], { spaceAfter: 1 })]
        : []),
      ...(str(data, 'businessTaxId')
        ? [para([run(`Tax ID: ${str(data, 'businessTaxId')}`, { size: 9.5, color: '#5b6274' })])]
        : []),
    ],
    right: [
      para([run(title.toUpperCase(), { bold: true, size: 24, color: str(data, 'accent', '#5b5bd6') })], {
        align: 'right',
      }),
      ...metaRows
        .filter(([, value]) => !!value)
        .map(([label, value]) =>
          para(
            [
              run(`${label}  `, { size: 9.5, color: '#767c8c' }),
              run(value, { size: 9.5, bold: true }),
            ],
            { align: 'right', spaceAfter: 1 },
          ),
        ),
    ],
  };
}

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function partyBlock(label: string, name: string, address: string, extra: string[]): DocBlock[] {
  return [
    para([run(label.toUpperCase(), { size: 8.5, bold: true, color: '#767c8c' })], {
      spaceAfter: 2,
    }),
    para([run(name || '—', { bold: true, size: 11.5 })], { spaceAfter: 2 }),
    ...splitLines(address).map((line) =>
      para([run(line, { size: 9.5, color: '#5b6274' })], { spaceAfter: 1 }),
    ),
    ...extra
      .filter(Boolean)
      .map((line) => para([run(line, { size: 9.5, color: '#5b6274' })], { spaceAfter: 1 })),
  ];
}

function itemsTable(data: FormData, currency: string): DocBlock {
  const items = rows(data, 'items');
  return {
    type: 'table',
    header: [
      [run('Description', { bold: true })],
      [run('Qty', { bold: true })],
      [run('Rate', { bold: true })],
      [run('Amount', { bold: true })],
    ],
    rows: items.map((item): TableCell[] => {
      const amount = num(item, 'quantity') * num(item, 'rate');
      return [
        [run(str(item, 'description'))],
        [run(formatQuantity(num(item, 'quantity')))],
        [run(money(num(item, 'rate'), currency))],
        [run(money(amount, currency), { bold: true })],
      ];
    }),
    widths: [5, 1, 1.4, 1.6],
    align: ['left', 'right', 'right', 'right'],
    repeatHeader: true,
  };
}

function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function totalsBlock(data: FormData, currency: string, totals: Totals): DocBlock {
  const lines: [string, string, boolean][] = [
    ['Subtotal', money(totals.subtotal, currency), false],
  ];
  if (totals.discount > 0) {
    lines.push(['Discount', `− ${money(totals.discount, currency)}`, false]);
  }
  if (num(data, 'taxRate') > 0) {
    lines.push([
      `${str(data, 'taxLabel', 'Tax')} (${num(data, 'taxRate')}%)`,
      money(totals.tax, currency),
      false,
    ]);
  }
  lines.push(['Total', money(totals.total, currency), true]);

  return {
    type: 'columns',
    ratio: 0.52,
    left: [],
    right: lines.map(([label, value, strong]) =>
      para(
        [
          run(label, { size: strong ? 12 : 10, bold: strong, color: strong ? undefined : '#5b6274' }),
          run('        ', {}),
          run(value, { size: strong ? 12 : 10, bold: true }),
        ],
        { align: 'right', spaceAfter: strong ? 4 : 2 },
      ),
    ),
  };
}

const BUSINESS_SECTION = {
  title: 'Your business',
  icon: 'briefcase',
  fields: [
    { key: 'businessName', label: 'Business name', type: 'text' as const, span: 2 as const },
    { key: 'businessEmail', label: 'Email', type: 'text' as const },
    { key: 'businessPhone', label: 'Phone', type: 'text' as const },
    { key: 'businessTaxId', label: 'Tax / VAT ID', type: 'text' as const },
    {
      key: 'businessAddress',
      label: 'Address',
      type: 'textarea' as const,
      rows: 3,
      span: 2 as const,
    },
    { key: 'accent', label: 'Accent colour', type: 'color' as const },
  ],
};

const CLIENT_SECTION = {
  title: 'Client',
  icon: 'user',
  fields: [
    { key: 'clientName', label: 'Client name', type: 'text' as const, span: 2 as const },
    { key: 'clientEmail', label: 'Client email', type: 'text' as const },
    { key: 'clientTaxId', label: 'Client tax ID', type: 'text' as const },
    {
      key: 'clientAddress',
      label: 'Client address',
      type: 'textarea' as const,
      rows: 3,
      span: 2 as const,
    },
  ],
};

const ITEMS_SECTION = {
  title: 'Line items',
  icon: 'receipt',
  fields: [
    {
      key: 'items',
      label: 'Items',
      type: 'repeat' as const,
      itemLabel: 'item',
      columns: LINE_ITEM_COLUMNS,
      span: 3 as const,
    },
  ],
};

const TOTALS_SECTION = {
  title: 'Totals',
  icon: 'wallet',
  fields: [
    { key: 'currency', label: 'Currency', type: 'select' as const, options: CURRENCIES },
    { key: 'taxLabel', label: 'Tax label', type: 'text' as const, placeholder: 'VAT, GST, Sales tax' },
    { key: 'taxRate', label: 'Tax rate (%)', type: 'number' as const, min: 0, max: 100, step: 0.01 },
    {
      key: 'discountType',
      label: 'Discount type',
      type: 'select' as const,
      options: [
        { value: 'amount', label: 'Fixed amount' },
        { value: 'percent', label: 'Percentage' },
      ],
    },
    { key: 'discount', label: 'Discount', type: 'number' as const, min: 0, step: 0.01 },
  ],
};

/* Invoice --------------------------------------------------------- */

export const INVOICE: GeneratorDef = {
  toolId: 'invoice-generator',
  page: { size: 'A4', margin: 48, font: 'sans' },
  sections: [
    {
      title: 'Invoice details',
      icon: 'receipt',
      fields: [
        { key: 'invoiceNumber', label: 'Invoice number', type: 'text' },
        { key: 'issueDate', label: 'Issue date', type: 'date' },
        { key: 'dueDate', label: 'Due date', type: 'date' },
        { key: 'poNumber', label: 'PO number', type: 'text' },
      ],
    },
    BUSINESS_SECTION,
    CLIENT_SECTION,
    ITEMS_SECTION,
    TOTALS_SECTION,
    {
      title: 'Payment & notes',
      icon: 'info',
      fields: [
        {
          key: 'paymentDetails',
          label: 'Payment details',
          type: 'textarea',
          rows: 3,
          span: 2,
          placeholder: 'Bank name, account number, sort code, payment link…',
        },
        { key: 'notes', label: 'Notes', type: 'textarea', rows: 3, span: 2 },
        { key: 'terms', label: 'Terms', type: 'textarea', rows: 2, span: 3 },
      ],
    },
  ],
  initial: () => ({
    invoiceNumber: 'INV-0001',
    issueDate: today(),
    dueDate: today(30),
    poNumber: '',
    businessName: 'Northwind Studio',
    businessEmail: 'billing@northwind.example',
    businessPhone: '+1 555 0100',
    businessTaxId: '',
    businessAddress: '18 Harbour Lane\nPortland, OR 97201',
    accent: '#5b5bd6',
    clientName: 'Acme Corporation',
    clientEmail: 'accounts@acme.example',
    clientTaxId: '',
    clientAddress: '400 Market Street\nSan Francisco, CA 94111',
    currency: '$',
    taxLabel: 'Sales tax',
    taxRate: 8.5,
    discountType: 'amount',
    discount: 0,
    items: [
      { description: 'Brand identity design', quantity: 1, rate: 3200 },
      { description: 'Website build — 12 pages', quantity: 1, rate: 6400 },
      { description: 'Copywriting', quantity: 8, rate: 120 },
    ],
    paymentDetails: 'Bank transfer — Northwind Studio\nAccount 0123 4567 · Sort 00-11-22',
    notes: 'Thank you for your business.',
    terms: 'Payment is due within 30 days. Late payments may incur a 2% monthly charge.',
  }),
  fileName: (data) => `invoice-${str(data, 'invoiceNumber', 'draft')}`,
  render: (data) => {
    const currency = str(data, 'currency', '$');
    const totals = computeTotals(data);

    return [
      letterhead(data, 'Invoice', [
        ['Invoice #', str(data, 'invoiceNumber')],
        ['Issued', formatDate(str(data, 'issueDate'))],
        ['Due', formatDate(str(data, 'dueDate'))],
        ['PO', str(data, 'poNumber')],
      ]),
      spacer(14),
      {
        type: 'columns',
        ratio: 0.5,
        left: partyBlock('Bill to', str(data, 'clientName'), str(data, 'clientAddress'), [
          str(data, 'clientEmail'),
          str(data, 'clientTaxId') ? `Tax ID: ${str(data, 'clientTaxId')}` : '',
        ]),
        right: [],
      },
      spacer(10),
      itemsTable(data, currency),
      totalsBlock(data, currency, totals),
      spacer(6),
      ...(str(data, 'paymentDetails')
        ? [
            divider,
            para([run('Payment details', { bold: true, size: 10 })], { spaceAfter: 2 }),
            ...splitLines(str(data, 'paymentDetails')).map((line) =>
              para([run(line, { size: 9.5, color: '#5b6274' })], { spaceAfter: 1 }),
            ),
          ]
        : []),
      ...(str(data, 'notes')
        ? [
            spacer(8),
            para([run('Notes', { bold: true, size: 10 })], { spaceAfter: 2 }),
            para([run(str(data, 'notes'), { size: 9.5, color: '#5b6274' })]),
          ]
        : []),
      ...(str(data, 'terms')
        ? [
            spacer(8),
            para([run(str(data, 'terms'), { size: 8.5, color: '#767c8c', italic: true })]),
          ]
        : []),
    ];
  },
};

/* Quotation ------------------------------------------------------- */

export const QUOTATION: GeneratorDef = {
  toolId: 'quotation-generator',
  page: { size: 'A4', margin: 48, font: 'sans' },
  sections: [
    {
      title: 'Quote details',
      icon: 'receipt',
      fields: [
        { key: 'quoteNumber', label: 'Quote number', type: 'text' },
        { key: 'issueDate', label: 'Date', type: 'date' },
        { key: 'validUntil', label: 'Valid until', type: 'date' },
        { key: 'preparedBy', label: 'Prepared by', type: 'text' },
      ],
    },
    BUSINESS_SECTION,
    { ...CLIENT_SECTION, title: 'Prospect' },
    ITEMS_SECTION,
    TOTALS_SECTION,
    {
      title: 'Scope & terms',
      icon: 'clipboard',
      fields: [
        { key: 'scope', label: 'What is included', type: 'textarea', rows: 4, span: 3 },
        { key: 'exclusions', label: 'What is not included', type: 'textarea', rows: 3, span: 3 },
        { key: 'terms', label: 'Terms and conditions', type: 'textarea', rows: 4, span: 3 },
      ],
    },
  ],
  initial: () => ({
    quoteNumber: 'QUO-0001',
    issueDate: today(),
    validUntil: today(30),
    preparedBy: '',
    businessName: 'Northwind Studio',
    businessEmail: 'hello@northwind.example',
    businessPhone: '+1 555 0100',
    businessTaxId: '',
    businessAddress: '18 Harbour Lane\nPortland, OR 97201',
    accent: '#0e7c86',
    clientName: 'Acme Corporation',
    clientEmail: 'procurement@acme.example',
    clientTaxId: '',
    clientAddress: '400 Market Street\nSan Francisco, CA 94111',
    currency: '$',
    taxLabel: 'Sales tax',
    taxRate: 0,
    discountType: 'percent',
    discount: 0,
    items: [
      { description: 'Discovery workshop (2 days)', quantity: 1, rate: 2400 },
      { description: 'Design system', quantity: 1, rate: 8800 },
      { description: 'Implementation support (per day)', quantity: 10, rate: 900 },
    ],
    scope: 'Two-day discovery workshop\nComponent library with documentation\nTen days of implementation support',
    exclusions: 'Hosting and third-party licences\nContent production\nOngoing maintenance after handover',
    terms:
      'This quotation is valid for 30 days from the date of issue. Work begins on receipt of a signed acceptance and a 30% deposit.',
  }),
  fileName: (data) => `quotation-${str(data, 'quoteNumber', 'draft')}`,
  render: (data) => {
    const currency = str(data, 'currency', '$');
    const totals = computeTotals(data);

    return [
      letterhead(data, 'Quotation', [
        ['Quote #', str(data, 'quoteNumber')],
        ['Date', formatDate(str(data, 'issueDate'))],
        ['Valid until', formatDate(str(data, 'validUntil'))],
        ['Prepared by', str(data, 'preparedBy')],
      ]),
      spacer(14),
      {
        type: 'columns',
        ratio: 0.5,
        left: partyBlock('Prepared for', str(data, 'clientName'), str(data, 'clientAddress'), [
          str(data, 'clientEmail'),
        ]),
        right: [],
      },
      spacer(10),
      itemsTable(data, currency),
      totalsBlock(data, currency, totals),
      ...sectionIf('What is included', str(data, 'scope')),
      ...sectionIf('What is not included', str(data, 'exclusions')),
      ...(str(data, 'terms')
        ? [
            spacer(10),
            divider,
            para([run('Terms and conditions', { bold: true, size: 10 })], { spaceAfter: 3 }),
            para([run(str(data, 'terms'), { size: 9.5, color: '#5b6274' })]),
            spacer(24),
            {
              type: 'columns' as const,
              ratio: 0.5,
              left: [
                para([run('Accepted by', { size: 8.5, bold: true, color: '#767c8c' })]),
                spacer(26),
                para([run('_________________________', { color: '#9aa2b4' })]),
                para([run('Signature and date', { size: 8.5, color: '#767c8c' })]),
              ],
              right: [
                para([run('For and on behalf of', { size: 8.5, bold: true, color: '#767c8c' })]),
                spacer(26),
                para([run('_________________________', { color: '#9aa2b4' })]),
                para([run(str(data, 'businessName'), { size: 8.5, color: '#767c8c' })]),
              ],
            },
          ]
        : []),
    ];
  },
};

function sectionIf(title: string, body: string): DocBlock[] {
  if (!body.trim()) return [];
  const lines = splitLines(body);
  return [
    spacer(10),
    para([run(title, { bold: true, size: 10 })], { spaceAfter: 3 }),
    lines.length > 1
      ? {
          type: 'list',
          ordered: false,
          items: lines.map((line) => ({ content: [run(line, { size: 9.5 })] })),
        }
      : para([run(lines[0] ?? '', { size: 9.5, color: '#5b6274' })]),
  ];
}

/* Business proposal ----------------------------------------------- */

export const PROPOSAL: GeneratorDef = {
  toolId: 'business-proposal-generator',
  page: { size: 'A4', margin: 56, font: 'sans' },
  sections: [
    {
      title: 'Cover',
      icon: 'briefcase',
      fields: [
        { key: 'title', label: 'Proposal title', type: 'text', span: 2 },
        { key: 'subtitle', label: 'Subtitle', type: 'text', span: 2 },
        { key: 'preparedFor', label: 'Prepared for', type: 'text' },
        { key: 'preparedBy', label: 'Prepared by', type: 'text' },
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'reference', label: 'Reference', type: 'text' },
        { key: 'accent', label: 'Accent colour', type: 'color' },
      ],
    },
    {
      title: 'Narrative',
      icon: 'file-text',
      fields: [
        { key: 'summary', label: 'Executive summary', type: 'textarea', rows: 4, span: 3 },
        { key: 'problem', label: 'The problem', type: 'textarea', rows: 4, span: 3 },
        { key: 'solution', label: 'Proposed solution', type: 'textarea', rows: 5, span: 3 },
      ],
    },
    {
      title: 'Scope',
      icon: 'clipboard',
      fields: [
        { key: 'deliverables', label: 'Deliverables', type: 'list', itemLabel: 'deliverable', span: 3 },
        {
          key: 'timeline',
          label: 'Timeline',
          type: 'repeat',
          itemLabel: 'phase',
          span: 3,
          columns: [
            { key: 'phase', label: 'Phase', type: 'text', span: 2 },
            { key: 'duration', label: 'Duration', type: 'text' },
            { key: 'outcome', label: 'Outcome', type: 'text', span: 2 },
          ],
        },
      ],
    },
    {
      title: 'Investment',
      icon: 'wallet',
      fields: [
        { key: 'currency', label: 'Currency', type: 'select', options: CURRENCIES },
        { key: 'taxLabel', label: 'Tax label', type: 'text' },
        { key: 'taxRate', label: 'Tax rate (%)', type: 'number', min: 0, max: 100, step: 0.01 },
        { key: 'discountType', label: 'Discount type', type: 'select', options: [
          { value: 'amount', label: 'Fixed amount' },
          { value: 'percent', label: 'Percentage' },
        ] },
        { key: 'discount', label: 'Discount', type: 'number', min: 0, step: 0.01 },
        {
          key: 'items',
          label: 'Pricing',
          type: 'repeat',
          itemLabel: 'line',
          span: 3,
          columns: LINE_ITEM_COLUMNS,
        },
      ],
    },
    {
      title: 'Close',
      icon: 'check-circle',
      fields: [
        { key: 'nextSteps', label: 'Next steps', type: 'list', itemLabel: 'step', span: 3 },
        { key: 'terms', label: 'Terms', type: 'textarea', rows: 3, span: 3 },
      ],
    },
  ],
  initial: () => ({
    title: 'Customer portal modernisation',
    subtitle: 'A phased plan to replace the legacy self-service portal',
    preparedFor: 'Acme Corporation',
    preparedBy: 'Northwind Studio',
    date: today(),
    reference: 'PRO-2026-014',
    accent: '#5b5bd6',
    summary:
      'Acme’s current portal was built in 2016 and now costs more to maintain than it returns. This proposal sets out a three-phase replacement that keeps the existing integrations, ships value in the first eight weeks, and retires the legacy stack by the end of the year.',
    problem:
      'Support handles roughly 1,400 tickets a month that the portal should absorb. Page load times average 6.2 seconds on mobile, and the portal cannot be changed without a full release cycle.',
    solution:
      'A component-based rebuild on the existing API surface. We start with the three journeys that generate most support load — billing, account changes and order tracking — then migrate the remainder behind a feature flag.',
    deliverables: [
      'Audited component library with documentation',
      'Rebuilt billing, account and order-tracking journeys',
      'Migration plan and feature-flag rollout',
      'Handover workshops for the in-house team',
    ],
    timeline: [
      { phase: 'Phase 1 — Discovery', duration: '3 weeks', outcome: 'Validated scope and design system' },
      { phase: 'Phase 2 — Core journeys', duration: '8 weeks', outcome: 'Three journeys live behind a flag' },
      { phase: 'Phase 3 — Migration', duration: '6 weeks', outcome: 'Legacy portal retired' },
    ],
    currency: '$',
    taxLabel: 'Sales tax',
    taxRate: 0,
    discountType: 'amount',
    discount: 0,
    items: [
      { description: 'Phase 1 — Discovery', quantity: 1, rate: 18000 },
      { description: 'Phase 2 — Core journeys', quantity: 1, rate: 62000 },
      { description: 'Phase 3 — Migration and handover', quantity: 1, rate: 34000 },
    ],
    nextSteps: [
      'Confirm scope and phase boundaries',
      'Countersign this proposal',
      'Kick-off workshop within two weeks of signature',
    ],
    terms:
      'Fees are invoiced at the end of each phase, payable within 30 days. Either party may pause the engagement at a phase boundary with two weeks’ notice.',
  }),
  fileName: (data) => `proposal-${str(data, 'reference', 'draft')}`,
  render: (data) => {
    const currency = str(data, 'currency', '$');
    const totals = computeTotals(data);
    const accent = str(data, 'accent', '#5b5bd6');

    const blocks: DocBlock[] = [
      spacer(60),
      para([run(str(data, 'title'), { bold: true, size: 28, color: accent })]),
      ...(str(data, 'subtitle')
        ? [para([run(str(data, 'subtitle'), { size: 13, color: '#5b6274' })])]
        : []),
      spacer(30),
      {
        type: 'columns',
        ratio: 0.5,
        left: [
          para([run('Prepared for', { size: 8.5, bold: true, color: '#767c8c' })], { spaceAfter: 2 }),
          para([run(str(data, 'preparedFor'), { bold: true })]),
        ],
        right: [
          para([run('Prepared by', { size: 8.5, bold: true, color: '#767c8c' })], { spaceAfter: 2 }),
          para([run(str(data, 'preparedBy'), { bold: true })]),
        ],
      },
      spacer(12),
      para([
        run(`${formatDate(str(data, 'date'))}`, { size: 9.5, color: '#767c8c' }),
        ...(str(data, 'reference')
          ? [run(`   ·   Ref ${str(data, 'reference')}`, { size: 9.5, color: '#767c8c' })]
          : []),
      ]),
      { type: 'pagebreak' },
    ];

    const narrative: [string, string][] = [
      ['Executive summary', str(data, 'summary')],
      ['The problem', str(data, 'problem')],
      ['Proposed solution', str(data, 'solution')],
    ];

    for (const [title, body] of narrative) {
      if (!body.trim()) continue;
      blocks.push(heading(2, title));
      for (const paragraph of body.split(/\n{2,}/)) {
        blocks.push(para([run(paragraph.replace(/\n/g, ' ').trim())]));
      }
    }

    const deliverables = list(data, 'deliverables');
    if (deliverables.length) {
      blocks.push(heading(2, 'Deliverables'));
      blocks.push({
        type: 'list',
        ordered: false,
        items: deliverables.map((item) => ({ content: [run(item)] })),
      });
    }

    const timeline = rows(data, 'timeline');
    if (timeline.length) {
      blocks.push(heading(2, 'Timeline'));
      blocks.push({
        type: 'table',
        header: [
          [run('Phase', { bold: true })],
          [run('Duration', { bold: true })],
          [run('Outcome', { bold: true })],
        ],
        rows: timeline.map((item): TableCell[] => [
          [run(str(item, 'phase'), { bold: true })],
          [run(str(item, 'duration'))],
          [run(str(item, 'outcome'))],
        ]),
        widths: [2.2, 1, 3],
        repeatHeader: true,
      });
    }

    if (rows(data, 'items').length) {
      blocks.push(heading(2, 'Investment'));
      blocks.push(itemsTable(data, currency));
      blocks.push(totalsBlock(data, currency, totals));
    }

    const nextSteps = list(data, 'nextSteps');
    if (nextSteps.length) {
      blocks.push(heading(2, 'Next steps'));
      blocks.push({
        type: 'list',
        ordered: true,
        items: nextSteps.map((item) => ({ content: [run(item)] })),
      });
    }

    if (str(data, 'terms')) {
      blocks.push(heading(2, 'Terms'));
      blocks.push(para([run(str(data, 'terms'), { size: 9.5, color: '#5b6274' })]));
    }

    return blocks;
  },
};
