import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly prefix = 'ou:';

  get available(): boolean {
    return this.isBrowser;
  }

  read<T>(key: string, fallback: T): T {
    if (!this.isBrowser) return fallback;
    try {
      const raw = localStorage.getItem(this.prefix + key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  }

  write(key: string, value: unknown): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch {}
  }

  remove(key: string): void {
    if (!this.isBrowser) return;
    try {
      localStorage.removeItem(this.prefix + key);
    } catch {}
  }

  keys(): string[] {
    if (!this.isBrowser) return [];
    try {
      return Object.keys(localStorage)
        .filter((k) => k.startsWith(this.prefix))
        .map((k) => k.slice(this.prefix.length));
    } catch {
      return [];
    }
  }

  clearAll(): void {
    for (const key of this.keys()) this.remove(key);
  }

  usedBytes(): number {
    if (!this.isBrowser) return 0;
    let total = 0;
    for (const key of this.keys()) {
      const raw = localStorage.getItem(this.prefix + key) ?? '';
      total += (this.prefix + key).length + raw.length;
    }
    return total * 2;
  }
}
