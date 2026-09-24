import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolBase } from '../../../shared/tool-base';
import { readWorkbook, type SheetData } from '../../../core/engines/xlsx.engine';
import { renderDocumentToDocx } from '../../../core/engines/docx-writer';
import { heading, pageBreak, run, type DocBlock } from '../../../core/engines/doc-model';
import type { CellValue } from '../../../shared/components/spreadsheet-grid/spreadsheet-grid.component';
import { withExtension } from '../../../core/utils/file.util';

const WIDE_COLUMN_LIMIT = 8;

@Component({
  selector: 'app-sheet-to-word',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    ResultPanelComponent,
    BusyOverlayComponent,
    IconComponent,
  ],
  templateUrl: './sheet-to-word.component.html',
  styleUrl: './sheet-to-word.component.scss',
})
export class SheetToWordComponent extends ToolBase {
  readonly toolId = 'excel-to-word';

  protected readonly sheets = signal<SheetData[]>([]);
  protected readonly chosen = signal<Set<string>>(new Set());

  protected readonly firstRowIsHeader = signal(true);
  protected readonly sheetHeadings = signal(true);
  protected readonly pageBreaks = signal(true);
  protected readonly landscape = signal(false);
  protected readonly compact = signal(true);
  protected readonly maxRows = signal(0);

  protected readonly selected = computed(() =>
    this.sheets().filter((sheet) => this.chosen().has(sheet.name)),
  );

  protected readonly totalRows = computed(() =>
    this.selected().reduce((sum, sheet) => sum + sheet.rows.length, 0),
  );

  protected readonly widest = computed(() =>
    this.selected().reduce((most, sheet) => Math.max(most, sheet.columnCount), 0),
  );

  protected readonly tooWide = computed(
    () => this.widest() > WIDE_COLUMN_LIMIT && !this.landscape(),
  );

  protected readonly ready = computed(() => this.selected().length > 0);

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override afterFiles(files: File[]): void {
    if (files[0]) void this.read(files[0]);
  }

  private async read(file: File): Promise<void> {
    const workbook = await this.run('Reading the workbook…', () =>
      readWorkbook(file, { header: true, onProgress: this.onProgress }),
    );
    if (!workbook) return;

    const usable = workbook.sheets.filter((sheet) => sheet.rows.length || sheet.headers.length);
    this.sheets.set(usable);
    this.chosen.set(new Set(usable.filter((sheet) => !sheet.hidden).map((sheet) => sheet.name)));

    if (!usable.length) {
      this.toast.warning('Nothing to convert', 'Every sheet in this workbook is empty.');
    }
  }

  protected toggleSheet(name: string): void {
    this.chosen.update((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  protected toggleHeader(event: Event): void {
    this.firstRowIsHeader.set((event.target as HTMLInputElement).checked);
  }
  protected toggleHeadings(event: Event): void {
    this.sheetHeadings.set((event.target as HTMLInputElement).checked);
  }
  protected toggleBreaks(event: Event): void {
    this.pageBreaks.set((event.target as HTMLInputElement).checked);
  }
  protected toggleLandscape(event: Event): void {
    this.landscape.set((event.target as HTMLInputElement).checked);
  }
  protected toggleCompact(event: Event): void {
    this.compact.set((event.target as HTMLInputElement).checked);
  }
  protected setMaxRows(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.maxRows.set(Number.isFinite(value) && value > 0 ? Math.floor(value) : 0);
  }

  protected async convert(): Promise<void> {
    const file = this.primaryFile();
    const sheets = this.selected();
    if (!file || !sheets.length) return;

    const blob = await this.run('Building the document…', async () => {
      const blocks: DocBlock[] = [];
      const limit = this.maxRows();

      sheets.forEach((sheet, index) => {
        if (index > 0 && this.pageBreaks()) blocks.push(pageBreak);
        if (this.sheetHeadings()) blocks.push(heading(2, sheet.name));

        const rows = limit ? sheet.rows.slice(0, limit) : sheet.rows;
        blocks.push({
          type: 'table',
          header: this.firstRowIsHeader()
            ? sheet.headers.map((label) => [run(label, { bold: true })])
            : undefined,
          rows: rows.map((row) => row.map((cell) => [run(format(cell))])),
          repeatHeader: true,
          compact: this.compact(),
        });

        if (limit && sheet.rows.length > limit) {
          blocks.push({
            type: 'paragraph',
            content: [
              run(
                `Showing the first ${limit.toLocaleString()} of ${sheet.rows.length.toLocaleString()} rows.`,
                { italic: true },
              ),
            ],
          });
        }
      });

      return renderDocumentToDocx(blocks, {
        orientation: this.landscape() ? 'landscape' : 'portrait',
        fontSize: this.compact() ? 9 : 11,
        meta: {
          title: file.name.replace(/\.[^.]+$/, ''),
          creator: 'Office Utilities',
        },
      });
    });

    if (blob) this.setOutputs([this.output(withExtension(file.name, '.docx'), blob)]);
  }

  protected startOver(): void {
    this.sheets.set([]);
    this.chosen.set(new Set());
    this.reset();
  }
}

function format(value: CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}
