import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CommandPaletteService {
  private readonly openState = signal(false);
  readonly isOpen = this.openState.asReadonly();

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
