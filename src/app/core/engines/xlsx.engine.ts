import type { CellValue } from '../../shared/components/spreadsheet-grid/spreadsheet-grid.component';

/**
 * Spreadsheet engine built on SheetJS.
 *
 * Everything is loaded on demand and runs in this tab. The workbook model
 * below is deliberately plain so the grid, the statistics tools and the
 * converters can all share it without knowing about SheetJS.
 */

export type Sheets = typeof import('xlsx');

let libPromise: Promise<Sheets> | null = null;

export function loadSheetJs(): Promise<Sheets> {
  libPromise ??= import('xlsx');
  return libPromise;
}

export interface SheetData {
  readonly name: string;
  readonly headers: string[];
  readonly rows: CellValue[][];
  readonly rowCount: number;
  readonly columnCount: number;
  /** `A1`-style reference of the used range. */
  readonly range: string;
  readonly formulas: readonly FormulaCell[];
  readonly hidden: boolean;
}

export interface FormulaCell {
  readonly sheet: string;
  readonly address: string;
  readonly formula: string;
  readonly result: CellValue;
  readonly functions: readonly string[];
}

export interface WorkbookData {
  readonly sheets: SheetData[];
  readonly sheetNames: string[];
  readonly properties: Record<string, string>;
}

export interface ReadOptions {
  /** Treat the first row as headers. */
  readonly header?: boolean;
  /** Keep dates as Date objects instead of formatted strings. */
  readonly rawDates?: boolean;
  readonly onProgress?: (sheet: number, total: number) => void;
}

/* ------------------------------------------------------------------
   Reading
   ------------------------------------------------------------------ */

export async function readWorkbook(file: Blob, options: ReadOptions = {}): Promise<WorkbookData> {
  const XLSX = await loadSheetJs();
  const buffer = await file.arrayBuffer();

  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellFormula: true,
    cellDates: true,
    cellNF: false,
    cellStyles: false,
    dense: false,
  });

  const sheets: SheetData[] = [];
  const useHeader = options.header ?? true;

  workbook.SheetNames.forEach((name, index) => {
    const sheet = workbook.Sheets[name];
    if (!sheet) return;

    const matrix = XLSX.utils.sheet_to_json<CellValue[]>(sheet, {
      header: 1,
      defval: null,
      blankrows: true,
      raw: !!options.rawDates,
    }) as CellValue[][];

    const headers = useHeader && matrix.length ? normaliseHeaders(matrix[0]) : [];
    const rows = useHeader ? matrix.slice(1) : matrix;
    const columnCount = Math.max(headers.length, ...rows.map((row) => row.length), 0);

    // Pad short rows so every row has the same shape as the header.
    const padded = rows.map((row) => {
      const copy = [...row];
      while (copy.length < columnCount) copy.push(null);
      return copy;
    });

    const finalHeaders =
      headers.length >= columnCount
        ? headers
        : [
            ...headers,
            ...Array.from({ length: columnCount - headers.length }, (_, i) =>
              columnLetter(headers.length + i),
            ),
          ];

    sheets.push({
      name,
      headers: useHeader
        ? finalHeaders
        : Array.from({ length: columnCount }, (_, i) => columnLetter(i)),
      rows: padded,
      rowCount: padded.length,
      columnCount,
      range: sheet['!ref'] ?? 'A1',
      formulas: collectFormulas(XLSX, sheet, name),
      hidden: (workbook.Workbook?.Sheets?.[index]?.Hidden ?? 0) !== 0,
    });

    options.onProgress?.(index + 1, workbook.SheetNames.length);
  });

  return {
    sheets,
    sheetNames: workbook.SheetNames,
    properties: extractProperties(workbook),
  };
}

/** Turns duplicate or blank header cells into something usable. */
function normaliseHeaders(row: CellValue[]): string[] {
  const seen = new Map<string, number>();
  return row.map((cell, index) => {
    let name = String(cell ?? '').trim() || columnLetter(index);
    const count = seen.get(name) ?? 0;
    seen.set(name, count + 1);
    if (count > 0) name = `${name} (${count + 1})`;
    return name;
  });
}

export function columnLetter(index: number): string {
  let letters = '';
  let n = index;
  do {
    letters = String.fromCharCode(65 + (n % 26)) + letters;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return letters;
}

function collectFormulas(
  XLSX: Sheets,
  sheet: import('xlsx').WorkSheet,
  sheetName: string,
): FormulaCell[] {
  const ref = sheet['!ref'];
  if (!ref) return [];

  const out: FormulaCell[] = [];
  const range = XLSX.utils.decode_range(ref);

  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let column = range.s.c; column <= range.e.c; column++) {
      const address = XLSX.utils.encode_cell({ r: row, c: column });
      const cell = sheet[address] as { f?: string; v?: CellValue } | undefined;
      if (!cell?.f) continue;
      out.push({
        sheet: sheetName,
        address,
        formula: `=${cell.f}`,
        result: cell.v ?? null,
        functions: [...new Set(cell.f.match(/[A-Z][A-Z0-9._]*(?=\()/g) ?? [])],
      });
    }
  }
  return out;
}

function extractProperties(workbook: import('xlsx').WorkBook): Record<string, string> {
  const props = workbook.Props ?? {};
  const out: Record<string, string> = {};
  const map: Record<string, unknown> = {
    Title: props.Title,
    Subject: props.Subject,
    Author: props.Author,
    Manager: props.Manager,
    Company: props.Company,
    Category: props.Category,
    Keywords: props.Keywords,
    Comments: props.Comments,
    'Last modified by': props.LastAuthor,
    Created: props.CreatedDate,
    Application: props.Application,
  };
  for (const [key, value] of Object.entries(map)) {
    if (value === undefined || value === null || value === '') continue;
    out[key] = value instanceof Date ? value.toLocaleString() : String(value);
  }
  return out;
}

/* ------------------------------------------------------------------
   Writing
   ------------------------------------------------------------------ */

export interface WriteSheet {
  readonly name: string;
  readonly headers?: readonly string[];
  readonly rows: readonly CellValue[][];
}

export interface WriteOptions {
  /** Bold, frozen header row with auto-sized columns. */
  readonly styleHeader?: boolean;
  readonly bookType?: 'xlsx' | 'csv' | 'ods';
}

export async function writeWorkbook(
  sheets: readonly WriteSheet[],
  options: WriteOptions = {},
): Promise<Blob> {
  const XLSX = await loadSheetJs();
  const workbook = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const matrix: CellValue[][] = sheet.headers
      ? [[...sheet.headers], ...sheet.rows.map((row) => [...row])]
      : sheet.rows.map((row) => [...row]);

    const worksheet = XLSX.utils.aoa_to_sheet(matrix as unknown[][], { cellDates: true });

    if (options.styleHeader !== false && sheet.headers?.length) {
      worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };
      // Column widths estimated from the first 200 rows, which is enough to
      // stop everything arriving as "########".
      worksheet['!cols'] = sheet.headers.map((header, column) => {
        let widest = String(header).length;
        for (const row of sheet.rows.slice(0, 200)) {
          widest = Math.max(widest, String(row[column] ?? '').length);
        }
        return { wch: Math.min(60, Math.max(9, widest + 2)) };
      });
    }

    // Sheet names are capped at 31 characters and cannot contain []:*?/\
    const safeName = sheet.name.replace(/[[\]:*?/\\]/g, '-').slice(0, 31) || 'Sheet';
    XLSX.utils.book_append_sheet(workbook, worksheet, safeName);
  }

  const bookType = options.bookType ?? 'xlsx';
  const out = XLSX.write(workbook, { type: 'array', bookType, compression: true });

  const mime =
    bookType === 'csv'
      ? 'text/csv;charset=utf-8'
      : bookType === 'ods'
        ? 'application/vnd.oasis.opendocument.spreadsheet'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  return new Blob([out as ArrayBuffer], { type: mime });
}

export async function sheetToCsv(
  sheet: SheetData,
  delimiter = ',',
  includeHeader = true,
): Promise<string> {
  const XLSX = await loadSheetJs();
  const matrix = includeHeader ? [sheet.headers, ...sheet.rows] : sheet.rows;
  const worksheet = XLSX.utils.aoa_to_sheet(matrix as unknown[][], { cellDates: true });
  return XLSX.utils.sheet_to_csv(worksheet, { FS: delimiter, blankrows: false });
}

/* ------------------------------------------------------------------
   JSON conversion
   ------------------------------------------------------------------ */

export function sheetToJson(
  sheet: SheetData,
  style: 'objects' | 'arrays' = 'objects',
): unknown[] {
  if (style === 'arrays') return sheet.rows.map((row) => [...row]);
  return sheet.rows.map((row) => {
    const record: Record<string, CellValue> = {};
    sheet.headers.forEach((header, index) => {
      record[header] = row[index] ?? null;
    });
    return record;
  });
}

/** Flattens nested JSON into dotted column names, one row per record. */
export function jsonToSheet(value: unknown, sheetName = 'Sheet1'): WriteSheet {
  const records = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? findRecordArray(value as Record<string, unknown>) ?? [value]
      : [value];

  const flattened = records.map((record) =>
    record && typeof record === 'object' && !Array.isArray(record)
      ? flatten(record as Record<string, unknown>)
      : { value: record as CellValue },
  );

  // Union of keys across every record, so sparse data still gets columns.
  const headers: string[] = [];
  for (const record of flattened) {
    for (const key of Object.keys(record)) if (!headers.includes(key)) headers.push(key);
  }

  const rows = flattened.map((record) =>
    headers.map((header) => (header in record ? record[header] : null)),
  );

  return { name: sheetName, headers, rows };
}

/** Finds the most likely array of records inside a wrapper object. */
function findRecordArray(value: Record<string, unknown>): unknown[] | null {
  let best: unknown[] | null = null;
  for (const candidate of Object.values(value)) {
    if (Array.isArray(candidate) && candidate.length > (best?.length ?? 0)) {
      best = candidate;
    }
  }
  return best;
}

function flatten(
  value: Record<string, unknown>,
  prefix = '',
  depth = 0,
): Record<string, CellValue> {
  const out: Record<string, CellValue> = {};
  for (const [key, raw] of Object.entries(value)) {
    const name = prefix ? `${prefix}.${key}` : key;

    if (raw === null || raw === undefined) {
      out[name] = null;
    } else if (Array.isArray(raw)) {
      // Arrays of scalars read better joined than exploded into columns.
      out[name] = raw.every((item) => typeof item !== 'object' || item === null)
        ? raw.join(', ')
        : JSON.stringify(raw);
    } else if (typeof raw === 'object') {
      if (raw instanceof Date) out[name] = raw.toISOString();
      else if (depth >= 4) out[name] = JSON.stringify(raw);
      else Object.assign(out, flatten(raw as Record<string, unknown>, name, depth + 1));
    } else {
      out[name] = raw as CellValue;
    }
  }
  return out;
}

/* ------------------------------------------------------------------
   Cleaning operations
   ------------------------------------------------------------------ */

export interface CleanOptions {
  readonly trimWhitespace: boolean;
  readonly collapseSpaces: boolean;
  readonly removeBlankRows: boolean;
  readonly removeBlankColumns: boolean;
  readonly removeDuplicateRows: boolean;
  readonly numbersFromText: boolean;
  readonly normaliseCase: 'none' | 'lower' | 'upper' | 'title' | 'sentence';
  readonly stripNonPrintable: boolean;
}

export interface CleanReport {
  readonly headers: string[];
  readonly rows: CellValue[][];
  readonly cellsChanged: number;
  readonly rowsRemoved: number;
  readonly columnsRemoved: number;
  readonly duplicatesRemoved: number;
}

export function cleanSheet(sheet: SheetData, options: CleanOptions): CleanReport {
  let cellsChanged = 0;
  let rows = sheet.rows.map((row) => [...row]);
  let headers = [...sheet.headers];

  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const original = rows[r][c];
      const cleaned = cleanCell(original, options);
      if (cleaned !== original) {
        rows[r][c] = cleaned;
        cellsChanged++;
      }
    }
  }

  const beforeRows = rows.length;
  if (options.removeBlankRows) rows = rows.filter((row) => !isBlankRow(row));
  const rowsRemoved = beforeRows - rows.length;

  let columnsRemoved = 0;
  if (options.removeBlankColumns) {
    const keep: number[] = [];
    for (let c = 0; c < headers.length; c++) {
      const headerFilled = String(headers[c] ?? '').trim() !== '';
      const anyData = rows.some((row) => !isBlankCell(row[c]));
      if (headerFilled || anyData) keep.push(c);
    }
    columnsRemoved = headers.length - keep.length;
    if (columnsRemoved > 0) {
      headers = keep.map((c) => headers[c]);
      rows = rows.map((row) => keep.map((c) => row[c] ?? null));
    }
  }

  let duplicatesRemoved = 0;
  if (options.removeDuplicateRows) {
    const seen = new Set<string>();
    const unique: CellValue[][] = [];
    for (const row of rows) {
      const key = JSON.stringify(row.map((cell) => (cell === null ? '' : String(cell))));
      if (seen.has(key)) {
        duplicatesRemoved++;
        continue;
      }
      seen.add(key);
      unique.push(row);
    }
    rows = unique;
  }

  return { headers, rows, cellsChanged, rowsRemoved, columnsRemoved, duplicatesRemoved };
}

function cleanCell(value: CellValue, options: CleanOptions): CellValue {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'string') return value;

  let text = value;
  if (options.stripNonPrintable) {
    text = text.replace(NON_PRINTABLE, '');
  }
  if (options.trimWhitespace) text = text.trim();
  if (options.collapseSpaces) text = text.replace(/\s+/g, ' ');

  switch (options.normaliseCase) {
    case 'lower':
      text = text.toLowerCase();
      break;
    case 'upper':
      text = text.toUpperCase();
      break;
    case 'title':
      text = text.replace(/\w\S*/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase());
      break;
    case 'sentence':
      text = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
      break;
  }

  if (options.numbersFromText && text !== '') {
    // Only convert when the whole cell is a number — "12 Main St" must stay text.
    const numeric = text.replace(/[\s,]/g, '');
    if (/^-?\d+(\.\d+)?$/.test(numeric)) {
      const parsed = Number(numeric);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return text;
}

const NON_PRINTABLE = new RegExp('[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f]', 'g');

export function isBlankCell(value: CellValue): boolean {
  return value === null || value === undefined || String(value).trim() === '';
}

export function isBlankRow(row: readonly CellValue[]): boolean {
  return row.every(isBlankCell);
}

/* ------------------------------------------------------------------
   Duplicate detection
   ------------------------------------------------------------------ */

export interface DuplicateOptions {
  /** Column indices that form the key. Empty means every column. */
  readonly keyColumns: readonly number[];
  readonly caseInsensitive: boolean;
  readonly ignoreWhitespace: boolean;
  readonly keep: 'first' | 'last';
}

export interface DuplicateGroup {
  readonly key: string;
  readonly rowIndices: number[];
}

export function findDuplicates(
  sheet: SheetData,
  options: DuplicateOptions,
): { groups: DuplicateGroup[]; keptRows: CellValue[][] } {
  const columns = options.keyColumns.length
    ? [...options.keyColumns]
    : sheet.headers.map((_, index) => index);

  const buckets = new Map<string, number[]>();
  sheet.rows.forEach((row, index) => {
    const key = columns
      .map((column) => {
        let text = String(row[column] ?? '');
        if (options.ignoreWhitespace) text = text.replace(/\s+/g, ' ').trim();
        if (options.caseInsensitive) text = text.toLowerCase();
        return text;
      })
      .join(' ');
    buckets.set(key, [...(buckets.get(key) ?? []), index]);
  });

  const groups: DuplicateGroup[] = [];
  const drop = new Set<number>();

  for (const [key, indices] of buckets) {
    if (indices.length < 2) continue;
    groups.push({ key, rowIndices: indices });
    const survivor = options.keep === 'first' ? indices[0] : indices[indices.length - 1];
    for (const index of indices) if (index !== survivor) drop.add(index);
  }

  return {
    groups,
    keptRows: sheet.rows.filter((_, index) => !drop.has(index)),
  };
}

/* ------------------------------------------------------------------
   Column profiling
   ------------------------------------------------------------------ */

export type DetectedType =
  | 'integer'
  | 'decimal'
  | 'date'
  | 'boolean'
  | 'email'
  | 'url'
  | 'text'
  | 'empty';

export interface ColumnStats {
  readonly name: string;
  readonly index: number;
  readonly type: DetectedType;
  readonly filled: number;
  readonly empty: number;
  readonly distinct: number;
  readonly min: number | null;
  readonly max: number | null;
  readonly sum: number | null;
  readonly mean: number | null;
  readonly median: number | null;
  readonly stdDev: number | null;
  readonly shortest: string | null;
  readonly longest: string | null;
  readonly topValues: readonly { value: string; count: number }[];
  /** Rows that do not match the inferred type, for the validation tool. */
  readonly outliers: readonly { row: number; value: string }[];
  /** Bucketed counts for the sparkline. */
  readonly histogram: readonly number[];
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const URL_LIKE = /^(https?:\/\/|www\.)\S+$/i;
const BOOLEANS = new Set(['true', 'false', 'yes', 'no', 'y', 'n', '1', '0']);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?)?/;
const LOOSE_DATE = /^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}$/;

export function profileColumn(sheet: SheetData, index: number): ColumnStats {
  const name = sheet.headers[index] ?? columnLetter(index);
  const raw = sheet.rows.map((row) => row[index] ?? null);

  const values: string[] = [];
  const numbers: number[] = [];
  const counts = new Map<string, number>();
  let empty = 0;

  const typeVotes: Record<DetectedType, number> = {
    integer: 0,
    decimal: 0,
    date: 0,
    boolean: 0,
    email: 0,
    url: 0,
    text: 0,
    empty: 0,
  };

  raw.forEach((cell) => {
    if (isBlankCell(cell)) {
      empty++;
      return;
    }
    const text = cell instanceof Date ? cell.toISOString() : String(cell);
    values.push(text);
    counts.set(text, (counts.get(text) ?? 0) + 1);

    const detected = detectType(cell);
    typeVotes[detected]++;
    if (detected === 'integer' || detected === 'decimal') {
      numbers.push(typeof cell === 'number' ? cell : Number(text.replace(/[\s,]/g, '')));
    }
  });

  // The dominant non-text type wins, provided it covers most filled cells.
  const filled = values.length;
  let type: DetectedType = 'text';
  if (filled === 0) {
    type = 'empty';
  } else {
    const ranked = (Object.entries(typeVotes) as [DetectedType, number][])
      .filter(([key]) => key !== 'empty')
      .sort((a, b) => b[1] - a[1]);
    const [topType, topCount] = ranked[0];
    // Integers and decimals are the same family for this purpose.
    const numericCount = typeVotes.integer + typeVotes.decimal;
    if (numericCount / filled >= 0.9) {
      type = typeVotes.decimal > 0 ? 'decimal' : 'integer';
    } else if (topCount / filled >= 0.9) {
      type = topType;
    }
  }

  const outliers: { row: number; value: string }[] = [];
  if (type !== 'text' && type !== 'empty') {
    raw.forEach((cell, rowIndex) => {
      if (isBlankCell(cell)) return;
      const detected = detectType(cell);
      const matches =
        detected === type ||
        ((type === 'decimal' || type === 'integer') &&
          (detected === 'integer' || detected === 'decimal'));
      if (!matches && outliers.length < 100) {
        outliers.push({ row: rowIndex + 1, value: String(cell) });
      }
    });
  }

  const sorted = [...numbers].sort((a, b) => a - b);
  const sum = numbers.length ? numbers.reduce((total, n) => total + n, 0) : null;
  const mean = sum !== null ? sum / numbers.length : null;
  const median = sorted.length
    ? sorted.length % 2
      ? sorted[(sorted.length - 1) / 2]
      : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : null;
  const stdDev =
    mean !== null && numbers.length > 1
      ? Math.sqrt(numbers.reduce((total, n) => total + (n - mean) ** 2, 0) / (numbers.length - 1))
      : null;

  const lengths = values.map((value) => value.length);

  return {
    name,
    index,
    type,
    filled,
    empty,
    distinct: counts.size,
    min: sorted.length ? sorted[0] : null,
    max: sorted.length ? sorted[sorted.length - 1] : null,
    sum,
    mean,
    median,
    stdDev,
    shortest: lengths.length ? values[lengths.indexOf(Math.min(...lengths))] : null,
    longest: lengths.length ? values[lengths.indexOf(Math.max(...lengths))] : null,
    topValues: [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([value, count]) => ({ value, count })),
    outliers,
    histogram: buildHistogram(sorted),
  };
}

export function profileSheet(sheet: SheetData): ColumnStats[] {
  return sheet.headers.map((_, index) => profileColumn(sheet, index));
}

export function detectType(value: CellValue): DetectedType {
  if (isBlankCell(value)) return 'empty';
  if (value instanceof Date) return 'date';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'decimal';

  const text = String(value).trim();
  const lower = text.toLowerCase();

  if (BOOLEANS.has(lower) && !/^[01]$/.test(lower)) return 'boolean';
  if (EMAIL.test(text)) return 'email';
  if (URL_LIKE.test(text)) return 'url';
  if (ISO_DATE.test(text) || LOOSE_DATE.test(text)) {
    return Number.isNaN(Date.parse(text)) ? 'text' : 'date';
  }

  const numeric = text.replace(/[\s,]/g, '');
  if (/^-?\d+$/.test(numeric)) return 'integer';
  if (/^-?\d*\.\d+$/.test(numeric)) return 'decimal';

  return 'text';
}

function buildHistogram(sorted: readonly number[], buckets = 12): number[] {
  if (sorted.length < 2) return [];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  if (min === max) return [sorted.length];

  const counts = new Array<number>(buckets).fill(0);
  const width = (max - min) / buckets;
  for (const value of sorted) {
    const bucket = Math.min(buckets - 1, Math.floor((value - min) / width));
    counts[bucket]++;
  }
  return counts;
}

/* ------------------------------------------------------------------
   CSV parsing (delimited text that is not a workbook)
   ------------------------------------------------------------------ */

export interface CsvParseResult {
  readonly headers: string[];
  readonly rows: CellValue[][];
  readonly delimiter: string;
  readonly errors: readonly string[];
}

export async function parseCsv(
  text: string,
  options: { delimiter?: string; header?: boolean; coerceTypes?: boolean } = {},
): Promise<CsvParseResult> {
  const Papa = (await import('papaparse')).default;

  const parsed = Papa.parse<string[]>(text, {
    delimiter: options.delimiter ?? '',
    header: false,
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
  });

  const matrix = parsed.data.filter((row) => Array.isArray(row));
  const useHeader = options.header ?? true;
  const headers = useHeader && matrix.length ? normaliseHeaders(matrix[0]) : [];
  const bodyRows = useHeader ? matrix.slice(1) : matrix;

  const columnCount = Math.max(headers.length, ...bodyRows.map((row) => row.length), 0);
  const finalHeaders = useHeader
    ? headers.length >= columnCount
      ? headers
      : [
          ...headers,
          ...Array.from({ length: columnCount - headers.length }, (_, i) =>
            columnLetter(headers.length + i),
          ),
        ]
    : Array.from({ length: columnCount }, (_, i) => columnLetter(i));

  const rows: CellValue[][] = bodyRows.map((row) => {
    const out: CellValue[] = [];
    for (let index = 0; index < columnCount; index++) {
      const cell = row[index] ?? '';
      out.push(options.coerceTypes ? coerce(cell) : cell === '' ? null : cell);
    }
    return out;
  });

  return {
    headers: finalHeaders,
    rows,
    delimiter: parsed.meta.delimiter || ',',
    errors: parsed.errors.slice(0, 10).map((error) => `Row ${error.row ?? '?'}: ${error.message}`),
  };
}

function coerce(text: string): CellValue {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const lower = trimmed.toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  const numeric = trimmed.replace(/,/g, '');
  if (/^-?\d+(\.\d+)?$/.test(numeric)) {
    const parsed = Number(numeric);
    if (Number.isFinite(parsed)) return parsed;
  }
  return text;
}

export async function toCsvText(
  headers: readonly string[],
  rows: readonly CellValue[][],
  delimiter = ',',
): Promise<string> {
  const Papa = (await import('papaparse')).default;
  return Papa.unparse(
    { fields: [...headers], data: rows.map((row) => row.map((cell) => cell ?? '')) },
    { delimiter },
  );
}
