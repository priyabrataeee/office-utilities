import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { FileSizePipe } from '../../../shared/pipes/file-size.pipe';
import { ToolBase } from '../../../shared/tool-base';
import { analyseContainer, type ContainerReport } from '../../../core/engines/file-inspect.engine';

const PALETTE = [
  '--ou-cat-pdf',
  '--ou-cat-word',
  '--ou-cat-excel',
  '--ou-cat-ppt',
  '--ou-cat-convert',
  '--ou-cat-generate',
  '--ou-cat-diagram',
  '--ou-cat-file',
  '--ou-cat-view',
];

/** Shows which parts of a container file account for its size. */
@Component({
  selector: 'app-size-analyzer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    BusyOverlayComponent,
    EmptyStateComponent,
    IconComponent,
    FileSizePipe,
  ],
  templateUrl: './size-analyzer.component.html',
  styleUrl: './size-analyzer.component.scss',
})
export class SizeAnalyzerComponent extends ToolBase {
  readonly toolId = 'file-size-analyzer';

  protected readonly report = signal<ContainerReport | null>(null);
  protected readonly scanned = signal(false);
  protected readonly showAll = signal(false);

  protected readonly isPdf = computed(() => this.report()?.kind === 'pdf');
  protected readonly supported = computed(
    () => !!this.report() && this.report()!.kind !== 'unsupported',
  );

  protected readonly visibleParts = computed(() => {
    const parts = this.report()?.parts ?? [];
    return this.showAll() ? parts : parts.slice(0, 25);
  });

  protected readonly compressionRatio = computed(() => {
    const report = this.report();
    if (!report || !report.totalUncompressed || !report.totalCompressed) return null;
    return Math.round((1 - report.totalCompressed / report.totalUncompressed) * 100);
  });

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override afterFiles(files: File[]): void {
    const file = files[0];
    if (!file) return;
    this.scanned.set(false);
    void this.run('Opening container…', async () => {
      this.report.set(await analyseContainer(file));
      this.scanned.set(true);
    });
  }

  protected colorFor(index: number): string {
    return `var(${PALETTE[index % PALETTE.length]})`;
  }

  protected shareOf(bytes: number): number {
    const total = this.report()?.totalUncompressed ?? 0;
    return total ? (bytes / total) * 100 : 0;
  }

  protected startOver(): void {
    this.report.set(null);
    this.scanned.set(false);
    this.reset();
  }
}
