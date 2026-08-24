import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { FileSizePipe } from '../../../shared/pipes/file-size.pipe';
import { ToolBase } from '../../../shared/tool-base';
import { HashService } from '../../../core/services/hash.service';
import type { HashAlgorithm } from '../../../core/workers/hash.worker';

interface FileHashes {
  readonly name: string;
  readonly size: number;
  readonly results: Record<string, string>;
  readonly milliseconds: number;
}

const LARGE_FILE = 512 * 1024 * 1024;

@Component({
  selector: 'app-hash-generator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    BusyOverlayComponent,
    CopyButtonComponent,
    IconComponent,
    FileSizePipe,
    KeyValuePipe,
  ],
  templateUrl: './hash-generator.component.html',
  styleUrl: './hash-generator.component.scss',
})
export class HashGeneratorComponent extends ToolBase {
  private readonly hasher = inject(HashService);

  readonly toolId = 'file-hash-generator';

  protected readonly algorithms: readonly { value: HashAlgorithm; label: string; note: string }[] = [
    { value: 'SHA-256', label: 'SHA-256', note: 'The usual choice for checksums' },
    { value: 'SHA-384', label: 'SHA-384', note: 'Needs the whole file in memory' },
    { value: 'SHA-512', label: 'SHA-512', note: 'Needs the whole file in memory' },
    { value: 'CRC32', label: 'CRC32', note: 'Fast integrity check, not cryptographic' },
  ];

  protected readonly selected = signal<Set<HashAlgorithm>>(new Set<HashAlgorithm>(['SHA-256']));
  protected readonly hashes = signal<FileHashes[]>([]);
  protected readonly expected = signal('');

  protected readonly usesWorker = computed(() => this.hasher.supported);

  protected readonly hasLargeFile = computed(() =>
    this.files().some((file) => file.size > LARGE_FILE),
  );

  protected readonly wideSelected = computed(
    () => this.selected().has('SHA-384') || this.selected().has('SHA-512'),
  );

  /** Compares the pasted checksum against every hash produced. */
  protected readonly verification = computed(() => {
    const needle = this.expected().trim().toLowerCase().replace(/\s+/g, '');
    if (!needle) return null;

    for (const file of this.hashes()) {
      for (const [algorithm, value] of Object.entries(file.results)) {
        if (value.toLowerCase() === needle) {
          return { matched: true, file: file.name, algorithm } as const;
        }
      }
    }
    return { matched: false, file: '', algorithm: '' } as const;
  });

  protected readonly exportText = computed(() =>
    this.hashes()
      .flatMap((file) =>
        Object.entries(file.results).map(([algorithm, value]) => `${value}  ${algorithm}  ${file.name}`),
      )
      .join('\n'),
  );

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override afterFiles(files: File[]): void {
    if (files.length) void this.compute();
  }

  protected isSelected(algorithm: HashAlgorithm): boolean {
    return this.selected().has(algorithm);
  }

  protected toggle(algorithm: HashAlgorithm): void {
    const next = new Set(this.selected());
    next.has(algorithm) ? next.delete(algorithm) : next.add(algorithm);
    if (!next.size) next.add('SHA-256');
    this.selected.set(next);
  }

  protected setExpected(event: Event): void {
    this.expected.set((event.target as HTMLInputElement).value);
  }

  protected async compute(): Promise<void> {
    const files = this.files();
    const algorithms = [...this.selected()];
    if (!files.length || !algorithms.length) return;

    this.hashes.set([]);

    const computed = await this.run('Hashing…', async () => {
      const out: FileHashes[] = [];
      for (const [index, file] of files.entries()) {
        this.progressLabel.set(`Hashing ${file.name} (${index + 1} of ${files.length})`);
        const result = await this.hasher.hash(file, algorithms, (loaded, total) => {
          // Progress spans all files, not just the current one.
          const fraction = (index + (total ? loaded / total : 0)) / files.length;
          this.setProgress(fraction);
        });
        out.push({
          name: file.name,
          size: file.size,
          results: result.results,
          milliseconds: result.milliseconds,
        });
      }
      return out;
    });

    if (computed) this.hashes.set(computed);
  }

  protected throughput(file: FileHashes): string {
    if (!file.milliseconds) return '';
    const mbPerSecond = file.size / 1024 / 1024 / (file.milliseconds / 1000);
    return `${mbPerSecond.toFixed(0)} MB/s`;
  }

  protected startOver(): void {
    this.hashes.set([]);
    this.expected.set('');
    this.reset();
  }
}
