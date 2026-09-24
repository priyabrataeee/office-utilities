import { Injector, afterNextRender, computed, inject, signal } from '@angular/core';
import { ToastService } from '../core/services/toast.service';
import { DownloadService } from '../core/services/download.service';
import { RecentService } from '../core/services/recent.service';
import { HandoffService } from '../core/services/handoff.service';
import type { OutputFile } from '../core/models/file.model';

export abstract class ToolBase {
  protected readonly toast = inject(ToastService);
  protected readonly downloads = inject(DownloadService);
  protected readonly recentFiles = inject(RecentService);
  private readonly handoff = inject(HandoffService);
  private readonly injector = inject(Injector);

  abstract readonly toolId: string;

  readonly files = signal<File[]>([]);
  readonly outputs = signal<OutputFile[]>([]);
  readonly busy = signal(false);
  readonly percent = signal<number | null>(null);
  readonly progressLabel = signal('');
  readonly errorMessage = signal('');

  readonly hasFile = computed(() => this.files().length > 0);
  readonly primaryFile = computed<File | null>(() => this.files()[0] ?? null);
  readonly totalInputSize = computed(() =>
    this.files().reduce((sum, file) => sum + file.size, 0),
  );

  protected acceptHandoff(): void {
    const pending = this.handoff.take();
    if (!pending.length) return;
    afterNextRender(() => this.onFiles(pending), { injector: this.injector });
  }

  onFiles(files: File[]): void {
    this.files.set(files);
    this.outputs.set([]);
    this.errorMessage.set('');
    for (const file of files) void this.recentFiles.trackFile(file, this.toolId);
    this.afterFiles(files);
  }

  protected afterFiles(_files: File[]): void {}

  protected async run<T>(label: string, work: () => Promise<T>): Promise<T | undefined> {
    if (this.busy()) return undefined;
    this.busy.set(true);
    this.percent.set(null);
    this.progressLabel.set(label);
    this.errorMessage.set('');

    try {
      return await work();
    } catch (error) {
      const message = describeError(error);
      this.errorMessage.set(message);
      this.toast.error('That did not work', message);
      return undefined;
    } finally {
      this.busy.set(false);
      this.percent.set(null);
      this.progressLabel.set('');
    }
  }

  protected readonly onProgress = (done: number, total: number): void => {
    this.percent.set(total > 0 ? Math.round((done / total) * 100) : null);
  };

  protected setProgress(fraction: number, label?: string): void {
    this.percent.set(Math.max(0, Math.min(100, Math.round(fraction * 100))));
    if (label) this.progressLabel.set(label);
  }

  protected setOutputs(outputs: readonly OutputFile[]): void {
    this.outputs.set([...outputs]);
    if (outputs.length) {
      this.toast.success(
        outputs.length === 1 ? 'Your file is ready' : `${outputs.length} files are ready`,
      );
    }
  }

  protected output(name: string, blob: Blob): OutputFile {
    return { name, blob, size: blob.size };
  }

  reset(): void {
    this.files.set([]);
    this.outputs.set([]);
    this.errorMessage.set('');
    this.percent.set(null);
  }

  clearOutputs(): void {
    this.outputs.set([]);
  }
}

export function describeError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message || error.name;
    if (/password/i.test(message)) {
      return 'This file is password protected. Enter the password to continue.';
    }
    if (/encrypt/i.test(message)) {
      return 'This PDF is encrypted. Unlock it first with the Unlock PDF tool.';
    }
    if (/Invalid PDF|PDF header|FormatError/i.test(message)) {
      return 'That file does not look like a valid PDF — it may be corrupt or renamed.';
    }
    if (/out of memory|Array buffer allocation/i.test(message)) {
      return 'The browser ran out of memory for a file that large. Try splitting it first.';
    }
    if (/zip|central directory/i.test(message)) {
      return 'That file is not a readable Office document — the container could not be opened.';
    }
    return message;
  }
  return String(error ?? 'Unknown error');
}
