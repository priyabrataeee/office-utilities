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
  /**
   * Public source. Linked wherever the site claims files are not uploaded,
   * because that claim is only checkable if the reader can find the code.
   */
  repoUrl: 'https://github.com/priyabrataeee/office-utilities',
} as const;

/**
 * Revenue configuration.
 *
 * Kept here rather than inside components so a provider can be switched on
 * or off without touching markup. Anything disabled renders nothing at all —
 * an empty ad frame looks broken and costs trust on a privacy-first site.
 */
export const MONETIZATION = {
  /** Linked from the footer. A plain link, so it costs no third-party JS. */
  donationUrl: 'https://buymeacoffee.com/priyabrataeee',

  adsense: {
    enabled: true,
    client: 'ca-pub-4291402082894202',
    /**
     * Ad unit ids from the AdSense dashboard, per placement. A placement
     * with no id renders nothing: Auto ads still fill the page, and an
     * <ins> without a valid slot only produces console errors.
     */
    slots: {
      /** First live unit, shown below the tool and its explanation. */
      toolFooter: '6795054730',
      /**
       * Guide placements. Both point at the responsive unit above until
       * dedicated units exist in the dashboard — the same unit may appear
       * more than once on a page, and an id that is merely reused still
       * serves, whereas an empty one renders nothing at all. Give them their
       * own ids when per-placement reporting becomes worth having.
       */
      guideInline: '6795054730',
      guideFooter: '6795054730',
      listing: '',
    } as Record<string, string>,
  },

  /** Awaiting a publisher id; wired up and ready to enable. */
  ethicalAds: {
    enabled: false,
    publisher: '',
    type: 'text',
  },
} as const;
