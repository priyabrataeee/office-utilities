import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MONETIZATION } from '../site.config';

/**
 * Single point of truth for anything revenue-related.
 *
 * Components ask this service what to render rather than reading config or
 * touching `window` themselves, which keeps provider details in one place and
 * guarantees nothing ad-related executes during prerendering.
 */

/** AdSense's queue. Pushing an object tells it to fill the newest `<ins>`. */
declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

@Injectable({ providedIn: 'root' })
export class MonetizationService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly donationUrl = MONETIZATION.donationUrl;

  /**
   * Ads never render on the server: the markup would be prerendered into every
   * page and then fought over by hydration, and AdSense would be counting
   * impressions nobody saw.
   */
  get adsEnabled(): boolean {
    return this.isBrowser && MONETIZATION.adsense.enabled;
  }

  get ethicalAdsEnabled(): boolean {
    return (
      this.isBrowser &&
      MONETIZATION.ethicalAds.enabled &&
      !!MONETIZATION.ethicalAds.publisher
    );
  }

  readonly adClient = MONETIZATION.adsense.client;

  /**
   * The AdSense ad unit id for a placement, or '' when none is configured.
   *
   * Returning '' is deliberate: an `<ins class="adsbygoogle">` with no valid
   * slot does not render an ad, it just logs errors. Auto ads still work
   * without any unit ids, so an unconfigured placement should draw nothing.
   */
  slotFor(placement: string): string {
    return MONETIZATION.adsense.slots[placement] ?? '';
  }

  /**
   * Asks AdSense to fill the most recently rendered slot.
   *
   * Safe to call before the loader script has arrived — it is an async script,
   * and pushing onto the array it later picks up is the documented pattern.
   */
  fillSlot(): void {
    if (!this.adsEnabled) return;
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch {
      // A blocked or failed loader must never take a tool down with it.
    }
  }
}
