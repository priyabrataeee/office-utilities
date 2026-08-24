import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { HashAlgorithm, HashResponse } from '../workers/hash.worker';

export interface HashResult {
  readonly results: Record<string, string>;
  readonly bytes: number;
  readonly milliseconds: number;
}

/**
 * Runs file hashing in a Web Worker so multi-gigabyte files never block the
 * interface. Falls back to the main thread if workers are unavailable.
 */
@Injectable({ providedIn: 'root' })
export class HashService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private worker: Worker | null = null;
  private nextId = 1;

  get supported(): boolean {
    return this.isBrowser && typeof Worker !== 'undefined';
  }

  private ensureWorker(): Worker | null {
    if (!this.supported) return null;
    this.worker ??= new Worker(new URL('../workers/hash.worker', import.meta.url), {
      type: 'module',
    });
    return this.worker;
  }

  hash(
    file: File,
    algorithms: readonly HashAlgorithm[],
    onProgress?: (loaded: number, total: number) => void,
  ): Promise<HashResult> {
    const worker = this.ensureWorker();
    if (!worker) return this.hashOnMainThread(file, algorithms);

    const id = this.nextId++;

    return new Promise<HashResult>((resolve, reject) => {
      const listener = (event: MessageEvent<HashResponse>): void => {
        const message = event.data;
        if (message.id !== id) return;

        if (message.type === 'progress') {
          onProgress?.(message.loaded, message.total);
          return;
        }

        worker.removeEventListener('message', listener);
        if (message.type === 'error') {
          reject(new Error(message.message));
        } else {
          resolve({
            results: message.results,
            bytes: message.bytes,
            milliseconds: message.milliseconds,
          });
        }
      };

      worker.addEventListener('message', listener);
      worker.postMessage({ id, file, algorithms });
    });
  }

  /** Last resort: correct, but it will make a large file feel sluggish. */
  private async hashOnMainThread(
    file: File,
    algorithms: readonly HashAlgorithm[],
  ): Promise<HashResult> {
    const started = performance.now();
    const buffer = await file.arrayBuffer();
    const results: Record<string, string> = {};

    for (const algorithm of algorithms) {
      if (algorithm === 'CRC32') continue;
      const digest = await crypto.subtle.digest(algorithm, buffer);
      results[algorithm] = Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
    }

    return { results, bytes: file.size, milliseconds: performance.now() - started };
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}
