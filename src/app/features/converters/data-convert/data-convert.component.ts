import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { SpreadsheetGridComponent } from '../../../shared/components/spreadsheet-grid/spreadsheet-grid.component';
import type { CellValue } from '../../../shared/components/spreadsheet-grid/spreadsheet-grid.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolBase } from '../../../shared/tool-base';
import { jsonToSheet, parseCsv, toCsvText } from '../../../core/engines/xlsx.engine';
import { readAsText, withExtension } from '../../../core/utils/file.util';

export type Direction = 'csv-to-json' | 'json-to-csv';

@Component({
  selector: 'app-data-convert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    ResultPanelComponent,
    BusyOverlayComponent,
    CopyButtonComponent,
    SpreadsheetGridComponent,
    IconComponent,
  ],
  templateUrl: './data-convert.component.html',
  styleUrl: './data-convert.component.scss',
})
export class DataConvertComponent extends ToolBase {
  readonly toolIdInput = input.required<string>({ alias: 'toolId' });
  readonly direction = input.required<Direction>();

  get toolId(): string {
    return this.toolIdInput();
  }

  protected readonly source = signal('');
  protected readonly headers = signal<string[]>([]);
  protected readonly rows = signal<CellValue[][]>([]);
  protected readonly parseError = signal('');
  protected readonly detectedDelimiter = signal('');

  protected readonly coerceTypes = signal(true);
  protected readonly firstRowIsHeader = signal(true);
  protected readonly prettyPrint = signal(true);
  protected readonly delimiter = signal(',');

  protected readonly toJson = computed(() => this.direction() === 'csv-to-json');
  protected readonly accepts = computed(() =>
    this.toJson() ? ['.csv', '.tsv', '.txt'] : ['.json', '.jsonl'],
  );

  protected readonly result = signal('');
  protected readonly hasData = computed(() => this.rows().length > 0);

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override afterFiles(files: File[]): void {
    const file = files[0];
    if (!file) return;
    void this.run('Reading file…', async () => {
      const text = await readAsText(file);
      this.source.set(text.length > 500_000 ? '' : text);
      await this.parse(text);
    });
  }

  protected async onInput(event: Event): Promise<void> {
    const text = (event.target as HTMLTextAreaElement).value;
    this.source.set(text);
    await this.parse(text);
  }

  private async parse(text: string): Promise<void> {
    this.parseError.set('');
    if (!text.trim()) {
      this.headers.set([]);
      this.rows.set([]);
      this.result.set('');
      return;
    }

    try {
      if (this.toJson()) {
        const parsed = await parseCsv(text, {
          header: this.firstRowIsHeader(),
          coerceTypes: this.coerceTypes(),
        });
        this.headers.set(parsed.headers);
        this.rows.set(parsed.rows);
        this.detectedDelimiter.set(parsed.delimiter === '\t' ? 'Tab' : parsed.delimiter);
        if (parsed.errors.length) this.parseError.set(parsed.errors.slice(0, 2).join(' · '));
      } else {
        const value = parseJsonLoosely(text);
        const sheet = jsonToSheet(value);
        this.headers.set([...(sheet.headers ?? [])]);
        this.rows.set(sheet.rows.map((row) => [...row]));
      }
      await this.buildResult();
    } catch (error) {
      this.headers.set([]);
      this.rows.set([]);
      this.result.set('');
      this.parseError.set(error instanceof Error ? error.message : String(error));
    }
  }

  private async buildResult(): Promise<void> {
    if (this.toJson()) {
      const records = this.rows().map((row) => {
        const record: Record<string, CellValue> = {};
        this.headers().forEach((header, index) => {
          record[header] = row[index] ?? null;
        });
        return record;
      });
      this.result.set(JSON.stringify(records, null, this.prettyPrint() ? 2 : undefined));
    } else {
      this.result.set(await toCsvText(this.headers(), this.rows(), this.delimiter()));
    }
  }

  protected async toggleCoerce(event: Event): Promise<void> {
    this.coerceTypes.set((event.target as HTMLInputElement).checked);
    await this.parse(this.source());
  }

  protected async toggleHeader(event: Event): Promise<void> {
    this.firstRowIsHeader.set((event.target as HTMLInputElement).checked);
    await this.parse(this.source());
  }

  protected async togglePretty(event: Event): Promise<void> {
    this.prettyPrint.set((event.target as HTMLInputElement).checked);
    await this.buildResult();
  }

  protected async setDelimiter(event: Event): Promise<void> {
    this.delimiter.set((event.target as HTMLSelectElement).value);
    await this.buildResult();
  }

  protected async download(): Promise<void> {
    const extension = this.toJson() ? '.json' : '.csv';
    const mime = this.toJson() ? 'application/json' : 'text/csv;charset=utf-8';
    const file = this.primaryFile();
    const name = file ? withExtension(file.name, extension) : `data${extension}`;
    this.setOutputs([this.output(name, new Blob([this.result()], { type: mime }))]);
  }

  protected startOver(): void {
    this.source.set('');
    this.headers.set([]);
    this.rows.set([]);
    this.result.set('');
    this.parseError.set('');
    this.reset();
  }
}

function parseJsonLoosely(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    // JSON Lines is common enough to be worth a second attempt.
    const lines = trimmed.split('\n').filter((line) => line.trim());
    if (lines.length > 1) {
      try {
        return lines.map((line) => JSON.parse(line));
      } catch {
        /* fall through */
      }
    }
    throw new Error(error instanceof Error ? `Invalid JSON — ${error.message}` : 'Invalid JSON');
  }
}
