import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { SpreadsheetGridComponent } from '../../../shared/components/spreadsheet-grid/spreadsheet-grid.component';
import type { CellValue } from '../../../shared/components/spreadsheet-grid/spreadsheet-grid.component';
import { DownloadService } from '../../../core/services/download.service';
import { ToastService } from '../../../core/services/toast.service';
import { parseCsv, readWorkbook, sheetToCsv, type SheetData } from '../../../core/engines/xlsx.engine';
import { extensionOf, readAsText, withExtension } from '../../../core/utils/file.util';

/** Workbook and CSV reader: sheet tabs, search, formula mode and export. */
@Component({
  selector: 'app-sheet-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, SpreadsheetGridComponent],
  template: `
    <div class="viewer">
      <div class="bar ou-no-print">
        @if (sheets().length > 1) {
          <div class="tabs">
            @for (sheet of sheets(); track sheet.name) {
              <button
                type="button"
                class="tab"
                [class.is-active]="sheet.name === activeName()"
                (click)="activeName.set(sheet.name)"
                [title]="sheet.name + ' — ' + sheet.rowCount + ' rows'"
              >
                {{ sheet.name }}
                @if (sheet.hidden) {
                  <app-icon name="eye-off" [size]="11" />
                }
              </button>
            }
          </div>
          <span class="bar__divider"></span>
        }

        <div class="find">
          <app-icon name="search" [size]="14" />
          <input
            type="search"
            class="find__input"
            placeholder="Find in sheet…"
            [value]="query()"
            (input)="onQuery($event)"
            aria-label="Find in sheet"
          />
        </div>

        @if (active()?.formulas?.length) {
          <button
            type="button"
            class="ou-btn ou-btn--sm ou-btn--ghost"
            [class.is-active]="showFormulas()"
            (click)="showFormulas.set(!showFormulas())"
            title="Show formulas instead of results"
          >
            <app-icon name="function" [size]="14" />
            Formulas
          </button>
        }

        <span class="ou-spacer"></span>

        <span class="ou-subtle">
          {{ filteredRows().length.toLocaleString() }} of
          {{ active()?.rowCount?.toLocaleString() ?? 0 }} rows
        </span>

        <button type="button" class="ou-btn ou-btn--sm" (click)="exportCsv()">
          <app-icon name="download" [size]="14" />
          CSV
        </button>
      </div>

      <div class="grid-area">
        @if (loading()) {
          <div class="ou-skeleton loader"></div>
        } @else if (error()) {
          <p class="error">
            <app-icon name="alert-circle" [size]="16" />
            {{ error() }}
          </p>
        } @else if (active(); as sheet) {
          <app-spreadsheet-grid
            [headers]="sheet.headers"
            [rows]="filteredRows()"
            maxHeight="70vh"
          />
        }
      </div>
    </div>
  `,
  styleUrl: './sheet-view.component.scss',
})
export class SheetViewComponent {
  private readonly downloads = inject(DownloadService);
  private readonly toast = inject(ToastService);

  readonly file = input.required<File>();

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly sheets = signal<SheetData[]>([]);
  protected readonly activeName = signal('');
  protected readonly query = signal('');
  protected readonly showFormulas = signal(false);

  protected readonly active = computed<SheetData | null>(() => {
    const list = this.sheets();
    if (!list.length) return null;
    return list.find((sheet) => sheet.name === this.activeName()) ?? list[0];
  });

  /** Rows filtered by the find box, with formula mode applied when on. */
  protected readonly filteredRows = computed<CellValue[][]>(() => {
    const sheet = this.active();
    if (!sheet) return [];

    let rows = sheet.rows;

    if (this.showFormulas() && sheet.formulas.length) {
      // Overlay formulas onto their cells so the sheet reads like Word's
      // "show formulas" mode rather than a separate list.
      const byCell = new Map(
        sheet.formulas.map((cell) => [cell.address, cell.formula] as const),
      );
      rows = rows.map((row, rowIndex) =>
        row.map((value, columnIndex) => {
          const address = `${columnName(columnIndex)}${rowIndex + 2}`;
          return byCell.get(address) ?? value;
        }),
      );
    }

    const needle = this.query().trim().toLowerCase();
    if (!needle) return rows;

    return rows.filter((row) =>
      row.some((cell) => String(cell ?? '').toLowerCase().includes(needle)),
    );
  });

  constructor() {
    effect(() => {
      const file = this.file();
      if (file) void this.load(file);
    });
  }

  private async load(file: File): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    try {
      if (['.csv', '.tsv', '.txt'].includes(extensionOf(file.name))) {
        const parsed = await parseCsv(await readAsText(file), {
          header: true,
          coerceTypes: true,
        });
        this.sheets.set([
          {
            name: file.name,
            headers: parsed.headers,
            rows: parsed.rows,
            rowCount: parsed.rows.length,
            columnCount: parsed.headers.length,
            range: 'A1',
            formulas: [],
            hidden: false,
          },
        ]);
      } else {
        const workbook = await readWorkbook(file, { header: true });
        this.sheets.set(workbook.sheets);
      }
      this.activeName.set(this.sheets()[0]?.name ?? '');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : String(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected async exportCsv(): Promise<void> {
    const sheet = this.active();
    if (!sheet) return;
    const csv = await sheetToCsv(sheet);
    await this.downloads.saveText(
      csv,
      withExtension(`${this.file().name}-${sheet.name}`, '.csv'),
      'text/csv;charset=utf-8',
    );
    this.toast.success('Sheet exported as CSV');
  }
}

function columnName(index: number): string {
  let letters = '';
  let n = index;
  do {
    letters = String.fromCharCode(65 + (n % 26)) + letters;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return letters;
}
