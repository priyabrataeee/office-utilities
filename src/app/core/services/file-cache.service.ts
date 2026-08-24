import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const DB_NAME = 'office-utilities';
const DB_VERSION = 1;
const STORE = 'files';

/**
 * Opt-in IndexedDB cache for file bytes, backing the "keep a local copy"
 * switch on the Recent Files page.
 *
 * This is still entirely on-device storage: it exists so a user can reopen
 * yesterday's spreadsheet without hunting for it again, not so that anything
 * is transmitted. Every method degrades to a no-op when IndexedDB is
 * unavailable (SSR, private browsing, storage disabled).
 */
@Injectable({ providedIn: 'root' })
export class FileCacheService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private dbPromise?: Promise<IDBDatabase | null>;

  get supported(): boolean {
    return this.isBrowser && typeof indexedDB !== 'undefined';
  }

  private open(): Promise<IDBDatabase | null> {
    if (!this.supported) return Promise.resolve(null);
    this.dbPromise ??= new Promise<IDBDatabase | null>((resolve) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    });
    return this.dbPromise;
  }

  private async tx<T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T | null> {
    const db = await this.open();
    if (!db) return null;
    return new Promise<T | null>((resolve) => {
      let request: IDBRequest<T>;
      try {
        request = run(db.transaction(STORE, mode).objectStore(STORE));
      } catch {
        resolve(null);
        return;
      }
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  }

  async put(id: string, file: File | Blob): Promise<boolean> {
    const result = await this.tx('readwrite', (s) => s.put(file, id) as IDBRequest<IDBValidKey>);
    return result !== null;
  }

  async get(id: string): Promise<Blob | null> {
    const result = await this.tx<Blob>('readonly', (s) => s.get(id) as IDBRequest<Blob>);
    return result ?? null;
  }

  async delete(id: string): Promise<void> {
    await this.tx('readwrite', (s) => s.delete(id) as unknown as IDBRequest<undefined>);
  }

  async clear(): Promise<void> {
    await this.tx('readwrite', (s) => s.clear() as unknown as IDBRequest<undefined>);
  }

  /** Bytes used across the whole origin, when the browser will tell us. */
  async usage(): Promise<{ usage: number; quota: number } | null> {
    if (!this.isBrowser || !navigator.storage?.estimate) return null;
    try {
      const { usage = 0, quota = 0 } = await navigator.storage.estimate();
      return { usage, quota };
    } catch {
      return null;
    }
  }
}
