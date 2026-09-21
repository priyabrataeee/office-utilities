import { DOCUMENT, Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { StorageService } from './storage.service';

/** Matches the key read by the inline script in index.html. */
const KEY = 'ads-optout';

type Gtag = (command: string, ...rest: unknown[]) => void;

/**
 * The visitor's advertising choice, for US state privacy laws.
 *
 * California and a growing list of other states give people the right to opt
 * out of the "sale" or "sharing" of personal information for cross-context
 * advertising, and require that the choice be easy to find and easy to make.
 * California additionally requires the Global Privacy Control browser signal
 * to be honoured as that opt-out.
 *
 * Both paths converge on the same state:
 *
 *   - GPC is detected by the inline script in index.html, before the tag loads.
 *   - An explicit choice made here is stored and read by that same script on
 *     the next page load, so it survives navigation and return visits.
 *
 * Analytics is intentionally not part of this. Counting page views is not a
 * sale, and bundling the two would mean a reader who objects to ad profiling
 * silently loses the ability to be counted at all.
 */
@Injectable({ providedIn: 'root' })
export class PrivacyChoicesService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly storage = inject(StorageService);
  private readonly doc = inject(DOCUMENT);

  private readonly stored = signal(false);

  /** True when the browser sent a Global Privacy Control signal. */
  readonly gpcDetected = signal(false);

  /**
   * Whether personalised advertising is currently off. A GPC signal cannot be
   * overridden from the page: the browser has already spoken for the visitor.
   */
  readonly adsOptedOut = computed(() => this.gpcDetected() || this.stored());

  constructor() {
    if (!this.isBrowser) return;
    this.stored.set(this.storage.read<boolean>(KEY, false));
    const nav = this.doc.defaultView?.navigator as
      | (Navigator & { globalPrivacyControl?: boolean })
      | undefined;
    this.gpcDetected.set(nav?.globalPrivacyControl === true);
  }

  setAdsOptOut(optOut: boolean): void {
    if (!this.isBrowser || this.gpcDetected()) return;
    this.stored.set(optOut);
    this.storage.write(KEY, optOut);
    this.apply(optOut);
  }

  /**
   * Tells Google immediately, so the choice takes effect on this page rather
   * than only after a reload.
   */
  private apply(optOut: boolean): void {
    const win = this.doc.defaultView as (Window & { gtag?: Gtag }) | null;
    const gtag = win?.gtag;
    if (!gtag) return;
    try {
      gtag('consent', 'update', {
        ad_storage: optOut ? 'denied' : 'granted',
        ad_user_data: optOut ? 'denied' : 'granted',
        ad_personalization: optOut ? 'denied' : 'granted',
      });
      gtag('set', 'restricted_data_processing', optOut);
    } catch {
      // A blocked or absent tag is not an error the visitor should see.
    }
  }
}
