import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MONETIZATION } from '../site.config';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

@Injectable({ providedIn: 'root' })
export class MonetizationService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly donationUrl = MONETIZATION.donationUrl;

  get adsEnabled(): boolean {
    return this.isBrowser && MONETIZATION.adsense.enabled;
  }

  readonly adClient = MONETIZATION.adsense.client;

  slotFor(placement: string): string {
    return MONETIZATION.adsense.slots[placement] ?? '';
  }

  fillSlot(): void {
    if (!this.adsEnabled) return;
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch {}
  }
}
