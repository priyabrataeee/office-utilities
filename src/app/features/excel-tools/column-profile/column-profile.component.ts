import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { SpreadsheetToolBase } from '../spreadsheet-tool-base';
import { profileSheet, type ColumnStats, type DetectedType } from '../../../core/engines/xlsx.engine';

export type ProfileMode = 'stats' | 'types';

const TYPE_ICONS: Record<DetectedType, string> = {
  integer: 'hash',
  decimal: 'hash',
  date: 'clock',
  boolean: 'check-circle',
  email: 'mail',
  url: 'link',
  text: 'type',
  empty: 'minus',
};

/** Column statistics and data-type detection over the same profiling pass. */
@Component({
  selector: 'app-column-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    BusyOverlayComponent,
    CopyButtonComponent,
    IconComponent,
  ],
  templateUrl: './column-profile.component.html',
  styleUrl: './column-profile.component.scss',
})
export class ColumnProfileComponent extends SpreadsheetToolBase {
  readonly toolIdInput = input.required<string>({ alias: 'toolId' });
  readonly mode = input.required<ProfileMode>();

  get toolId(): string {
    return this.toolIdInput();
  }

  protected readonly profile = signal<ColumnStats[]>([]);
  protected readonly expanded = signal<number | null>(null);

  protected readonly isTypes = computed(() => this.mode() === 'types');

  protected readonly columnsWithIssues = computed(() =>
    this.profile().filter((column) => column.outliers.length > 0),
  );

  protected readonly totalIssues = computed(() =>
    this.columnsWithIssues().reduce((sum, column) => sum + column.outliers.length, 0),
  );

  protected readonly exportText = computed(() =>
    [
      ['Column', 'Type', 'Filled', 'Empty', 'Distinct', 'Min', 'Max', 'Mean', 'Median'].join('\t'),
      ...this.profile().map((column) =>
        [
          column.name,
          column.type,
          column.filled,
          column.empty,
          column.distinct,
          column.min ?? '',
          column.max ?? '',
          column.mean !== null ? column.mean.toFixed(4) : '',
          column.median ?? '',
        ].join('\t'),
      ),
    ].join('\n'),
  );

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override onSheetLoaded(): void {
    const sheet = this.activeSheet();
    this.expanded.set(null);
    this.profile.set(sheet ? profileSheet(sheet) : []);
  }

  protected toggleExpanded(index: number): void {
    this.expanded.update((current) => (current === index ? null : index));
  }

  protected iconFor(type: DetectedType): string {
    return TYPE_ICONS[type];
  }

  protected formatNumber(value: number | null, decimals = 2): string {
    if (value === null || !Number.isFinite(value)) return '—';
    return Number.isInteger(value)
      ? value.toLocaleString()
      : value.toLocaleString(undefined, { maximumFractionDigits: decimals });
  }

  /** Scales a histogram bucket to a 0–100 height for the sparkline. */
  protected barHeight(column: ColumnStats, index: number): number {
    const max = Math.max(...column.histogram, 1);
    return Math.round((column.histogram[index] / max) * 100);
  }

  protected completeness(column: ColumnStats): number {
    const total = column.filled + column.empty;
    return total ? Math.round((column.filled / total) * 100) : 0;
  }

  protected startOver(): void {
    this.profile.set([]);
    this.reset();
  }
}
