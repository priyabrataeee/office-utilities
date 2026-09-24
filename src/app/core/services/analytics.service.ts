import { DOCUMENT, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

type GtagArgs = [command: string, ...rest: unknown[]];

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: GtagArgs) => void;
  }
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly doc = inject(DOCUMENT);

  toolCompleted(): void {
    this.send('tool_complete', { tool: this.toolFromUrl() });
  }

  private toolFromUrl(): string {
    const path = this.doc.location?.pathname ?? '';
    return path.replace(/^\/+|\/+$/g, '') || 'home';
  }

  private send(event: string, params: Record<string, string | number>): void {
    if (!this.isBrowser) return;
    try {
      const win = this.doc.defaultView as Window | null;
      win?.gtag?.('event', event, params);
    } catch {}
  }
}
