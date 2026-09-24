import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { SpreadsheetGridComponent } from '../../../shared/components/spreadsheet-grid/spreadsheet-grid.component';
import type { CellValue } from '../../../shared/components/spreadsheet-grid/spreadsheet-grid.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolBase } from '../../../shared/tool-base';
import {
  extractTables,
  type ExtractedPage,
  type TableExtractResult,
} from '../../../core/engines/table-extract.engine';
import { toCsvText, writeWorkbook } from '../../../core/engines/xlsx.engine';
import { baseNameOf, withExtension } from '../../../core/utils/file.util';

export type TableTarget = 'xlsx' | 'csv';

@Component({
  selector: 'app-pdf-to-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    ResultPanelComponent,
    BusyOverlayComponent,
    SpreadsheetGridComponent,
    IconComponent,
    RouterLink,
  ],
  templateUrl: './pdf-to-table.component.html',
  styleUrl: './pdf-to-table.component.scss',
})
export class PdfToTableComponent extends ToolBase {
  readonly toolIdInput = input.required<string>({ alias: 'toolId' });
  readonly target = input.required<TableTarget>();

  get toolId(): string {
    return this.toolIdInput();
  }

  protected readonly result = signal<TableExtractResult | null>(null);
  protected readonly previewPage = signal(0);

  protected readonly firstRowIsHeader = signal(true);
  protected readonly coerceNumbers = signal(true);
  protected readonly dropEmptyRows = signal(true);
  protected readonly combinePages = signal(true);
  protected readonly delimiter = signal(',');

  protected readonly toCsv = computed(() => this.target() === 'csv');

  protected readonly pages = computed(() => this.result()?.pages ?? []);
  protected readonly usablePages = computed(() =>
    this.pages().filter((page) => page.rows.length > 0),
  );
  protected readonly current = computed<ExtractedPage | null>(
    () => this.usablePages()[this.previewPage()] ?? null,
  );

  protected readonly isScan = computed(() => {
    const result = this.result();
    return !!result && !result.hasTextLayer;
  });

  protected readonly proseCount = computed(
    () => this.usablePages().filter((page) => page.singleColumn).length,
  );

  protected readonly previewHeaders = computed<string[]>(() => {
    const page = this.current();
    if (!page) return [];
    if (this.firstRowIsHeader() && page.rows.length) {
      return page.rows[0].map((value, index) => String(value ?? '') || `Column ${index + 1}`);
    }
    return Array.from({ length: page.columnCount }, (_, index) => `Column ${index + 1}`);
  });

  protected readonly previewRows = computed<CellValue[][]>(() => {
    const page = this.current();
    if (!page) return [];
    const rows = this.firstRowIsHeader() ? page.rows.slice(1) : page.rows;
    return rows as CellValue[][];
  });

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override afterFiles(files: File[]): void {
    if (files[0]) void this.extract();
  }

  private async extract(): Promise<void> {
    const file = this.primaryFile();
    if (!file) return;

    const extracted = await this.run('Reading the page layout…', () =>
      extractTables(
        file,
        {
          coerceNumbers: this.coerceNumbers(),
          dropEmptyRows: this.dropEmptyRows(),
        },
        this.onProgress,
      ),
    );

    if (!extracted) return;
    this.result.set(extracted);
    this.previewPage.set(0);

    if (!extracted.hasTextLayer) {
      this.toast.warning(
        'Nothing to extract',
        'This PDF has no text layer — it is a scan, and there is no OCR here.',
      );
    }
  }

  protected setPreviewPage(index: number): void {
    this.previewPage.set(index);
  }

  protected async toggleHeader(event: Event): Promise<void> {
    this.firstRowIsHeader.set((event.target as HTMLInputElement).checked);
  }

  protected async toggleNumbers(event: Event): Promise<void> {
    this.coerceNumbers.set((event.target as HTMLInputElement).checked);
    await this.extract();
  }

  protected async toggleEmptyRows(event: Event): Promise<void> {
    this.dropEmptyRows.set((event.target as HTMLInputElement).checked);
    await this.extract();
  }

  protected toggleCombine(event: Event): void {
    this.combinePages.set((event.target as HTMLInputElement).checked);
  }

  protected setDelimiter(event: Event): void {
    this.delimiter.set((event.target as HTMLSelectElement).value);
  }

  protected async download(): Promise<void> {
    const file = this.primaryFile();
    const pages = this.usablePages();
    if (!file || !pages.length) return;

    const outputs = await this.run('Building the file…', async () => {
      return this.toCsv() ? this.buildCsv(file, pages) : this.buildWorkbook(file, pages);
    });

    if (outputs) this.setOutputs(outputs);
  }

  private async buildWorkbook(file: File, pages: readonly ExtractedPage[]) {
    const sheets = this.combinePages()
      ? [
          {
            name: baseNameOf(file.name).slice(0, 28) || 'Extracted',
            ...this.splitHeader(pages.flatMap((page) => page.rows as CellValue[][])),
          },
        ]
      : pages.map((page) => ({
          name: `Page ${page.page}`,
          ...this.splitHeader(page.rows as CellValue[][]),
        }));

    const blob = await writeWorkbook(sheets, { styleHeader: true });
    return [this.output(withExtension(file.name, '.xlsx'), blob)];
  }

  private async buildCsv(file: File, pages: readonly ExtractedPage[]) {
    const delimiter = this.delimiter();

    if (this.combinePages()) {
      const { headers, rows } = this.splitHeader(
        pages.flatMap((page) => page.rows as CellValue[][]),
      );
      const text = await toCsvText(headers ?? [], rows, delimiter);
      return [
        this.output(
          withExtension(file.name, '.csv'),
          new Blob([text], { type: 'text/csv;charset=utf-8' }),
        ),
      ];
    }

    const outputs = [];
    for (const page of pages) {
      const { headers, rows } = this.splitHeader(page.rows as CellValue[][]);
      const text = await toCsvText(headers ?? [], rows, delimiter);
      outputs.push(
        this.output(
          `${baseNameOf(file.name)}-page-${page.page}.csv`,
          new Blob([text], { type: 'text/csv;charset=utf-8' }),
        ),
      );
    }
    return outputs;
  }

  private splitHeader(rows: CellValue[][]): { headers?: string[]; rows: CellValue[][] } {
    if (!this.firstRowIsHeader() || !rows.length) return { rows };
    const [first, ...rest] = rows;
    return {
      headers: first.map((value, index) => String(value ?? '') || `Column ${index + 1}`),
      rows: rest,
    };
  }

  protected startOver(): void {
    this.result.set(null);
    this.previewPage.set(0);
    this.reset();
  }
}
