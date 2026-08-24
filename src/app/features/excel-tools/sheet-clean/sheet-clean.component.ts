import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { SpreadsheetGridComponent } from '../../../shared/components/spreadsheet-grid/spreadsheet-grid.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { SpreadsheetToolBase } from '../spreadsheet-tool-base';
import {
  cleanSheet,
  findDuplicates,
  writeWorkbook,
  type CleanOptions,
  type CleanReport,
  type DuplicateGroup,
} from '../../../core/engines/xlsx.engine';
import type { CellValue } from '../../../shared/components/spreadsheet-grid/spreadsheet-grid.component';
import { withSuffix } from '../../../core/utils/file.util';

export type CleanMode = 'clean' | 'duplicates' | 'blanks';

/**
 * Spreadsheet cleaner, duplicate remover and blank-row remover.
 *
 * All three are the same pipeline — inspect, preview the delta, export — with
 * a different default rule set, so they share one component.
 */
@Component({
  selector: 'app-sheet-clean',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    ResultPanelComponent,
    BusyOverlayComponent,
    SpreadsheetGridComponent,
    IconComponent,
  ],
  templateUrl: './sheet-clean.component.html',
  styleUrl: './sheet-clean.component.scss',
})
export class SheetCleanComponent extends SpreadsheetToolBase {
  readonly toolIdInput = input.required<string>({ alias: 'toolId' });
  readonly mode = input.required<CleanMode>();

  get toolId(): string {
    return this.toolIdInput();
  }

  /* Cleaning rules */
  protected readonly trimWhitespace = signal(true);
  protected readonly collapseSpaces = signal(true);
  protected readonly removeBlankRows = signal(true);
  protected readonly removeBlankColumns = signal(true);
  protected readonly removeDuplicateRows = signal(false);
  protected readonly numbersFromText = signal(true);
  protected readonly stripNonPrintable = signal(true);
  protected readonly normaliseCase = signal<CleanOptions['normaliseCase']>('none');

  /* Duplicate rules */
  protected readonly keyColumns = signal<number[]>([]);
  protected readonly caseInsensitive = signal(true);
  protected readonly ignoreWhitespace = signal(true);
  protected readonly keep = signal<'first' | 'last'>('first');

  protected readonly report = signal<CleanReport | null>(null);
  protected readonly duplicateGroups = signal<DuplicateGroup[]>([]);
  protected readonly resultRows = signal<CellValue[][] | null>(null);

  protected readonly isDuplicates = computed(() => this.mode() === 'duplicates');
  protected readonly isBlanks = computed(() => this.mode() === 'blanks');

  protected readonly options = computed<CleanOptions>(() => {
    if (this.isBlanks()) {
      return {
        trimWhitespace: false,
        collapseSpaces: false,
        removeBlankRows: true,
        removeBlankColumns: this.removeBlankColumns(),
        removeDuplicateRows: false,
        numbersFromText: false,
        normaliseCase: 'none',
        stripNonPrintable: false,
      };
    }
    return {
      trimWhitespace: this.trimWhitespace(),
      collapseSpaces: this.collapseSpaces(),
      removeBlankRows: this.removeBlankRows(),
      removeBlankColumns: this.removeBlankColumns(),
      removeDuplicateRows: this.removeDuplicateRows(),
      numbersFromText: this.numbersFromText(),
      normaliseCase: this.normaliseCase(),
      stripNonPrintable: this.stripNonPrintable(),
    };
  });

  protected readonly rowsAfter = computed(() => this.resultRows()?.length ?? 0);
  protected readonly rowsBefore = computed(() => this.activeSheet()?.rowCount ?? 0);
  protected readonly rowsRemoved = computed(() => Math.max(0, this.rowsBefore() - this.rowsAfter()));
  protected readonly duplicateRowCount = computed(() =>
    this.duplicateGroups().reduce((sum, group) => sum + group.rowIndices.length - 1, 0),
  );

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override onSheetLoaded(): void {
    this.report.set(null);
    this.resultRows.set(null);
    this.duplicateGroups.set([]);
    this.keyColumns.set([]);
    this.analyse();
  }

  /** Recomputes the preview whenever a rule changes. */
  protected analyse(): void {
    const sheet = this.activeSheet();
    if (!sheet) return;

    if (this.isDuplicates()) {
      const { groups, keptRows } = findDuplicates(sheet, {
        keyColumns: this.keyColumns(),
        caseInsensitive: this.caseInsensitive(),
        ignoreWhitespace: this.ignoreWhitespace(),
        keep: this.keep(),
      });
      this.duplicateGroups.set(groups);
      this.resultRows.set(keptRows);
      this.report.set(null);
      return;
    }

    const result = cleanSheet(sheet, this.options());
    this.report.set(result);
    this.resultRows.set(result.rows);
  }

  protected toggleColumnKey(index: number): void {
    this.keyColumns.update((current) =>
      current.includes(index) ? current.filter((c) => c !== index) : [...current, index],
    );
    this.analyse();
  }

  protected isKeyColumn(index: number): boolean {
    return this.keyColumns().includes(index);
  }

  protected setFlag(
    name:
      | 'trimWhitespace'
      | 'collapseSpaces'
      | 'removeBlankRows'
      | 'removeBlankColumns'
      | 'removeDuplicateRows'
      | 'numbersFromText'
      | 'stripNonPrintable'
      | 'caseInsensitive'
      | 'ignoreWhitespace',
    event: Event,
  ): void {
    const checked = (event.target as HTMLInputElement).checked;
    this[name].set(checked);
    this.analyse();
  }

  protected setCase(event: Event): void {
    this.normaliseCase.set((event.target as HTMLSelectElement).value as CleanOptions['normaliseCase']);
    this.analyse();
  }

  protected setKeep(event: Event): void {
    this.keep.set((event.target as HTMLSelectElement).value as 'first' | 'last');
    this.analyse();
  }

  protected get resultHeaders(): string[] {
    if (this.isDuplicates() || this.isBlanks()) {
      return this.report()?.headers ?? this.activeSheet()?.headers ?? [];
    }
    return this.report()?.headers ?? [];
  }

  protected async download(format: 'xlsx' | 'csv'): Promise<void> {
    const sheet = this.activeSheet();
    const rows = this.resultRows();
    const file = this.primaryFile();
    if (!sheet || !rows || !file) return;

    const headers = this.report()?.headers ?? sheet.headers;

    const blob = await this.run('Building file…', () =>
      writeWorkbook([{ name: sheet.name, headers, rows }], { bookType: format }),
    );
    if (!blob) return;

    const suffix = this.isDuplicates() ? '-deduped' : this.isBlanks() ? '-compact' : '-cleaned';
    const name = withSuffix(file.name, suffix).replace(/\.[^.]+$/, `.${format}`);
    this.setOutputs([this.output(name, blob)]);
  }

  protected startOver(): void {
    this.report.set(null);
    this.resultRows.set(null);
    this.duplicateGroups.set([]);
    this.reset();
  }
}
