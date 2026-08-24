import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { SpreadsheetGridComponent } from '../../../shared/components/spreadsheet-grid/spreadsheet-grid.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { SpreadsheetToolBase } from '../../excel-tools/spreadsheet-tool-base';
import { renderDocumentToPdf } from '../../../core/engines/pdf-writer';
import { heading, type DocBlock, type PageSizeName, type TableCell } from '../../../core/engines/doc-model';
import { withExtension } from '../../../core/utils/file.util';

/** Renders a worksheet as a paginated PDF table with a repeating header. */
@Component({
  selector: 'app-sheet-to-pdf',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    ResultPanelComponent,
    BusyOverlayComponent,
    SpreadsheetGridComponent,
    IconComponent,
  ],
  templateUrl: './sheet-to-pdf.component.html',
  styleUrl: './sheet-to-pdf.component.scss',
})
export class SheetToPdfComponent extends SpreadsheetToolBase {
  readonly toolId = 'excel-to-pdf';

  protected readonly pageSize = signal<PageSizeName>('A4');
  protected readonly orientation = signal<'portrait' | 'landscape'>('landscape');
  protected readonly fontSize = signal(9);
  protected readonly margin = signal(34);
  protected readonly includeTitle = signal(true);
  protected readonly pageNumbers = signal(true);
  protected readonly repeatHeader = signal(true);
  protected readonly allSheets = signal(false);
  protected readonly maxRows = signal(5000);

  protected readonly rowsToRender = computed(() => {
    const sheet = this.activeSheet();
    if (!sheet) return 0;
    return Math.min(sheet.rowCount, this.maxRows());
  });

  protected readonly willTruncate = computed(
    () => (this.activeSheet()?.rowCount ?? 0) > this.maxRows(),
  );

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected setPageSize(event: Event): void {
    this.pageSize.set((event.target as HTMLSelectElement).value as PageSizeName);
  }
  protected setOrientation(event: Event): void {
    this.orientation.set((event.target as HTMLSelectElement).value as 'portrait' | 'landscape');
  }
  protected setFontSize(event: Event): void {
    this.fontSize.set(Number((event.target as HTMLInputElement).value));
  }
  protected setMargin(event: Event): void {
    this.margin.set(Number((event.target as HTMLInputElement).value));
  }
  protected setMaxRows(event: Event): void {
    this.maxRows.set(Number((event.target as HTMLInputElement).value));
  }
  protected toggle(
    name: 'includeTitle' | 'pageNumbers' | 'repeatHeader' | 'allSheets',
    event: Event,
  ): void {
    this[name].set((event.target as HTMLInputElement).checked);
  }

  protected async convert(): Promise<void> {
    const file = this.primaryFile();
    const sheets = this.allSheets() ? this.sheets() : [this.activeSheet()].filter((s) => !!s);
    if (!file || !sheets.length) return;

    const blocks: DocBlock[] = [];

    sheets.forEach((sheet, index) => {
      if (index > 0) blocks.push({ type: 'pagebreak' });
      if (this.includeTitle()) blocks.push(heading(2, sheet.name));

      const rows = sheet.rows.slice(0, this.maxRows());
      blocks.push({
        type: 'table',
        header: sheet.headers.map((header): TableCell => [{ text: header, bold: true }]),
        rows: rows.map((row) =>
          row.map((cell): TableCell => [{ text: formatCell(cell) }]),
        ),
        repeatHeader: this.repeatHeader(),
        compact: true,
      });

      if (sheet.rowCount > this.maxRows()) {
        blocks.push({
          type: 'paragraph',
          content: [
            {
              text: `Showing the first ${this.maxRows().toLocaleString()} of ${sheet.rowCount.toLocaleString()} rows.`,
              italic: true,
              color: '#767c8c',
            },
          ],
        });
      }
    });

    const result = await this.run('Laying out pages…', () =>
      renderDocumentToPdf(blocks, {
        size: this.pageSize(),
        orientation: this.orientation(),
        fontSize: this.fontSize(),
        margin: this.margin(),
        pageNumbers: this.pageNumbers(),
        font: 'sans',
        meta: { title: file.name.replace(/\.[^.]+$/, '') },
      }),
    );
    if (!result) return;

    if (result.droppedCharacters > 0) {
      this.toast.warning(
        `${result.droppedCharacters} characters were substituted`,
        'The standard PDF fonts cover Latin text only.',
      );
    }

    this.setOutputs([this.output(withExtension(file.name, '.pdf'), result.blob)]);
  }

  protected startOver(): void {
    this.reset();
  }
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
}
