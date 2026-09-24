declare const _OU_ORIGIN_: string | undefined;

const resolvedOrigin = (() => {
  try {
    return typeof _OU_ORIGIN_ === 'string' && _OU_ORIGIN_
      ? _OU_ORIGIN_
      : 'https://office-utilities.org';
  } catch {
    return 'https://office-utilities.org';
  }
})();

export const SITE = {
  name: 'Office Utilities',
  shortName: 'OfficeUtils',
  origin: resolvedOrigin.replace(/\/+$/, ''),
  tagline: 'Your files never leave your computer.',
  description:
    'A privacy-first suite of browser-based office tools. View, convert, edit and generate PDF, Word, Excel and PowerPoint documents entirely on your own device — no uploads, no accounts, no servers.',
  locale: 'en',
  twitter: '@officeutilities',
  themeColor: '#5b5bd6',
  version: '1.0.0',
  repoUrl: 'https://github.com/priyabrataeee/office-utilities',
  author: {
    name: 'Priyabrata Saha',
    url: 'https://github.com/priyabrataeee',
    role: 'Built and maintains Office Utilities',
    email: 'priyabrata.saha@office-utilities.org',
    sameAs: [
      'https://github.com/priyabrataeee',
      'https://medium.com/@stream2085',
    ],
  },
} as const;

export const MONETIZATION = {
  donationUrl: 'https://buymeacoffee.com/priyabrataeee',

  adsense: {
    enabled: true,
    client: 'ca-pub-4291402082894202',
    slots: {
      toolFooter: '6795054730',
      guideInline: '6795054730',
      guideFooter: '6795054730',
      listing: '',
    } as Record<string, string>,
  },
} as const;
