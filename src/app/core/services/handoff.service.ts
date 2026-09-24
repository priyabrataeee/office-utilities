import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class HandoffService {
  private readonly pending = signal<File[]>([]);

  readonly hasPending = () => this.pending().length > 0;

  offer(files: File[]): void {
    this.pending.set(files);
  }

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
