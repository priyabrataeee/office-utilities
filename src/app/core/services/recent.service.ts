import { Injectable, computed, inject, signal } from '@angular/core';
import { StorageService } from './storage.service';
import { FileCacheService } from './file-cache.service';
import type { RecentFileEntry } from '../models/file.model';
import { extensionOf } from '../utils/file.util';

const TOOLS_KEY = 'recent-tools';
const FILES_KEY = 'recent-files';
const RETAIN_KEY = 'retain-files';
const MAX_TOOLS = 12;
const MAX_FILES = 40;

/**
 * Remembers which tools were used and which files were opened.
 *
 * File *metadata* is kept in localStorage. File *contents* are only kept when
 * the user turns on retention, and then only in IndexedDB on this device.
 */
@Injectable({ providedIn: 'root' })
export class RecentService {
  private readonly storage = inject(StorageService);
  private readonly cache = inject(FileCacheService);

  private readonly tools = signal<string[]>(this.storage.read<string[]>(TOOLS_KEY, []));
  private readonly files = signal<RecentFileEntry[]>(
    this.storage.read<RecentFileEntry[]>(FILES_KEY, []),
  );
  private readonly retain = signal<boolean>(this.storage.read<boolean>(RETAIN_KEY, false));

  readonly toolIds = this.tools.asReadonly();
  readonly recentFiles = this.files.asReadonly();
  readonly retainFiles = this.retain.asReadonly();
  readonly hasHistory = computed(() => this.tools().length > 0 || this.files().length > 0);

  setRetainFiles(on: boolean): void {
    this.retain.set(on);
    this.storage.write(RETAIN_KEY, on);
    if (!on) {
      void this.cache.clear();
      this.files.update((list) => list.map((f) => ({ ...f, cached: false })));
      this.persistFiles();
    }
  }

  /**
   * Records tool usage.
   *
   * Uses `update` rather than read-then-set so that calling this from inside
   * an `effect` does not make the effect depend on the signal it writes — that
   * combination loops forever, and does so silently until server rendering
   * hangs on it. The early return also keeps repeat visits from churning the
   * array identity for no reason.
   */
  trackTool(id: string): void {
    if (this.tools()[0] === id) return;
    let next: string[] = [];
    this.tools.update((current) => {
      next = [id, ...current.filter((x) => x !== id)].slice(0, MAX_TOOLS);
      return next;
    });
    this.storage.write(TOOLS_KEY, next);
  }

  /** Records an opened file; caches bytes too when retention is enabled. */
  async trackFile(file: File, toolId?: string): Promise<void> {
    const id = `${file.name}:${file.size}:${file.lastModified}`;
    let cached = false;
    if (this.retain() && file.size <= 25 * 1024 * 1024) {
      cached = await this.cache.put(id, file);
    }

    const entry: RecentFileEntry = {
      id,
      name: file.name,
      size: file.size,
      type: file.type,
      extension: extensionOf(file.name),
      openedAt: Date.now(),
      lastModified: file.lastModified,
      toolId,
      cached,
    };

    const next = [entry, ...this.files().filter((f) => f.id !== id)].slice(0, MAX_FILES);
    const dropped = this.files().filter((f) => !next.some((n) => n.id === f.id));
    for (const d of dropped) if (d.cached) void this.cache.delete(d.id);

    this.files.set(next);
    this.persistFiles();
  }

  /** Returns the cached bytes for an entry, or null if they were not kept. */
  async restore(entry: RecentFileEntry): Promise<File | null> {
    if (!entry.cached) return null;
    const blob = await this.cache.get(entry.id);
    if (!blob) return null;
    return new File([blob], entry.name, {
      type: entry.type || blob.type,
      lastModified: entry.lastModified,
    });
  }

  removeFile(id: string): void {
    void this.cache.delete(id);
    this.files.update((list) => list.filter((f) => f.id !== id));
    this.persistFiles();
  }

  clearFiles(): void {
    void this.cache.clear();
    this.files.set([]);
    this.storage.remove(FILES_KEY);
  }

  clearTools(): void {
    this.tools.set([]);
    this.storage.remove(TOOLS_KEY);
  }

  clearAll(): void {
    this.clearFiles();
    this.clearTools();
  }

  private persistFiles(): void {
    this.storage.write(FILES_KEY, this.files());
  }
}
