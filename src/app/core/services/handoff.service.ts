import { Injectable, signal } from '@angular/core';

/**
 * Carries files between routes.
 *
 * When someone drops a spreadsheet on the home page and picks "Excel to CSV",
 * the file itself travels through here — never through the URL, and never
 * through storage. The handoff is consumed exactly once.
 */
@Injectable({ providedIn: 'root' })
export class HandoffService {
  private readonly pending = signal<File[]>([]);

  readonly hasPending = () => this.pending().length > 0;

  offer(files: File[]): void {
    this.pending.set(files);
  }

  /** Returns the pending files and clears them. */
  take(): File[] {
    const files = this.pending();
    if (files.length) this.pending.set([]);
    return files;
  }

  peek(): readonly File[] {
    return this.pending();
  }

  clear(): void {
    this.pending.set([]);
  }
}
