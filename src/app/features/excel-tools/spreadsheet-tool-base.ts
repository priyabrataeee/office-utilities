import { computed, signal } from '@angular/core';
import { ToolBase } from '../../shared/tool-base';
import { parseCsv, readWorkbook, type SheetData, type WorkbookData } from '../../core/engines/xlsx.engine';
import { extensionOf, readAsText } from '../../core/utils/file.util';

/**
 * Shared loading for every spreadsheet tool.
 *
 * Handles the two entry paths — a real workbook via SheetJS, or delimited text
 * via the CSV parser — and exposes one sheet model either way, so the tools
 * above never care which kind of file arrived.
 */
export abstract class SpreadsheetToolBase extends ToolBase {
  readonly workbook = signal<WorkbookData | null>(null);
  readonly activeSheetName = signal<string>('');

  readonly sheets = computed(() => this.workbook()?.sheets ?? []);
  readonly sheetNames = computed(() => this.sheets().map((sheet) => sheet.name));

  readonly activeSheet = computed<SheetData | null>(() => {
    const sheets = this.sheets();
    if (!sheets.length) return null;
    return sheets.find((sheet) => sheet.name === this.activeSheetName()) ?? sheets[0];
  });

  readonly hasData = computed(() => (this.activeSheet()?.rows.length ?? 0) > 0);
  readonly totalRows = computed(() =>
    this.sheets().reduce((sum, sheet) => sum + sheet.rowCount, 0),
  );

  protected override afterFiles(files: File[]): void {
    const file = files[0];
    if (file) void this.loadSpreadsheet(file);
  }

  /** Reads a workbook or delimited text file into the shared sheet model. */
  protected async loadSpreadsheet(file: File): Promise<void> {
    this.workbook.set(null);

    await this.run('Reading spreadsheet…', async () => {
      const extension = extensionOf(file.name);

      if (['.csv', '.tsv', '.txt'].includes(extension)) {
        const text = await readAsText(file);
        const parsed = await parseCsv(text, { header: true, coerceTypes: true });
        this.workbook.set({
          sheetNames: [file.name],
          properties: {
            Delimiter: parsed.delimiter === '\t' ? 'Tab' : parsed.delimiter,
            Rows: String(parsed.rows.length),
            Columns: String(parsed.headers.length),
          },
          sheets: [
            {
              name: file.name,
              headers: parsed.headers,
              rows: parsed.rows,
              rowCount: parsed.rows.length,
              columnCount: parsed.headers.length,
              range: `A1:${parsed.headers.length}`,
              formulas: [],
              hidden: false,
            },
          ],
        });
        if (parsed.errors.length) {
          this.toast.warning(
            'Some rows could not be parsed cleanly',
            parsed.errors.slice(0, 3).join(' · '),
          );
        }
      } else {
        const data = await readWorkbook(file, { header: true });
        if (!data.sheets.length) throw new Error('That workbook contains no readable sheets.');
        this.workbook.set(data);
      }

      const first = this.workbook()?.sheets[0];
      if (first) this.activeSheetName.set(first.name);
      this.onSheetLoaded();
    });
  }

  /** Hook for subclasses that need to react once data is available. */
  protected onSheetLoaded(): void {
    /* optional */
  }

  selectSheet(name: string): void {
    this.activeSheetName.set(name);
    this.onSheetLoaded();
  }

  protected onSheetChange(event: Event): void {
    this.selectSheet((event.target as HTMLSelectElement).value);
  }

  override reset(): void {
    this.workbook.set(null);
    this.activeSheetName.set('');
    super.reset();
  }
}
