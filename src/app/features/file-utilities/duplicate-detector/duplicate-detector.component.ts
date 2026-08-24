import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { FileSizePipe } from '../../../shared/pipes/file-size.pipe';
import { ToolBase } from '../../../shared/tool-base';
import { HashService } from '../../../core/services/hash.service';

interface DuplicateGroup {
  readonly hash: string;
  readonly size: number;
  readonly files: readonly { name: string; path: string }[];
  readonly wasted: number;
}

/**
 * Finds byte-identical files by hashing content, not by comparing names.
 *
 * Files are grouped by size first, because two files of different sizes can
 * never be identical — which means most of a folder is never hashed at all.
 */
@Component({
  selector: 'app-duplicate-detector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    BusyOverlayComponent,
    EmptyStateComponent,
    CopyButtonComponent,
    IconComponent,
    FileSizePipe,
  ],
  templateUrl: './duplicate-detector.component.html',
  styleUrl: './duplicate-detector.component.scss',
})
export class DuplicateDetectorComponent extends ToolBase {
  private readonly hasher = inject(HashService);

  readonly toolId = 'duplicate-file-detector';

  protected readonly groups = signal<DuplicateGroup[]>([]);
  protected readonly scanned = signal(false);
  protected readonly hashedCount = signal(0);
  protected readonly skippedCount = signal(0);

  protected readonly totalWasted = computed(() =>
    this.groups().reduce((sum, group) => sum + group.wasted, 0),
  );
  protected readonly duplicateCount = computed(() =>
    this.groups().reduce((sum, group) => sum + group.files.length - 1, 0),
  );

  protected readonly exportText = computed(() =>
    this.groups()
      .map(
        (group) =>
          `${group.hash.slice(0, 16)}  ${group.files.length} copies  ${group.size} bytes\n` +
          group.files.map((file) => `    ${file.path}`).join('\n'),
      )
      .join('\n\n'),
  );

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override afterFiles(files: File[]): void {
    if (files.length < 2) {
      this.scanned.set(false);
      return;
    }
    void this.scan(files);
  }

  private async scan(files: File[]): Promise<void> {
    this.scanned.set(false);
    this.groups.set([]);

    const found = await this.run('Comparing files…', async () => {
      // Same size is a precondition for being identical, so this prunes the
      // work dramatically on a real folder.
      const bySize = new Map<number, File[]>();
      for (const file of files) {
        if (file.size === 0) continue;
        bySize.set(file.size, [...(bySize.get(file.size) ?? []), file]);
      }

      const candidates = [...bySize.values()].filter((group) => group.length > 1);
      const candidateCount = candidates.reduce((sum, group) => sum + group.length, 0);

      this.skippedCount.set(files.length - candidateCount);
      this.hashedCount.set(candidateCount);

      const byHash = new Map<string, { size: number; files: { name: string; path: string }[] }>();
      let done = 0;

      for (const group of candidates) {
        for (const file of group) {
          const { results } = await this.hasher.hash(file, ['SHA-256']);
          const hash = results['SHA-256'];
          const entry = byHash.get(hash) ?? { size: file.size, files: [] };
          entry.files.push({
            name: file.name,
            path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
          });
          byHash.set(hash, entry);

          done++;
          this.setProgress(done / Math.max(1, candidateCount), `Hashed ${done} of ${candidateCount}`);
        }
      }

      return [...byHash.entries()]
        .filter(([, entry]) => entry.files.length > 1)
        .map(([hash, entry]) => ({
          hash,
          size: entry.size,
          files: entry.files,
          wasted: entry.size * (entry.files.length - 1),
        }))
        .sort((a, b) => b.wasted - a.wasted);
    });

    if (found) {
      this.groups.set(found);
      this.scanned.set(true);
    }
  }

  protected startOver(): void {
    this.groups.set([]);
    this.scanned.set(false);
    this.reset();
  }
}
