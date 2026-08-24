import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { SpreadsheetGridComponent } from '../../../shared/components/spreadsheet-grid/spreadsheet-grid.component';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { SpreadsheetToolBase } from '../spreadsheet-tool-base';
import { sheetToCsv, sheetToJson } from '../../../core/engines/xlsx.engine';
import { baseNameOf } from '../../../core/utils/file.util';

type Target = 'csv' | 'json';

@Component({
  selector: 'app-sheet-export',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    ResultPanelComponent,
    BusyOverlayComponent,
    SpreadsheetGridComponent,
    CopyButtonComponent,
    IconComponent,
  ],
  templateUrl: './sheet-export.component.html',
  styleUrl: './sheet-export.component.scss',
})
export class SheetExportComponent extends SpreadsheetToolBase {
  readonly toolIdInput = input.required<string>({ alias: 'toolId' });
  readonly target = input.required<Target>();

  get toolId(): string {
    return this.toolIdInput();
  }

  protected readonly delimiter = signal(',');
  protected readonly includeHeader = signal(true);
  protected readonly jsonStyle = signal<'objects' | 'arrays'>('objects');
  protected readonly prettyPrint = signal(true);
  protected readonly exportAllSheets = signal(false);
  protected readonly preview = signal('');
  protected readonly fullText = signal('');
  /** Copying is offered only when the whole result is a sane clipboard size. */
  protected readonly copyable = computed(() => (this.activeSheet()?.rowCount ?? 0) <= 20000);

  protected readonly isCsv = computed(() => this.target() === 'csv');
  protected readonly extension = computed(() => (this.isCsv() ? '.csv' : '.json'));

  protected readonly delimiters = [
    { value: ',', label: 'Comma  ,' },
    { value: ';', label: 'Semicolon  ;' },
    { value: '\t', label: 'Tab' },
    { value: '|', label: 'Pipe  |' },
  ];

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override onSheetLoaded(): void {
    void this.refreshPreview();
  }

  private async refreshPreview(): Promise<void> {
    const sheet = this.activeSheet();
    if (!sheet) {
      this.preview.set('');
      return;
    }

    // Preview is capped: nobody reads 200k lines, and rendering them is slow.
    const capped = { ...sheet, rows: sheet.rows.slice(0, 50) };
    const text = this.isCsv()
      ? await sheetToCsv(capped, this.delimiter(), this.includeHeader())
      : JSON.stringify(
          sheetToJson(capped, this.jsonStyle()),
          null,
          this.prettyPrint() ? 2 : undefined,
        );

    this.preview.set(text);

    if (this.copyable()) {
      this.fullText.set(
        this.isCsv()
          ? await sheetToCsv(sheet, this.delimiter(), this.includeHeader())
          : JSON.stringify(
              sheetToJson(sheet, this.jsonStyle()),
              null,
              this.prettyPrint() ? 2 : undefined,
            ),
      );
    } else {
      this.fullText.set('');
    }
  }

  protected setDelimiter(event: Event): void {
    this.delimiter.set((event.target as HTMLSelectElement).value);
    void this.refreshPreview();
  }

  protected toggleHeader(event: Event): void {
    this.includeHeader.set((event.target as HTMLInputElement).checked);
    void this.refreshPreview();
  }

  protected setJsonStyle(event: Event): void {
    this.jsonStyle.set((event.target as HTMLSelectElement).value as 'objects' | 'arrays');
    void this.refreshPreview();
  }

  protected togglePretty(event: Event): void {
    this.prettyPrint.set((event.target as HTMLInputElement).checked);
    void this.refreshPreview();
  }

  protected toggleAllSheets(event: Event): void {
    this.exportAllSheets.set((event.target as HTMLInputElement).checked);
  }

  protected async export(): Promise<void> {
    const file = this.primaryFile();
    const sheets = this.exportAllSheets() ? this.sheets() : [this.activeSheet()].filter((s) => !!s);
    if (!file || !sheets.length) return;

    const base = baseNameOf(file.name);

    const outputs = await this.run('Converting…', async () => {
      const produced = [];
      for (const [index, sheet] of sheets.entries()) {
        const text = this.isCsv()
          ? await sheetToCsv(sheet, this.delimiter(), this.includeHeader())
          : JSON.stringify(
              sheetToJson(sheet, this.jsonStyle()),
              null,
              this.prettyPrint() ? 2 : undefined,
            );

        const name =
          sheets.length > 1
            ? `${base}-${sheet.name.replace(/[^\w -]/g, '')}${this.extension()}`
            : `${base}${this.extension()}`;

        produced.push(
          this.output(
            name,
            new Blob([text], {
              type: this.isCsv() ? 'text/csv;charset=utf-8' : 'application/json',
            }),
          ),
        );
        this.onProgress(index + 1, sheets.length);
      }
      return produced;
    });

    if (outputs) this.setOutputs(outputs);
  }

  protected startOver(): void {
    this.preview.set('');
    this.fullText.set('');
    this.reset();
  }
}
