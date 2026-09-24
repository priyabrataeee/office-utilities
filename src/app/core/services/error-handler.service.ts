import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Injectable()
export class OuErrorHandler implements ErrorHandler {
  private readonly toast = inject(ToastService);

  handleError(error: unknown): void {
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
