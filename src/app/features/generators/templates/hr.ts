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
  amountInWords,
  bool,
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

/* Shared letterhead for HR correspondence ------------------------- */

function companyHeader(data: FormData): DocBlock[] {
  const lines = str(data, 'companyAddress')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return [
    para([run(str(data, 'companyName', 'Company Name'), { bold: true, size: 16 })], {
      align: 'center',
      spaceAfter: 2,
    }),
    ...lines.map((line) =>
      para([run(line, { size: 9, color: '#5b6274' })], { align: 'center', spaceAfter: 1 }),
    ),
    spacer(6),
    divider,
  ];
}

function signatureBlock(data: FormData, closing = 'Yours sincerely,'): DocBlock[] {
  return [
    spacer(20),
    para([run(closing)]),
    spacer(30),
    para([run(str(data, 'signatoryName', ''), { bold: true })], { spaceAfter: 1 }),
    ...(str(data, 'signatoryTitle')
      ? [para([run(str(data, 'signatoryTitle'), { size: 9.5, color: '#5b6274' })], { spaceAfter: 1 })]
      : []),
    para([run(str(data, 'companyName'), { size: 9.5, color: '#5b6274' })]),
  ];
}

const COMPANY_SECTION = {
  title: 'Company',
  icon: 'briefcase',
  fields: [
    { key: 'companyName', label: 'Company name', type: 'text' as const, span: 2 as const },
    {
      key: 'companyAddress',
      label: 'Company address',
      type: 'textarea' as const,
      rows: 2,
      span: 2 as const,
    },
    { key: 'signatoryName', label: 'Signed by', type: 'text' as const },
    { key: 'signatoryTitle', label: 'Signatory title', type: 'text' as const },
  ],
};

/* Salary slip ----------------------------------------------------- */

export const SALARY_SLIP: GeneratorDef = {
  toolId: 'salary-slip-generator',
  page: { size: 'A4', margin: 44, font: 'sans' },
  sections: [
    COMPANY_SECTION,
    {
      title: 'Pay period',
      icon: 'clock',
      fields: [
        { key: 'month', label: 'Pay period', type: 'text', placeholder: 'March 2026' },
        { key: 'payDate', label: 'Payment date', type: 'date' },
        { key: 'currency', label: 'Currency symbol', type: 'text' },
        { key: 'workingDays', label: 'Working days', type: 'number', min: 0, max: 31 },
        { key: 'paidDays', label: 'Days paid', type: 'number', min: 0, max: 31 },
        { key: 'lopDays', label: 'Loss-of-pay days', type: 'number', min: 0, max: 31 },
      ],
    },
    {
      title: 'Employee',
      icon: 'user',
      fields: [
        { key: 'employeeName', label: 'Employee name', type: 'text', span: 2 },
        { key: 'employeeId', label: 'Employee ID', type: 'text' },
        { key: 'designation', label: 'Designation', type: 'text' },
        { key: 'department', label: 'Department', type: 'text' },
        { key: 'joinDate', label: 'Date of joining', type: 'date' },
        { key: 'bankAccount', label: 'Bank account', type: 'text' },
        { key: 'taxId', label: 'Tax ID', type: 'text' },
      ],
    },
    {
      title: 'Earnings',
      icon: 'wallet',
      fields: [
        {
          key: 'earnings',
          label: 'Earnings',
          type: 'repeat',
          itemLabel: 'earning',
          span: 3,
          columns: [
            { key: 'label', label: 'Component', type: 'text', span: 2 },
            { key: 'amount', label: 'Amount', type: 'number', step: 0.01 },
          ],
        },
      ],
    },
    {
      title: 'Deductions',
      icon: 'minus',
      fields: [
        {
          key: 'deductions',
          label: 'Deductions',
          type: 'repeat',
          itemLabel: 'deduction',
          span: 3,
          columns: [
            { key: 'label', label: 'Component', type: 'text', span: 2 },
            { key: 'amount', label: 'Amount', type: 'number', step: 0.01 },
          ],
        },
      ],
    },
    {
      title: 'Footer',
      icon: 'info',
      fields: [
        { key: 'showWords', label: 'Show net pay in words', type: 'checkbox' },
        { key: 'note', label: 'Note', type: 'textarea', rows: 2, span: 3 },
      ],
    },
  ],
  initial: () => ({
    companyName: 'Northwind Studio',
    companyAddress: '18 Harbour Lane, Portland, OR 97201',
    signatoryName: 'A. Whitfield',
    signatoryTitle: 'Head of People',
    month: 'March 2026',
    payDate: today(),
    currency: '$',
    workingDays: 22,
    paidDays: 22,
    lopDays: 0,
    employeeName: 'Jordan Reyes',
    employeeId: 'NW-0142',
    designation: 'Senior Engineer',
    department: 'Product',
    joinDate: '2023-04-17',
    bankAccount: '•••• 4471',
    taxId: '',
    earnings: [
      { label: 'Basic salary', amount: 5200 },
      { label: 'House rent allowance', amount: 2080 },
      { label: 'Transport allowance', amount: 320 },
      { label: 'Performance bonus', amount: 600 },
    ],
    deductions: [
      { label: 'Income tax', amount: 1420 },
      { label: 'Provident fund', amount: 624 },
      { label: 'Health insurance', amount: 180 },
    ],
    showWords: true,
    note: 'This is a computer-generated payslip and does not require a signature.',
  }),
  fileName: (data) =>
    `payslip-${str(data, 'employeeId', 'employee')}-${str(data, 'month', '').replace(/\s+/g, '-')}`,
  render: (data) => {
    const currency = str(data, 'currency', '$');
    const earnings = rows(data, 'earnings');
    const deductions = rows(data, 'deductions');

    const grossPay = earnings.reduce((sum, item) => sum + num(item, 'amount'), 0);
    const totalDeductions = deductions.reduce((sum, item) => sum + num(item, 'amount'), 0);
    const netPay = grossPay - totalDeductions;

    // Both columns are padded to the same length so the table reads evenly.
    const maxRows = Math.max(earnings.length, deductions.length);
    const tableRows: TableCell[][] = [];
    for (let index = 0; index < maxRows; index++) {
      const earning = earnings[index];
      const deduction = deductions[index];
      tableRows.push([
        [run(earning ? str(earning, 'label') : '')],
        [run(earning ? money(num(earning, 'amount'), currency) : '')],
        [run(deduction ? str(deduction, 'label') : '')],
        [run(deduction ? money(num(deduction, 'amount'), currency) : '')],
      ]);
    }
    tableRows.push([
      [run('Gross earnings', { bold: true })],
      [run(money(grossPay, currency), { bold: true })],
      [run('Total deductions', { bold: true })],
      [run(money(totalDeductions, currency), { bold: true })],
    ]);

    const detail = (label: string, value: string): DocBlock =>
      para(
        [
          run(`${label}: `, { size: 9.5, color: '#767c8c' }),
          run(value || '—', { size: 9.5, bold: true }),
        ],
        { spaceAfter: 2 },
      );

    return [
      ...companyHeader(data),
      spacer(6),
      para([run(`Payslip — ${str(data, 'month')}`, { bold: true, size: 13 })], {
        align: 'center',
      }),
      spacer(10),
      {
        type: 'columns',
        ratio: 0.5,
        left: [
          detail('Employee', str(data, 'employeeName')),
          detail('Employee ID', str(data, 'employeeId')),
          detail('Designation', str(data, 'designation')),
          detail('Department', str(data, 'department')),
        ],
        right: [
          detail('Date of joining', formatDate(str(data, 'joinDate'))),
          detail('Payment date', formatDate(str(data, 'payDate'))),
          detail(
            'Days paid',
            `${num(data, 'paidDays')} of ${num(data, 'workingDays')}${
              num(data, 'lopDays') ? ` (LOP ${num(data, 'lopDays')})` : ''
            }`,
          ),
          detail('Bank account', str(data, 'bankAccount')),
        ],
      },
      spacer(10),
      {
        type: 'table',
        header: [
          [run('Earnings', { bold: true })],
          [run('Amount', { bold: true })],
          [run('Deductions', { bold: true })],
          [run('Amount', { bold: true })],
        ],
        rows: tableRows,
        widths: [2.4, 1.2, 2.4, 1.2],
        align: ['left', 'right', 'left', 'right'],
        repeatHeader: true,
      },
      spacer(8),
      {
        type: 'columns',
        ratio: 0.45,
        left: [],
        right: [
          para(
            [
              run('Net pay          ', { size: 13, bold: true }),
              run(money(netPay, currency), { size: 15, bold: true }),
            ],
            { align: 'right' },
          ),
        ],
      },
      ...(bool(data, 'showWords')
        ? [
            para(
              [
                run('In words: ', { size: 9.5, color: '#767c8c' }),
                run(amountInWords(netPay), { size: 9.5, italic: true }),
              ],
              { align: 'right' },
            ),
          ]
        : []),
      ...(str(data, 'note')
        ? [
            spacer(16),
            divider,
            para([run(str(data, 'note'), { size: 8.5, color: '#767c8c', italic: true })], {
              align: 'center',
            }),
          ]
        : []),
    ];
  },
};

/* Offer letter ---------------------------------------------------- */

export const OFFER_LETTER: GeneratorDef = {
  toolId: 'offer-letter-generator',
  page: { size: 'A4', margin: 60, font: 'serif' },
  sections: [
    COMPANY_SECTION,
    {
      title: 'Candidate',
      icon: 'user',
      fields: [
        { key: 'candidateName', label: 'Candidate name', type: 'text', span: 2 },
        { key: 'candidateAddress', label: 'Address', type: 'textarea', rows: 3, span: 2 },
        { key: 'letterDate', label: 'Letter date', type: 'date' },
      ],
    },
    {
      title: 'The role',
      icon: 'briefcase',
      fields: [
        { key: 'jobTitle', label: 'Job title', type: 'text', span: 2 },
        { key: 'department', label: 'Department', type: 'text' },
        { key: 'reportsTo', label: 'Reports to', type: 'text' },
        { key: 'location', label: 'Location', type: 'text' },
        { key: 'employmentType', label: 'Employment type', type: 'select', options: [
          { value: 'Full-time', label: 'Full-time' },
          { value: 'Part-time', label: 'Part-time' },
          { value: 'Fixed-term', label: 'Fixed-term' },
          { value: 'Contract', label: 'Contract' },
        ] },
        { key: 'startDate', label: 'Start date', type: 'date' },
      ],
    },
    {
      title: 'Terms',
      icon: 'wallet',
      fields: [
        { key: 'currency', label: 'Currency symbol', type: 'text' },
        { key: 'salary', label: 'Annual salary', type: 'number', min: 0, step: 100 },
        { key: 'salaryPeriod', label: 'Salary period', type: 'select', options: [
          { value: 'per year', label: 'Per year' },
          { value: 'per month', label: 'Per month' },
          { value: 'per hour', label: 'Per hour' },
        ] },
        { key: 'workingHours', label: 'Working hours', type: 'text' },
        { key: 'probation', label: 'Probation period', type: 'text' },
        { key: 'noticePeriod', label: 'Notice period', type: 'text' },
        { key: 'benefits', label: 'Benefits', type: 'list', itemLabel: 'benefit', span: 3 },
        { key: 'acceptBy', label: 'Accept by', type: 'date' },
      ],
    },
  ],
  initial: () => ({
    companyName: 'Northwind Studio',
    companyAddress: '18 Harbour Lane, Portland, OR 97201',
    signatoryName: 'A. Whitfield',
    signatoryTitle: 'Head of People',
    candidateName: 'Jordan Reyes',
    candidateAddress: '77 Alder Street\nPortland, OR 97209',
    letterDate: today(),
    jobTitle: 'Senior Engineer',
    department: 'Product',
    reportsTo: 'Director of Engineering',
    location: 'Portland, OR (hybrid)',
    employmentType: 'Full-time',
    startDate: today(30),
    currency: '$',
    salary: 124000,
    salaryPeriod: 'per year',
    workingHours: '40 hours per week, Monday to Friday',
    probation: 'Three months',
    noticePeriod: 'One month after probation',
    benefits: [
      'Private medical and dental cover',
      '25 days annual leave plus public holidays',
      'Annual learning budget',
      'Home-office allowance',
    ],
    acceptBy: today(14),
  }),
  fileName: (data) => `offer-letter-${str(data, 'candidateName', 'candidate').replace(/\s+/g, '-')}`,
  render: (data) => {
    const currency = str(data, 'currency', '$');
    const benefits = list(data, 'benefits');

    return [
      ...companyHeader(data),
      spacer(12),
      para([run(formatDate(str(data, 'letterDate')), { size: 9.5, color: '#767c8c' })]),
      spacer(8),
      para([run(str(data, 'candidateName'), { bold: true })], { spaceAfter: 1 }),
      ...str(data, 'candidateAddress')
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => para([run(line.trim(), { size: 9.5, color: '#5b6274' })], { spaceAfter: 1 })),
      spacer(14),
      para([run(`Dear ${str(data, 'candidateName').split(' ')[0] || 'Candidate'},`)]),
      para([
        run('We are delighted to offer you the position of '),
        run(str(data, 'jobTitle'), { bold: true }),
        run(` at ${str(data, 'companyName')}`),
        ...(str(data, 'department') ? [run(`, in the ${str(data, 'department')} team`)] : []),
        run('. This letter sets out the main terms of that offer.'),
      ]),
      heading(3, 'Position'),
      {
        type: 'table',
        rows: [
          [[run('Job title', { bold: true })], [run(str(data, 'jobTitle'))]],
          [[run('Employment type', { bold: true })], [run(str(data, 'employmentType'))]],
          [[run('Reports to', { bold: true })], [run(str(data, 'reportsTo'))]],
          [[run('Location', { bold: true })], [run(str(data, 'location'))]],
          [[run('Start date', { bold: true })], [run(formatDate(str(data, 'startDate')))]],
          [[run('Working hours', { bold: true })], [run(str(data, 'workingHours'))]],
        ],
        widths: [1.4, 3],
        compact: true,
      },
      heading(3, 'Compensation'),
      para([
        run('Your salary will be '),
        run(`${money(num(data, 'salary'), currency)} ${str(data, 'salaryPeriod')}`, { bold: true }),
        run(', paid monthly in arrears and subject to the usual statutory deductions.'),
      ]),
      ...(benefits.length
        ? [
            para([run('You will also be entitled to:')]),
            {
              type: 'list' as const,
              ordered: false,
              items: benefits.map((benefit) => ({ content: [run(benefit)] })),
            },
          ]
        : []),
      heading(3, 'Probation and notice'),
      para([
        run(
          `This offer is subject to a probation period of ${str(data, 'probation').toLowerCase()}. ` +
            `The notice period is ${str(data, 'noticePeriod').toLowerCase()}.`,
        ),
      ]),
      spacer(6),
      para([
        run('To accept, please sign and return a copy of this letter by '),
        run(formatDate(str(data, 'acceptBy')), { bold: true }),
        run('. We are very much looking forward to working with you.'),
      ]),
      ...signatureBlock(data),
      spacer(24),
      divider,
      para([run('Acceptance', { bold: true, size: 10 })], { spaceAfter: 4 }),
      para([
        run(
          'I accept the offer of employment on the terms set out in this letter.',
          { size: 9.5, color: '#5b6274' },
        ),
      ]),
      spacer(26),
      {
        type: 'columns',
        ratio: 0.5,
        left: [
          para([run('_________________________', { color: '#9aa2b4' })]),
          para([run('Signature', { size: 8.5, color: '#767c8c' })]),
        ],
        right: [
          para([run('_________________________', { color: '#9aa2b4' })]),
          para([run('Date', { size: 8.5, color: '#767c8c' })]),
        ],
      },
    ];
  },
};

/* Experience / relieving letter ------------------------------------ */

export const EXPERIENCE_LETTER: GeneratorDef = {
  toolId: 'experience-letter-generator',
  page: { size: 'A4', margin: 60, font: 'serif' },
  sections: [
    COMPANY_SECTION,
    {
      title: 'Letter type',
      icon: 'mail',
      fields: [
        {
          key: 'letterType',
          label: 'Type of letter',
          type: 'select',
          span: 2,
          options: [
            { value: 'experience', label: 'Experience certificate' },
            { value: 'service', label: 'Service certificate' },
            { value: 'relieving', label: 'Relieving letter' },
          ],
        },
        { key: 'letterDate', label: 'Letter date', type: 'date' },
        { key: 'reference', label: 'Reference', type: 'text' },
      ],
    },
    {
      title: 'Employee',
      icon: 'user',
      fields: [
        { key: 'employeeName', label: 'Employee name', type: 'text', span: 2 },
        { key: 'employeeId', label: 'Employee ID', type: 'text' },
        { key: 'designation', label: 'Last designation', type: 'text' },
        { key: 'department', label: 'Department', type: 'text' },
        { key: 'startDate', label: 'From', type: 'date' },
        { key: 'endDate', label: 'To', type: 'date' },
        { key: 'pronoun', label: 'Pronoun', type: 'select', options: [
          { value: 'they', label: 'They / them' },
          { value: 'she', label: 'She / her' },
          { value: 'he', label: 'He / him' },
        ] },
      ],
    },
    {
      title: 'Content',
      icon: 'file-text',
      fields: [
        { key: 'responsibilities', label: 'Responsibilities', type: 'list', itemLabel: 'responsibility', span: 3 },
        { key: 'conduct', label: 'Conduct statement', type: 'textarea', rows: 2, span: 3 },
        { key: 'closing', label: 'Closing wishes', type: 'textarea', rows: 2, span: 3 },
      ],
    },
  ],
  initial: () => ({
    companyName: 'Northwind Studio',
    companyAddress: '18 Harbour Lane, Portland, OR 97201',
    signatoryName: 'A. Whitfield',
    signatoryTitle: 'Head of People',
    letterType: 'experience',
    letterDate: today(),
    reference: 'HR/2026/0142',
    employeeName: 'Jordan Reyes',
    employeeId: 'NW-0142',
    designation: 'Senior Engineer',
    department: 'Product',
    startDate: '2023-04-17',
    endDate: today(),
    pronoun: 'they',
    responsibilities: [
      'Led the rebuild of the customer self-service portal',
      'Mentored two junior engineers through their first year',
      'Owned the release process and on-call rota',
    ],
    conduct: 'Throughout this period their conduct was professional and their work consistently to a high standard.',
    closing: 'We wish them every success in their future endeavours.',
  }),
  fileName: (data) =>
    `${str(data, 'letterType', 'experience')}-letter-${str(data, 'employeeName', 'employee').replace(/\s+/g, '-')}`,
  render: (data) => {
    const type = str(data, 'letterType', 'experience');
    const title =
      type === 'relieving'
        ? 'Relieving Letter'
        : type === 'service'
          ? 'Certificate of Service'
          : 'Experience Certificate';

    const pronoun = str(data, 'pronoun', 'they');
    const subject = pronoun === 'she' ? 'she' : pronoun === 'he' ? 'he' : 'they';
    const object = pronoun === 'she' ? 'her' : pronoun === 'he' ? 'him' : 'them';
    const possessive = pronoun === 'she' ? 'her' : pronoun === 'he' ? 'his' : 'their';
    const verb = subject === 'they' ? 'were' : 'was';

    const responsibilities = list(data, 'responsibilities');

    return [
      ...companyHeader(data),
      spacer(10),
      {
        type: 'columns',
        ratio: 0.5,
        left: [
          ...(str(data, 'reference')
            ? [para([run(`Ref: ${str(data, 'reference')}`, { size: 9.5, color: '#767c8c' })])]
            : []),
        ],
        right: [
          para([run(formatDate(str(data, 'letterDate')), { size: 9.5, color: '#767c8c' })], {
            align: 'right',
          }),
        ],
      },
      spacer(14),
      para([run(title.toUpperCase(), { bold: true, size: 13 })], { align: 'center' }),
      spacer(12),
      para([run('TO WHOM IT MAY CONCERN', { bold: true, size: 10 })]),
      spacer(6),
      para([
        run('This is to certify that '),
        run(str(data, 'employeeName'), { bold: true }),
        ...(str(data, 'employeeId')
          ? [run(` (Employee ID ${str(data, 'employeeId')})`)]
          : []),
        run(` ${verb} employed with ${str(data, 'companyName')} as `),
        run(str(data, 'designation'), { bold: true }),
        ...(str(data, 'department') ? [run(` in the ${str(data, 'department')} department`)] : []),
        run(` from `),
        run(formatDate(str(data, 'startDate')), { bold: true }),
        run(' to '),
        run(formatDate(str(data, 'endDate')), { bold: true }),
        run('.'),
      ]),
      ...(responsibilities.length
        ? [
            para([run(`During ${possessive} tenure, ${subject} ${verb} responsible for:`)]),
            {
              type: 'list' as const,
              ordered: false,
              items: responsibilities.map((item) => ({ content: [run(item)] })),
            },
          ]
        : []),
      ...(str(data, 'conduct') ? [para([run(str(data, 'conduct'))])] : []),
      ...(type === 'relieving'
        ? [
            para([
              run(
                `${subject.charAt(0).toUpperCase() + subject.slice(1)} ${
                  subject === 'they' ? 'have' : 'has'
                } been relieved of ${possessive} duties with effect from the close of business on ` +
                  `${formatDate(str(data, 'endDate'))}, and all company property has been returned.`,
              ),
            ]),
          ]
        : []),
      ...(str(data, 'closing')
        ? [para([run(str(data, 'closing').replace(/\bthem\b/g, object))])]
        : []),
      ...signatureBlock(data, 'For and on behalf of the company,'),
    ];
  },
};

/* Certificate ------------------------------------------------------ */

export const CERTIFICATE: GeneratorDef = {
  toolId: 'certificate-generator',
  page: { size: 'A4', orientation: 'landscape', margin: 54, font: 'serif' },
  sections: [
    {
      title: 'Certificate',
      icon: 'award',
      fields: [
        {
          key: 'certificateType',
          label: 'Type',
          type: 'select',
          span: 2,
          options: [
            { value: 'Certificate of Achievement', label: 'Achievement' },
            { value: 'Certificate of Completion', label: 'Completion' },
            { value: 'Certificate of Participation', label: 'Participation' },
            { value: 'Certificate of Appreciation', label: 'Appreciation' },
            { value: 'Certificate of Excellence', label: 'Excellence' },
          ],
        },
        { key: 'accent', label: 'Accent colour', type: 'color' },
        { key: 'recipient', label: 'Recipient name', type: 'text', span: 2 },
        { key: 'reason', label: 'Awarded for', type: 'textarea', rows: 2, span: 3 },
        { key: 'organisation', label: 'Issuing organisation', type: 'text', span: 2 },
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'certificateId', label: 'Certificate ID', type: 'text' },
      ],
    },
    {
      title: 'Signatures',
      icon: 'pencil',
      fields: [
        { key: 'signer1Name', label: 'First signatory', type: 'text' },
        { key: 'signer1Title', label: 'Their title', type: 'text' },
        { key: 'signer2Name', label: 'Second signatory', type: 'text' },
        { key: 'signer2Title', label: 'Their title', type: 'text' },
      ],
    },
  ],
  initial: () => ({
    certificateType: 'Certificate of Completion',
    accent: '#b3761a',
    recipient: 'Jordan Reyes',
    reason: 'successfully completing the Advanced Accessibility Practitioner programme',
    organisation: 'Northwind Studio',
    date: today(),
    certificateId: 'CERT-2026-0142',
    signer1Name: 'A. Whitfield',
    signer1Title: 'Programme Director',
    signer2Name: 'M. Oyelaran',
    signer2Title: 'Lead Instructor',
  }),
  fileName: (data) => `certificate-${str(data, 'recipient', 'recipient').replace(/\s+/g, '-')}`,
  render: (data) => {
    const accent = str(data, 'accent', '#b3761a');

    return [
      spacer(30),
      para([run(str(data, 'organisation').toUpperCase(), { size: 11, color: '#767c8c', bold: true })], {
        align: 'center',
      }),
      spacer(16),
      para([run(str(data, 'certificateType'), { size: 30, bold: true, color: accent })], {
        align: 'center',
      }),
      spacer(18),
      para([run('This is presented to', { size: 11, italic: true, color: '#5b6274' })], {
        align: 'center',
      }),
      spacer(10),
      para([run(str(data, 'recipient'), { size: 34, bold: true })], { align: 'center' }),
      spacer(6),
      divider,
      spacer(6),
      para([run(`for ${str(data, 'reason')}`, { size: 13, color: '#3a3f4d' })], {
        align: 'center',
      }),
      spacer(34),
      {
        type: 'columns',
        ratio: 0.5,
        left: [
          para([run('_______________________', { color: '#9aa2b4' })], { align: 'center' }),
          para([run(str(data, 'signer1Name'), { bold: true, size: 10 })], { align: 'center', spaceAfter: 1 }),
          para([run(str(data, 'signer1Title'), { size: 9, color: '#767c8c' })], { align: 'center' }),
        ],
        right: [
          para([run('_______________________', { color: '#9aa2b4' })], { align: 'center' }),
          para([run(str(data, 'signer2Name'), { bold: true, size: 10 })], { align: 'center', spaceAfter: 1 }),
          para([run(str(data, 'signer2Title'), { size: 9, color: '#767c8c' })], { align: 'center' }),
        ],
      },
      spacer(18),
      para(
        [
          run(formatDate(str(data, 'date')), { size: 9, color: '#767c8c' }),
          ...(str(data, 'certificateId')
            ? [run(`   ·   ${str(data, 'certificateId')}`, { size: 9, color: '#767c8c' })]
            : []),
        ],
        { align: 'center' },
      ),
    ];
  },
};
