import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  readonly id: number;
  readonly kind: ToastKind;
  readonly message: string;
  readonly detail?: string;
}

/** Transient, non-blocking feedback. Never used for anything destructive. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly state = signal<Toast[]>([]);
  readonly toasts = this.state.asReadonly();

  show(kind: ToastKind, message: string, detail?: string, ttlMs = 4200): number {
    const id = this.nextId++;
    this.state.update((list) => [...list, { id, kind, message, detail }]);
    if (ttlMs > 0 && typeof setTimeout !== 'undefined') {
      setTimeout(() => this.dismiss(id), ttlMs);
    }
    return id;
  }

  success(message: string, detail?: string): number {
    return this.show('success', message, detail);
  }

  error(message: string, detail?: string): number {
    return this.show('error', message, detail, 8000);
  }

  info(message: string, detail?: string): number {
    return this.show('info', message, detail);
  }

  warning(message: string, detail?: string): number {
    return this.show('warning', message, detail, 6000);
  }

  /** Turns any thrown value into a readable error toast. */
  fromError(error: unknown, fallback = 'Something went wrong'): number {
    const message = error instanceof Error ? error.message : String(error ?? '');
    return this.error(fallback, message || undefined);
  }

  dismiss(id: number): void {
    this.state.update((list) => list.filter((t) => t.id !== id));
  }

  clear(): void {
    this.state.set([]);
  }
}
