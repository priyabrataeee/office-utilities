import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolBase } from '../../../shared/tool-base';
import { StorageService } from '../../../core/services/storage.service';
import { columnLetter, writeWorkbook } from '../../../core/engines/xlsx.engine';

const DRAFT_KEY = 'xlsx-creator-draft';

interface SavedSheet {
  readonly title: string;
  readonly headers: string[];
  readonly rows: string[][];
}

/**
 * Freeform workbook editor: an editable grid that becomes a real .xlsx.
 *
 * Cells are strings while being edited; type inference — number, boolean,
 * date, blank — happens once at export time so the user is never confused by
 * their spreadsheet reformatting under them as they type.
 */
@Component({
  selector: 'app-sheet-creator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolShellComponent, ResultPanelComponent, BusyOverlayComponent, IconComponent],
  templateUrl: './sheet-creator.component.html',
  styleUrl: './sheet-creator.component.scss',
})
export class SheetCreatorComponent extends ToolBase {
  private readonly storage = inject(StorageService);

  readonly toolId = 'xlsx-creator';

  protected readonly title = signal('Untitled workbook');
  protected readonly headers = signal<string[]>(['Name', 'Email', 'Signups', 'Joined']);
  protected readonly rows = signal<string[][]>([
    ['Ada Lovelace', 'ada@example.com', '42', '2026-03-14'],
    ['Alan Turing', 'alan@example.com', '17', '2026-04-02'],
    ['Grace Hopper', 'grace@example.com', '133', '2026-04-10'],
  ]);
  protected readonly savedAt = signal<number | null>(null);
  protected readonly styleHeader = signal(true);
  protected readonly detectTypes = signal(true);

  /**
   * Live type badges for each column, computed from the current rows so people
   * see whether their date column looks like a date or is still being read as
   * text before they export.
   */
  protected readonly columnTypes = computed(() =>
    this.headers().map((_, index) => inferColumnType(this.rows(), index)),
  );

  protected readonly totalCells = computed(() => this.rows().length * this.headers().length);

  constructor() {
    super();
    const saved = this.storage.read<SavedSheet | null>(DRAFT_KEY, null);
    if (saved) {
      this.title.set(saved.title);
      this.headers.set([...saved.headers]);
      this.rows.set(saved.rows.map((row) => [...row]));
    }

    // Persist on any edit — cheap enough since the whole payload is strings.
    effect(() => {
      const snapshot: SavedSheet = {
        title: this.title(),
        headers: this.headers(),
        rows: this.rows(),
      };
      untracked(() => {
        this.storage.write(DRAFT_KEY, snapshot);
        this.savedAt.set(Date.now());
      });
    });
  }

  protected setTitle(event: Event): void {
    this.title.set((event.target as HTMLInputElement).value);
  }

  protected setHeader(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.headers.update((current) => current.map((header, i) => (i === index ? value : header)));
  }

  protected setCell(rowIndex: number, columnIndex: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.rows.update((current) =>
      current.map((row, r) =>
        r === rowIndex ? row.map((cell, c) => (c === columnIndex ? value : cell)) : row,
      ),
    );
  }

  protected addRow(after?: number): void {
    const blank = new Array<string>(this.headers().length).fill('');
    this.rows.update((current) => {
      if (typeof after !== 'number') return [...current, blank];
      const next = [...current];
      next.splice(after + 1, 0, blank);
      return next;
    });
  }

  protected removeRow(index: number): void {
    if (this.rows().length <= 1) {
      this.rows.set([new Array<string>(this.headers().length).fill('')]);
      return;
    }
    this.rows.update((current) => current.filter((_, i) => i !== index));
  }

  protected addColumn(): void {
    const next = columnLetter(this.headers().length);
    this.headers.update((current) => [...current, next]);
    this.rows.update((current) => current.map((row) => [...row, '']));
  }

  protected removeColumn(index: number): void {
    if (this.headers().length <= 1) return;
    this.headers.update((current) => current.filter((_, i) => i !== index));
    this.rows.update((current) => current.map((row) => row.filter((_, i) => i !== index)));
  }

  protected moveColumn(index: number, delta: number): void {
    const target = index + delta;
    if (target < 0 || target >= this.headers().length) return;
    const swap = <T>(list: T[]): T[] => {
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    };
    this.headers.update(swap);
    this.rows.update((current) => current.map(swap));
  }

  protected clearAll(): void {
    this.headers.set(['Column A']);
    this.rows.set([['']]);
    this.title.set('Untitled workbook');
    this.toast.info('Workbook cleared');
  }

  protected discardDraft(): void {
    this.storage.remove(DRAFT_KEY);
    this.clearAll();
    this.savedAt.set(null);
  }

  protected toggleStyleHeader(event: Event): void {
    this.styleHeader.set((event.target as HTMLInputElement).checked);
  }

  protected toggleDetectTypes(event: Event): void {
    this.detectTypes.set((event.target as HTMLInputElement).checked);
  }

  protected async downloadXlsx(): Promise<void> {
    const typed = this.detectTypes()
      ? this.rows().map((row) => row.map((cell) => coerce(cell)))
      : this.rows().map((row) => row.map((cell) => (cell === '' ? null : cell)));

    const blob = await this.run('Building workbook…', () =>
      writeWorkbook(
        [{ name: 'Sheet1', headers: this.headers(), rows: typed }],
        { styleHeader: this.styleHeader() },
      ),
    );
    if (blob) this.setOutputs([this.output(`${filename(this.title())}.xlsx`, blob)]);
  }

  protected async downloadCsv(): Promise<void> {
    const blob = await this.run('Building CSV…', () =>
      writeWorkbook(
        [{ name: 'Sheet1', headers: this.headers(), rows: this.rows() }],
        { styleHeader: false, bookType: 'csv' },
      ),
    );
    if (blob) this.setOutputs([this.output(`${filename(this.title())}.csv`, blob)]);
  }

  protected startOver(): void {
    this.clearOutputs();
  }

  protected labelFor(type: string): string {
    switch (type) {
      case 'number':
        return 'numbers';
      case 'date':
        return 'dates';
      case 'boolean':
        return 'true/false';
      case 'empty':
        return 'empty';
      default:
        return 'text';
    }
  }
}

type CellType = 'text' | 'number' | 'date' | 'boolean' | 'empty' | 'mixed';

function inferColumnType(rows: readonly string[][], columnIndex: number): CellType {
  let seen: CellType | null = null;
  for (const row of rows) {
    const cell = row[columnIndex]?.trim() ?? '';
    if (cell === '') continue;
    const type = classify(cell);
    if (seen === null) seen = type;
    else if (seen !== type) return 'mixed';
  }
  return seen ?? 'empty';
}

function classify(value: string): CellType {
  if (value === '') return 'empty';
  const lower = value.toLowerCase();
  if (lower === 'true' || lower === 'false') return 'boolean';
  if (/^-?\d+(\.\d+)?$/.test(value.replace(/,/g, ''))) return 'number';
  if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/.test(value)) {
    return Number.isNaN(Date.parse(value)) ? 'text' : 'date';
  }
  return 'text';
}

/** Turns the string a user typed into the type the workbook should record. */
function coerce(value: string): string | number | boolean | Date | null {
  if (value === '') return null;
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  const numeric = trimmed.replace(/,/g, '');
  if (/^-?\d+(\.\d+)?$/.test(numeric)) {
    const parsed = Number(numeric);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/.test(trimmed)) {
    const date = new Date(trimmed);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return value;
}

function filename(title: string): string {
  const stem = title.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return stem || 'workbook';
}
