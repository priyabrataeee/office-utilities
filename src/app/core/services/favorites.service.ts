import { Injectable, computed, inject, signal } from '@angular/core';
import { StorageService } from './storage.service';

const KEY = 'favorites';

/** Persisted set of favourited tool ids, newest first. */
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly storage = inject(StorageService);
  private readonly state = signal<string[]>(this.storage.read<string[]>(KEY, []));

  readonly ids = this.state.asReadonly();
  readonly count = computed(() => this.state().length);

  isFavorite(id: string): boolean {
    return this.state().includes(id);
  }

  toggle(id: string): boolean {
    const next = this.isFavorite(id)
      ? this.state().filter((x) => x !== id)
      : [id, ...this.state()];
    this.state.set(next);
    this.storage.write(KEY, next);
    return this.isFavorite(id);
  }

  clear(): void {
    this.state.set([]);
    this.storage.remove(KEY);
  }
}
