import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';

/** Everything a spreadsheet cell can hold once parsed. Dates stay as Date
 * objects so formatting decisions belong to the view, not the parser. */
export type CellValue = string | number | boolean | Date | null | undefined;

/**
 * Windowed data grid.
 *
 * Only the rows inside the viewport (plus a small overscan) are in the DOM, so
 * a sheet with half a million rows scrolls as smoothly as one with ten. Column
 * widths are estimated once from a sample rather than measured per cell.
 */
@Component({
  selector: 'app-spreadsheet-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid" [style.--row-h.px]="rowHeight()">
      <div class="grid__scroll" [style.max-height]="maxHeight()" (scroll)="onScroll($event)">
        <div class="grid__sizer" [style.height.px]="totalHeight()">
          <table class="grid__table" [style.transform]="'translateY(' + offsetY() + 'px)'">
            <thead>
              <tr>
                @if (showRowNumbers()) {
                  <th class="grid__gutter"></th>
                }
                @for (header of headers(); track $index) {
                  <th
                    [style.width.px]="columnWidths()[$index]"
                    [class.is-sorted]="sortColumn() === $index"
                    (click)="toggleSort($index)"
                    [title]="header"
                  >
                    <span>{{ header }}</span>
                    @if (sortColumn() === $index) {
                      <small>{{ sortAscending() ? '▲' : '▼' }}</small>
                    }
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (row of visibleRows(); track startIndex() + $index) {
                <tr [class.is-alt]="(startIndex() + $index) % 2 === 1">
                  @if (showRowNumbers()) {
                    <td class="grid__gutter">{{ startIndex() + $index + 1 }}</td>
                  }
                  @for (cell of row; track $index) {
                    <td
                      [style.width.px]="columnWidths()[$index]"
                      [class.is-number]="isNumber(cell)"
                      [class.is-empty]="cell === null || cell === undefined || cell === ''"
                      [title]="display(cell)"
                    >
                      {{ display(cell) }}
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <footer class="grid__foot">
        <span>{{ rows().length.toLocaleString() }} rows × {{ headers().length }} columns</span>
        @if (sortColumn() !== null) {
          <button type="button" class="ou-btn ou-btn--sm ou-btn--ghost" (click)="clearSort()">
            Clear sort
          </button>
        }
      </footer>
    </div>
  `,
  styleUrl: './spreadsheet-grid.component.scss',
})
export class SpreadsheetGridComponent {
  readonly headers = input<readonly string[]>([]);
  readonly rows = input<readonly CellValue[][]>([]);
  readonly rowHeight = input(30);
  readonly maxHeight = input('62vh');
  readonly showRowNumbers = input(true);
  readonly sortable = input(true);

  readonly sortChange = output<{ column: number | null; ascending: boolean }>();

  protected readonly scrollTop = signal(0);
  protected readonly viewportHeight = signal(600);
  protected readonly sortColumn = signal<number | null>(null);
  protected readonly sortAscending = signal(true);

  private readonly overscan = 8;

  protected readonly sortedRows = computed(() => {
    const column = this.sortColumn();
    const rows = this.rows();
    if (column === null) return rows;
    const direction = this.sortAscending() ? 1 : -1;
    return [...rows].sort((a, b) => compareCells(a[column], b[column]) * direction);
  });

  protected readonly totalHeight = computed(() => this.sortedRows().length * this.rowHeight());

  protected readonly startIndex = computed(() =>
    Math.max(0, Math.floor(this.scrollTop() / this.rowHeight()) - this.overscan),
  );

  protected readonly visibleRows = computed(() => {
    const count = Math.ceil(this.viewportHeight() / this.rowHeight()) + this.overscan * 2;
    return this.sortedRows().slice(this.startIndex(), this.startIndex() + count);
  });

  protected readonly offsetY = computed(() => this.startIndex() * this.rowHeight());

  /** One pass over a sample of rows gives widths that look measured. */
  protected readonly columnWidths = computed(() => {
    const headers = this.headers();
    const sample = this.rows().slice(0, 200);
    return headers.map((header, column) => {
      let longest = String(header ?? '').length;
      for (const row of sample) {
        const length = String(row[column] ?? '').length;
        if (length > longest) longest = length;
      }
      return Math.min(360, Math.max(72, longest * 8 + 24));
    });
  });

  protected onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    this.scrollTop.set(element.scrollTop);
    this.viewportHeight.set(element.clientHeight);
  }

  protected toggleSort(column: number): void {
    if (!this.sortable()) return;
    if (this.sortColumn() === column) {
      if (!this.sortAscending()) return this.clearSort();
      this.sortAscending.set(false);
    } else {
      this.sortColumn.set(column);
      this.sortAscending.set(true);
    }
    this.sortChange.emit({ column: this.sortColumn(), ascending: this.sortAscending() });
  }

  protected clearSort(): void {
    this.sortColumn.set(null);
    this.sortAscending.set(true);
    this.sortChange.emit({ column: null, ascending: true });
  }

  protected isNumber(value: CellValue): boolean {
    return typeof value === 'number';
  }

  protected display(value: CellValue): string {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toLocaleDateString();
    return String(value);
  }
}

function compareCells(a: CellValue, b: CellValue): number {
  const aEmpty = a === null || a === undefined || a === '';
  const bEmpty = b === null || b === undefined || b === '';
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1; // blanks always sink
  if (bEmpty) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}
