/**
 * Site-wide constants used for SEO, manifests and structured data.
 *
 * At build time `OU_SITE_ORIGIN` is substituted for the compile-time constant
 * `_OU_ORIGIN_`, so a deployment can point at any domain without editing
 * source. Falls back to the placeholder domain during `ng serve`.
 */

/** Injected by the build pipeline via `define`. See angular.json. */
declare const _OU_ORIGIN_: string | undefined;

const resolvedOrigin = (() => {
  try {
    return typeof _OU_ORIGIN_ === 'string' && _OU_ORIGIN_
      ? _OU_ORIGIN_
      : 'https://officeutilities.app';
  } catch {
    return 'https://officeutilities.app';
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
} as const;
