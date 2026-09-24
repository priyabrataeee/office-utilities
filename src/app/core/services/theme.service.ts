import { DOCUMENT, Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { StorageService } from './storage.service';

export type ThemePreference = 'light' | 'medium' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'medium' | 'dark';

const KEY = 'theme';

const CYCLE: readonly ThemePreference[] = ['light', 'medium', 'dark', 'system'];

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly storage = inject(StorageService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly preference = signal<ThemePreference>('system');
  private readonly systemDark = signal(false);

  readonly resolved = computed<ResolvedTheme>(() => {
    const pref = this.preference();
    if (pref === 'system') return this.systemDark() ? 'dark' : 'light';
    return pref;
  });

  constructor() {
    if (this.isBrowser) {
      this.preference.set(this.readSavedPreference());

      const media = window.matchMedia('(prefers-color-scheme: dark)');
      this.systemDark.set(media.matches);
      media.addEventListener('change', (e) => this.systemDark.set(e.matches));

      effect(() => {
        const pref = this.preference();
        const root = this.doc.documentElement;
        if (pref === 'system') root.removeAttribute('data-theme');
        else root.setAttribute('data-theme', pref);

        this.doc
          .querySelector('meta[name="theme-color"]')
          ?.setAttribute('content', themeColour(this.resolved()));
      });
    }
  }

  set(pref: ThemePreference): void {
    this.preference.set(pref);
    this.storage.write(KEY, pref);
  }

  cycle(): void {
    const next = CYCLE[(CYCLE.indexOf(this.preference()) + 1) % CYCLE.length];
    this.set(next);
  }

  private readSavedPreference(): ThemePreference {
    const value = this.storage.read<string>(KEY, 'system');
    return (CYCLE as readonly string[]).includes(value)
      ? (value as ThemePreference)
      : 'system';
  }
}

function themeColour(resolved: ResolvedTheme): string {
  switch (resolved) {
    case 'dark':
      return '#0b0c10';
    case 'medium':
      return '#24252a';
    default:
      return '#5b5bd6';
  }
}
