import { DOCUMENT, DestroyRef, Injectable, PLATFORM_ID, afterNextRender, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MONETIZATION } from '../site.config';
import { isAdEligiblePath } from '../data/ad-policy';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

@Injectable({ providedIn: 'root' })
export class MonetizationService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly doc = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private loaderStarted = false;

  constructor() {
    afterNextRender(() => {
      if (!MONETIZATION.adsense.enabled) return;
      this.loadForCurrentPage();
      this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
        if (event instanceof NavigationStart && this.loaderStarted && !isAdEligiblePath(event.url)) {
          this.doc.defaultView?.location.assign(event.url);
        }
        if (event instanceof NavigationEnd) this.loadForCurrentPage();
      });
    });
  }

  private loadForCurrentPage(): void {
    if (!this.adsEnabled || this.loaderStarted) return;
    this.loaderStarted = true;
    const script = this.doc.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${this.adClient}`;
    this.doc.head.appendChild(script);
  }

  readonly donationUrl = MONETIZATION.donationUrl;

  get adsEnabled(): boolean {
    return this.isBrowser && MONETIZATION.adsense.enabled && isAdEligiblePath(this.router.url);
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
