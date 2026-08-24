import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { SpreadsheetGridComponent } from '../../../shared/components/spreadsheet-grid/spreadsheet-grid.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolBase } from '../../../shared/tool-base';
import {
  jsonToSheet,
  parseCsv,
  writeWorkbook,
  type WriteSheet,
} from '../../../core/engines/xlsx.engine';
import { baseNameOf, readAsText, withExtension } from '../../../core/utils/file.util';

type Source = 'csv' | 'json';

/** Turns delimited text or JSON into a formatted .xlsx workbook. */
@Component({
  selector: 'app-sheet-import',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    ResultPanelComponent,
    BusyOverlayComponent,
    SpreadsheetGridComponent,
    IconComponent,
  ],
  templateUrl: './sheet-import.component.html',
  styleUrl: './sheet-import.component.scss',
})
export class SheetImportComponent extends ToolBase {
  readonly toolIdInput = input.required<string>({ alias: 'toolId' });
  readonly source = input.required<Source>();

  get toolId(): string {
    return this.toolIdInput();
  }

  protected readonly pasted = signal('');
  protected readonly sheet = signal<WriteSheet | null>(null);
  protected readonly detectedDelimiter = signal('');
  protected readonly parseError = signal('');

  protected readonly coerceTypes = signal(true);
  protected readonly firstRowIsHeader = signal(true);
  protected readonly styleHeader = signal(true);

  protected readonly isCsv = computed(() => this.source() === 'csv');
  protected readonly rowCount = computed(() => this.sheet()?.rows.length ?? 0);
  protected readonly columnCount = computed(() => this.sheet()?.headers?.length ?? 0);
  protected readonly ready = computed(() => this.rowCount() > 0);

  protected readonly accepts = computed<string[]>(() =>
    this.isCsv() ? ['.csv', '.tsv', '.txt'] : ['.json', '.jsonl'],
  );

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override afterFiles(files: File[]): void {
    const file = files[0];
    if (!file) return;
    void this.run('Reading file…', async () => {
      const text = await readAsText(file);
      this.pasted.set(text.length > 400_000 ? '' : text);
      await this.parse(text);
    });
  }

  protected async onPaste(event: Event): Promise<void> {
    const text = (event.target as HTMLTextAreaElement).value;
    this.pasted.set(text);
    await this.parse(text);
  }

  private async parse(text: string): Promise<void> {
    this.parseError.set('');
    if (!text.trim()) {
      this.sheet.set(null);
      return;
    }

    try {
      if (this.isCsv()) {
        const parsed = await parseCsv(text, {
          header: this.firstRowIsHeader(),
          coerceTypes: this.coerceTypes(),
        });
        this.detectedDelimiter.set(parsed.delimiter === '\t' ? 'Tab' : parsed.delimiter);
        this.sheet.set({
          name: 'Sheet1',
          headers: parsed.headers,
          rows: parsed.rows,
        });
        if (parsed.errors.length) this.parseError.set(parsed.errors.slice(0, 3).join(' · '));
      } else {
        const value = parseJsonLoosely(text);
        this.sheet.set(jsonToSheet(value, 'Sheet1'));
      }
    } catch (error) {
      this.sheet.set(null);
      this.parseError.set(error instanceof Error ? error.message : String(error));
    }
  }

  protected toggleCoerce(event: Event): void {
    this.coerceTypes.set((event.target as HTMLInputElement).checked);
    void this.parse(this.pasted());
  }

  protected toggleHeader(event: Event): void {
    this.firstRowIsHeader.set((event.target as HTMLInputElement).checked);
    void this.parse(this.pasted());
  }

  protected toggleStyle(event: Event): void {
    this.styleHeader.set((event.target as HTMLInputElement).checked);
  }

  protected async convert(): Promise<void> {
    const sheet = this.sheet();
    if (!sheet) return;

    const blob = await this.run('Building workbook…', () =>
      writeWorkbook([sheet], { styleHeader: this.styleHeader() }),
    );
    if (!blob) return;

    const file = this.primaryFile();
    const name = file ? withExtension(file.name, '.xlsx') : 'workbook.xlsx';
    this.setOutputs([this.output(name, blob)]);
  }

  protected startOver(): void {
    this.pasted.set('');
    this.sheet.set(null);
    this.parseError.set('');
    this.reset();
  }

  protected get previewName(): string {
    const file = this.primaryFile();
    return file ? baseNameOf(file.name) : 'workbook';
  }
}

/** Accepts standard JSON, and JSON Lines, which tools export surprisingly often. */
function parseJsonLoosely(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    const lines = trimmed.split('\n').filter((line) => line.trim());
    if (lines.length > 1) {
      try {
        return lines.map((line) => JSON.parse(line));
      } catch {
        /* fall through to the original error */
      }
    }
    throw new Error(
      error instanceof Error ? `Invalid JSON — ${error.message}` : 'Invalid JSON',
    );
  }
}
