import { DOCUMENT, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * The one place a custom analytics event may be sent from.
 *
 * GA4 on its own reports page views, which say which tools people open and
 * nothing about whether the tools worked. A single success event closes that
 * gap without turning the app into a tracked funnel.
 *
 * The hard rule, and the reason this is a service rather than a `gtag` call
 * scattered through the tools: **nothing derived from the user's file may be
 * passed in**. Not the file name, not its size, not its contents, not its
 * metadata. The tool's own identity comes from the URL, which is already in
 * the page view. Anything else would contradict the promise the site is built
 * on, and it would be far too easy to add by accident at a call site.
 */

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

  /**
   * Fired when a tool has produced a result the user is taking away. That is
   * the only moment worth measuring: a page view says someone arrived, this
   * says the tool did its job.
   */
  toolCompleted(): void {
    this.send('tool_complete', { tool: this.toolFromUrl() });
  }

  /**
   * The tool's URL path — never a file name. A visitor on
   * `/pdf/merge-pdf` reports `pdf/merge-pdf`, which is the same information
   * the page view already carries.
   */
  private toolFromUrl(): string {
    const path = this.doc.location?.pathname ?? '';
    return path.replace(/^\/+|\/+$/g, '') || 'home';
  }

  private send(event: string, params: Record<string, string | number>): void {
    if (!this.isBrowser) return;
    try {
      const win = this.doc.defaultView as Window | null;
      // No gtag means consent was declined, the tag is blocked, or analytics
      // is simply off. None of those should ever surface to the user.
      win?.gtag?.('event', event, params);
    } catch {
      // Measurement must never be able to break a conversion.
    }
  }
}
