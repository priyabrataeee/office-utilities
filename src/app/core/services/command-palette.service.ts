import { Injectable, signal } from '@angular/core';

/** Global open/close state for the ⌘K palette. */
@Injectable({ providedIn: 'root' })
export class CommandPaletteService {
  private readonly openState = signal(false);
  readonly isOpen = this.openState.asReadonly();

  /** Seed query, e.g. when opened from the header search box. */
  readonly seed = signal('');

  open(seed = ''): void {
    this.seed.set(seed);
    this.openState.set(true);
  }

  close(): void {
    this.openState.set(false);
  }

  toggle(): void {
    this.openState() ? this.close() : this.open();
  }
}
