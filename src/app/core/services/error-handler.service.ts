import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ToastService } from './toast.service';

/**
 * Application-wide error handler.
 *
 * A crashed lazy chunk (network hiccup, deployed under a wrong base href,
 * cache-corrupted service worker) is a common failure mode for a static SPA.
 * Angular's default handler just logs to the console — which is invisible to
 * the person actually using the tool. This one turns those into a visible
 * toast with a plain-English message, without swallowing the console log
 * that a developer needs.
 */
@Injectable()
export class OuErrorHandler implements ErrorHandler {
  private readonly toast = inject(ToastService);

  handleError(error: unknown): void {
    // Preserve the browser's own stack for anyone opening devtools.
    console.error(error);

    const message = describe(error);
    if (!message) return;
    this.toast.error('Something went wrong', message);
  }
}

function describe(error: unknown): string | null {
  if (error && typeof error === 'object') {
    const name = (error as { name?: string }).name;
    const raw = (error as { message?: string }).message ?? String(error);

    // Lazy-chunk load failures deserve their own message: the user's next
    // action after a failed navigation is usually "try again".
    if (name === 'ChunkLoadError' || /ChunkLoadError|Loading chunk|dynamically imported module/i.test(raw)) {
      return 'Part of the app could not be loaded. Check your connection and reload the page.';
    }

    if (/QuotaExceededError|storage/i.test(raw)) {
      return "This browser's local storage is full — some preferences may not be saved.";
    }

    if (/Failed to fetch|NetworkError/i.test(raw)) {
      return 'Something the app needed could not be loaded. A refresh usually fixes this.';
    }

    return raw || null;
  }
  return typeof error === 'string' ? error : null;
}
