import { DOCUMENT, Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { StorageService } from './storage.service';

const KEY = 'ads-optout';

type Gtag = (command: string, ...rest: unknown[]) => void;

@Injectable({ providedIn: 'root' })
export class PrivacyChoicesService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly storage = inject(StorageService);
  private readonly doc = inject(DOCUMENT);

  private readonly stored = signal(false);

  readonly gpcDetected = signal(false);

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
    } catch {}
  }
}
