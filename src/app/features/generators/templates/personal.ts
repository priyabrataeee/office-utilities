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
  rows,
  str,
  today,
  type FormData,
  type GeneratorDef,
} from '../generator.model';

/* Resume ----------------------------------------------------------- */

export const RESUME: GeneratorDef = {
  toolId: 'resume-builder',
  page: { size: 'A4', margin: 44, font: 'sans' },
  sections: [
    {
      title: 'Contact',
      icon: 'user',
      fields: [
        { key: 'fullName', label: 'Full name', type: 'text', span: 2 },
        { key: 'headline', label: 'Headline', type: 'text', span: 2, placeholder: 'Senior Engineer' },
        { key: 'email', label: 'Email', type: 'text' },
        { key: 'phone', label: 'Phone', type: 'text' },
        { key: 'location', label: 'Location', type: 'text' },
        { key: 'website', label: 'Website or LinkedIn', type: 'text', span: 2 },
      ],
    },
    {
      title: 'Summary',
      icon: 'file-text',
      fields: [
        {
          key: 'summary',
          label: 'Professional summary',
          type: 'textarea',
          rows: 4,
          span: 3,
          help: 'Two or three sentences. Lead with what you do and the scale you do it at.',
        },
      ],
    },
    {
      title: 'Experience',
      icon: 'briefcase',
      fields: [
        {
          key: 'experience',
          label: 'Roles',
          type: 'repeat',
          itemLabel: 'role',
          span: 3,
          columns: [
            { key: 'title', label: 'Job title', type: 'text', span: 2 },
            { key: 'company', label: 'Company', type: 'text', span: 2 },
            { key: 'period', label: 'Period', type: 'text' },
            { key: 'location', label: 'Location', type: 'text' },
            {
              key: 'highlights',
              label: 'Highlights (one per line)',
              type: 'textarea',
              rows: 3,
              span: 3,
            },
          ],
        },
      ],
    },
    {
      title: 'Education',
      icon: 'award',
      fields: [
        {
          key: 'education',
          label: 'Qualifications',
          type: 'repeat',
          itemLabel: 'qualification',
          span: 3,
          columns: [
            { key: 'qualification', label: 'Qualification', type: 'text', span: 2 },
            { key: 'institution', label: 'Institution', type: 'text', span: 2 },
            { key: 'period', label: 'Period', type: 'text' },
            { key: 'detail', label: 'Detail', type: 'text', span: 2 },
          ],
        },
      ],
    },
    {
      title: 'Skills & projects',
      icon: 'sparkles',
      fields: [
        { key: 'skills', label: 'Skills', type: 'list', itemLabel: 'skill', span: 3 },
        {
          key: 'projects',
          label: 'Projects',
          type: 'repeat',
          itemLabel: 'project',
          span: 3,
          columns: [
            { key: 'name', label: 'Project', type: 'text', span: 2 },
            { key: 'link', label: 'Link', type: 'text', span: 2 },
            { key: 'description', label: 'Description', type: 'textarea', rows: 2, span: 3 },
          ],
        },
        { key: 'languages', label: 'Languages', type: 'list', itemLabel: 'language', span: 3 },
      ],
    },
  ],
  initial: () => ({
    fullName: 'Jordan Reyes',
    headline: 'Senior Frontend Engineer',
    email: 'jordan.reyes@example.com',
    phone: '+1 555 0142',
    location: 'Portland, OR',
    website: 'linkedin.com/in/jordanreyes',
    summary:
      'Frontend engineer with eight years building accessible, high-traffic web applications. Led the rebuild of a self-service portal used by 400,000 customers a month, cutting support contacts by a third.',
    experience: [
      {
        title: 'Senior Frontend Engineer',
        company: 'Northwind Studio',
        period: '2023 — present',
        location: 'Portland, OR',
        highlights:
          'Led the rebuild of the customer portal, reducing median load time from 6.2s to 1.4s\nIntroduced an accessibility test suite that blocks regressions at pull-request time\nMentored two junior engineers through their first year',
      },
      {
        title: 'Frontend Engineer',
        company: 'Cascade Digital',
        period: '2019 — 2023',
        location: 'Remote',
        highlights:
          'Built the design system used across six product teams\nMigrated the checkout flow to server-side rendering, improving conversion by 8%',
      },
    ],
    education: [
      {
        qualification: 'BSc Computer Science',
        institution: 'University of Oregon',
        period: '2015 — 2019',
        detail: 'First class honours',
      },
    ],
    skills: [
      'TypeScript',
      'Angular',
      'React',
      'Accessibility (WCAG 2.2)',
      'Performance profiling',
      'Design systems',
      'Testing (Playwright, Vitest)',
    ],
    projects: [
      {
        name: 'a11y-audit',
        link: 'github.com/example/a11y-audit',
        description: 'Open-source CLI that reports WCAG violations against a live site, used by 1.2k repositories.',
      },
    ],
    languages: ['English (native)', 'Spanish (professional)'],
  }),
  fileName: (data) => `resume-${str(data, 'fullName', 'resume').replace(/\s+/g, '-').toLowerCase()}`,
  render: (data) => {
    const blocks: DocBlock[] = [];

    blocks.push(para([run(str(data, 'fullName'), { bold: true, size: 22 })], { spaceAfter: 2 }));
    if (str(data, 'headline')) {
      blocks.push(
        para([run(str(data, 'headline'), { size: 12, color: '#5b5bd6' })], { spaceAfter: 4 }),
      );
    }

    const contact = [
      str(data, 'email'),
      str(data, 'phone'),
      str(data, 'location'),
      str(data, 'website'),
    ].filter(Boolean);
    if (contact.length) {
      blocks.push(para([run(contact.join('   ·   '), { size: 9.5, color: '#5b6274' })]));
    }

    blocks.push(divider);

    if (str(data, 'summary')) {
      blocks.push(sectionHeading('Summary'));
      blocks.push(para([run(str(data, 'summary'), { size: 10 })]));
    }

    const experience = rows(data, 'experience');
    if (experience.length) {
      blocks.push(sectionHeading('Experience'));
      for (const role of experience) {
        blocks.push({
          type: 'columns',
          ratio: 0.68,
          left: [
            para([run(str(role, 'title'), { bold: true, size: 11 })], { spaceAfter: 1 }),
            para([run(str(role, 'company'), { size: 10, color: '#5b6274' })], { spaceAfter: 2 }),
          ],
          right: [
            para([run(str(role, 'period'), { size: 9.5, color: '#767c8c' })], {
              align: 'right',
              spaceAfter: 1,
            }),
            ...(str(role, 'location')
              ? [
                  para([run(str(role, 'location'), { size: 9.5, color: '#767c8c' })], {
                    align: 'right',
                  }),
                ]
              : []),
          ],
        });

        const highlights = splitLines(str(role, 'highlights'));
        if (highlights.length) {
          blocks.push({
            type: 'list',
            ordered: false,
            items: highlights.map((line) => ({ content: [run(line, { size: 10 })] })),
          });
        }
        blocks.push(spacer(4));
      }
    }

    const education = rows(data, 'education');
    if (education.length) {
      blocks.push(sectionHeading('Education'));
      for (const entry of education) {
        blocks.push({
          type: 'columns',
          ratio: 0.68,
          left: [
            para([run(str(entry, 'qualification'), { bold: true, size: 10.5 })], { spaceAfter: 1 }),
            para(
              [
                run(str(entry, 'institution'), { size: 10, color: '#5b6274' }),
                ...(str(entry, 'detail')
                  ? [run(`  ·  ${str(entry, 'detail')}`, { size: 9.5, color: '#767c8c' })]
                  : []),
              ],
              { spaceAfter: 2 },
            ),
          ],
          right: [
            para([run(str(entry, 'period'), { size: 9.5, color: '#767c8c' })], { align: 'right' }),
          ],
        });
      }
    }

    const skills = list(data, 'skills');
    if (skills.length) {
      blocks.push(sectionHeading('Skills'));
      blocks.push(para([run(skills.join('  ·  '), { size: 10 })]));
    }

    const projects = rows(data, 'projects');
    if (projects.length) {
      blocks.push(sectionHeading('Projects'));
      for (const project of projects) {
        blocks.push(
          para(
            [
              run(str(project, 'name'), { bold: true, size: 10.5 }),
              ...(str(project, 'link')
                ? [
                    run('  —  ', { size: 10, color: '#767c8c' }),
                    run(str(project, 'link'), {
                      size: 9.5,
                      href: normaliseUrl(str(project, 'link')),
                    }),
                  ]
                : []),
            ],
            { spaceAfter: 1 },
          ),
        );
        if (str(project, 'description')) {
          blocks.push(para([run(str(project, 'description'), { size: 10 })]));
        }
      }
    }

    const languages = list(data, 'languages');
    if (languages.length) {
      blocks.push(sectionHeading('Languages'));
      blocks.push(para([run(languages.join('  ·  '), { size: 10 })]));
    }

    return blocks;
  },
};

function sectionHeading(title: string): DocBlock {
  return {
    type: 'heading',
    level: 3,
    content: [run(title.toUpperCase(), { bold: true, size: 10.5, color: '#5b5bd6' })],
  };
}

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
}

function normaliseUrl(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

/* Cover letter ------------------------------------------------------ */

export const COVER_LETTER: GeneratorDef = {
  toolId: 'cover-letter-generator',
  page: { size: 'A4', margin: 60, font: 'serif' },
  sections: [
    {
      title: 'You',
      icon: 'user',
      fields: [
        { key: 'fullName', label: 'Your name', type: 'text', span: 2 },
        { key: 'email', label: 'Email', type: 'text' },
        { key: 'phone', label: 'Phone', type: 'text' },
        { key: 'address', label: 'Your address', type: 'textarea', rows: 2, span: 2 },
        { key: 'date', label: 'Date', type: 'date' },
      ],
    },
    {
      title: 'Recipient',
      icon: 'mail',
      fields: [
        { key: 'hiringManager', label: 'Hiring manager', type: 'text' },
        { key: 'company', label: 'Company', type: 'text' },
        { key: 'companyAddress', label: 'Company address', type: 'textarea', rows: 2, span: 2 },
        { key: 'role', label: 'Role applied for', type: 'text', span: 2 },
        { key: 'source', label: 'Where you saw it', type: 'text' },
      ],
    },
    {
      title: 'Letter',
      icon: 'file-text',
      fields: [
        {
          key: 'opening',
          label: 'Opening paragraph',
          type: 'textarea',
          rows: 3,
          span: 3,
          help: 'Why this role, at this company, now.',
        },
        {
          key: 'evidence',
          label: 'Evidence paragraphs (one per line)',
          type: 'textarea',
          rows: 5,
          span: 3,
          help: 'Each line becomes its own paragraph. Map your experience to what the advert asked for.',
        },
        { key: 'closing', label: 'Closing paragraph', type: 'textarea', rows: 3, span: 3 },
        { key: 'signOff', label: 'Sign-off', type: 'text' },
      ],
    },
  ],
  initial: () => ({
    fullName: 'Jordan Reyes',
    email: 'jordan.reyes@example.com',
    phone: '+1 555 0142',
    address: '77 Alder Street\nPortland, OR 97209',
    date: today(),
    hiringManager: 'Hiring Manager',
    company: 'Acme Corporation',
    companyAddress: '400 Market Street\nSan Francisco, CA 94111',
    role: 'Senior Frontend Engineer',
    source: 'your careers page',
    opening:
      'I am writing to apply for the Senior Frontend Engineer role advertised on your careers page. Acme’s recent work on the self-service portal is exactly the kind of problem I have spent the last three years on, and I would like to help with what comes next.',
    evidence:
      'At Northwind Studio I led the rebuild of a customer portal serving 400,000 people a month. Median load time fell from 6.2 to 1.4 seconds, and support contacts about account changes dropped by a third within two quarters.\nAccessibility is not an afterthought in my work. I introduced an automated WCAG suite that blocks regressions at pull-request time, which took our audit findings from 47 issues to 3 in six months.\nI also enjoy the mentoring side of a senior role: two junior engineers on my team shipped independently within their first year.',
    closing:
      'I would welcome the chance to talk about how I could contribute to your team. Thank you for considering my application.',
    signOff: 'Yours sincerely,',
  }),
  fileName: (data) =>
    `cover-letter-${str(data, 'company', 'application').replace(/\s+/g, '-').toLowerCase()}`,
  render: (data) => {
    const evidence = str(data, 'evidence')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const greeting = str(data, 'hiringManager').trim();
    const salutation =
      !greeting || /hiring manager/i.test(greeting)
        ? 'Dear Hiring Manager,'
        : `Dear ${greeting},`;

    return [
      para([run(str(data, 'fullName'), { bold: true, size: 14 })], { spaceAfter: 2 }),
      ...str(data, 'address')
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => para([run(line.trim(), { size: 9.5, color: '#5b6274' })], { spaceAfter: 1 })),
      para(
        [
          run(
            [str(data, 'email'), str(data, 'phone')].filter(Boolean).join('   ·   '),
            { size: 9.5, color: '#5b6274' },
          ),
        ],
      ),
      spacer(16),
      para([run(formatDate(str(data, 'date')), { size: 9.5, color: '#767c8c' })]),
      spacer(12),
      ...(str(data, 'hiringManager')
        ? [para([run(str(data, 'hiringManager'), { bold: true })], { spaceAfter: 1 })]
        : []),
      para([run(str(data, 'company'), { bold: true })], { spaceAfter: 1 }),
      ...str(data, 'companyAddress')
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => para([run(line.trim(), { size: 9.5, color: '#5b6274' })], { spaceAfter: 1 })),
      spacer(16),
      ...(str(data, 'role')
        ? [
            para([run(`Re: ${str(data, 'role')}`, { bold: true })]),
            spacer(6),
          ]
        : []),
      para([run(salutation)]),
      ...(str(data, 'opening') ? [para([run(str(data, 'opening'))])] : []),
      ...evidence.map((paragraph) => para([run(paragraph)])),
      ...(str(data, 'closing') ? [para([run(str(data, 'closing'))])] : []),
      spacer(14),
      para([run(str(data, 'signOff', 'Yours sincerely,'))]),
      spacer(28),
      para([run(str(data, 'fullName'), { bold: true })]),
    ];
  },
};

/* Meeting minutes --------------------------------------------------- */

export const MEETING_MINUTES: GeneratorDef = {
  toolId: 'meeting-minutes-generator',
  page: { size: 'A4', margin: 50, font: 'sans' },
  sections: [
    {
      title: 'Meeting',
      icon: 'clipboard',
      fields: [
        { key: 'title', label: 'Meeting title', type: 'text', span: 2 },
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'time', label: 'Time', type: 'text', placeholder: '10:00 — 11:00' },
        { key: 'location', label: 'Location', type: 'text', span: 2 },
        { key: 'chair', label: 'Chaired by', type: 'text' },
        { key: 'minutedBy', label: 'Minuted by', type: 'text' },
      ],
    },
    {
      title: 'Attendance',
      icon: 'users',
      fields: [
        { key: 'attendees', label: 'Present', type: 'list', itemLabel: 'attendee', span: 3 },
        { key: 'apologies', label: 'Apologies', type: 'list', itemLabel: 'name', span: 3 },
      ],
    },
    {
      title: 'Agenda & discussion',
      icon: 'file-text',
      fields: [
        {
          key: 'items',
          label: 'Agenda items',
          type: 'repeat',
          itemLabel: 'item',
          span: 3,
          columns: [
            { key: 'topic', label: 'Topic', type: 'text', span: 2 },
            { key: 'lead', label: 'Led by', type: 'text' },
            { key: 'discussion', label: 'Discussion', type: 'textarea', rows: 3, span: 3 },
            { key: 'decision', label: 'Decision', type: 'textarea', rows: 2, span: 3 },
          ],
        },
      ],
    },
    {
      title: 'Actions',
      icon: 'check-circle',
      fields: [
        {
          key: 'actions',
          label: 'Action items',
          type: 'repeat',
          itemLabel: 'action',
          span: 3,
          columns: [
            { key: 'action', label: 'Action', type: 'text', span: 3 },
            { key: 'owner', label: 'Owner', type: 'text' },
            { key: 'due', label: 'Due', type: 'text' },
          ],
        },
        { key: 'nextMeeting', label: 'Next meeting', type: 'text', span: 2 },
      ],
    },
  ],
  initial: () => ({
    title: 'Portal rebuild — weekly steering',
    date: today(),
    time: '10:00 — 11:00',
    location: 'Room 3B / video',
    chair: 'A. Whitfield',
    minutedBy: 'J. Reyes',
    attendees: ['A. Whitfield (chair)', 'J. Reyes', 'M. Oyelaran', 'S. Kapoor'],
    apologies: ['T. Lindqvist'],
    items: [
      {
        topic: 'Phase 2 progress',
        lead: 'J. Reyes',
        discussion:
          'Billing and account journeys are behind the feature flag in staging. Order tracking is two days behind because of an upstream API change.',
        decision: 'Hold the flag rollout until order tracking is on staging, targeting Thursday.',
      },
      {
        topic: 'Support ticket baseline',
        lead: 'S. Kapoor',
        discussion:
          'March baseline confirmed at 1,412 portal-related tickets. Dashboard is now updating nightly.',
        decision: 'Adopt the March figure as the baseline for the 30% reduction target.',
      },
    ],
    actions: [
      { action: 'Confirm the upstream API contract with the platform team', owner: 'J. Reyes', due: 'Wed' },
      { action: 'Share the nightly dashboard link with the steering group', owner: 'S. Kapoor', due: 'Tue' },
      { action: 'Draft the rollout comms for support', owner: 'M. Oyelaran', due: 'Next Mon' },
    ],
    nextMeeting: 'Thursday, same time',
  }),
  fileName: (data) => `minutes-${str(data, 'date', 'meeting')}`,
  render: (data) => {
    const blocks: DocBlock[] = [
      para([run(str(data, 'title'), { bold: true, size: 18 })], { spaceAfter: 3 }),
      para(
        [
          run(
            [
              formatDate(str(data, 'date')),
              str(data, 'time'),
              str(data, 'location'),
            ]
              .filter(Boolean)
              .join('   ·   '),
            { size: 9.5, color: '#5b6274' },
          ),
        ],
      ),
      divider,
    ];

    const attendees = list(data, 'attendees');
    const apologies = list(data, 'apologies');

    blocks.push({
      type: 'columns',
      ratio: 0.5,
      left: [
        para([run('Present', { size: 8.5, bold: true, color: '#767c8c' })], { spaceAfter: 2 }),
        ...(attendees.length
          ? attendees.map((name) => para([run(name, { size: 10 })], { spaceAfter: 1 }))
          : [para([run('—', { size: 10, color: '#9aa2b4' })])]),
      ],
      right: [
        para([run('Apologies', { size: 8.5, bold: true, color: '#767c8c' })], { spaceAfter: 2 }),
        ...(apologies.length
          ? apologies.map((name) => para([run(name, { size: 10 })], { spaceAfter: 1 }))
          : [para([run('None', { size: 10, color: '#9aa2b4' })])]),
      ],
    });

    if (str(data, 'chair') || str(data, 'minutedBy')) {
      blocks.push(
        para(
          [
            run(
              [
                str(data, 'chair') ? `Chaired by ${str(data, 'chair')}` : '',
                str(data, 'minutedBy') ? `Minuted by ${str(data, 'minutedBy')}` : '',
              ]
                .filter(Boolean)
                .join('   ·   '),
              { size: 9.5, color: '#767c8c' },
            ),
          ],
          { spaceBefore: 6 },
        ),
      );
    }

    const items = rows(data, 'items');
    if (items.length) {
      blocks.push(heading(2, 'Discussion'));
      items.forEach((item, index) => {
        blocks.push(
          para(
            [
              run(`${index + 1}. ${str(item, 'topic')}`, { bold: true, size: 11.5 }),
              ...(str(item, 'lead')
                ? [run(`   —   ${str(item, 'lead')}`, { size: 9.5, color: '#767c8c' })]
                : []),
            ],
            { spaceBefore: 6, spaceAfter: 3 },
          ),
        );
        if (str(item, 'discussion')) {
          blocks.push(para([run(str(item, 'discussion'), { size: 10 })]));
        }
        if (str(item, 'decision')) {
          blocks.push({
            type: 'quote',
            content: [
              run('Decision: ', { bold: true, size: 10 }),
              run(str(item, 'decision'), { size: 10 }),
            ],
          });
        }
      });
    }

    const actions = rows(data, 'actions');
    if (actions.length) {
      blocks.push(heading(2, 'Actions'));
      blocks.push({
        type: 'table',
        header: [
          [run('#', { bold: true })],
          [run('Action', { bold: true })],
          [run('Owner', { bold: true })],
          [run('Due', { bold: true })],
        ],
        rows: actions.map((action, index): TableCell[] => [
          [run(String(index + 1))],
          [run(str(action, 'action'))],
          [run(str(action, 'owner'))],
          [run(str(action, 'due'))],
        ]),
        widths: [0.5, 5, 1.4, 1.2],
        repeatHeader: true,
      });
    }

    if (str(data, 'nextMeeting')) {
      blocks.push(spacer(10));
      blocks.push(
        para([
          run('Next meeting: ', { bold: true, size: 10 }),
          run(str(data, 'nextMeeting'), { size: 10 }),
        ]),
      );
    }

    return blocks;
  },
};
