import type { DocBlock } from '../../core/engines/doc-model';

/**
 * Schema for the document generators.
 *
 * Each generator is data: a set of form sections plus a pure function from the
 * collected values to document blocks. One component renders the form, the
 * live preview and the PDF/DOCX export for all ten of them.
 */

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'checkbox'
  | 'color'
  | 'list'
  | 'repeat';

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

export interface FieldDef {
  readonly key: string;
  readonly label: string;
  readonly type: FieldType;
  readonly placeholder?: string;
  readonly help?: string;
  readonly options?: readonly SelectOption[];
  /** Grid span, 1–3 columns. Defaults to 1. */
  readonly span?: 1 | 2 | 3;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly rows?: number;
  /** For `repeat`: the shape of one row. */
  readonly columns?: readonly FieldDef[];
  /** For `repeat` and `list`: singular noun used on the add button. */
  readonly itemLabel?: string;
  readonly required?: boolean;
}

export interface SectionDef {
  readonly title: string;
  readonly icon: string;
  readonly description?: string;
  readonly fields: readonly FieldDef[];
  /** Hidden unless the named boolean field is true. */
  readonly showWhen?: string;
}

export type FormValue = string | number | boolean | FormValue[] | { [key: string]: FormValue };
export type FormData = Record<string, FormValue>;

export interface GeneratorDef {
  /** Catalog tool id. */
  readonly toolId: string;
  readonly sections: readonly SectionDef[];
  /** Starting values, also used by "load sample". */
  readonly initial: () => FormData;
  /** File name stem for the export. */
  readonly fileName: (data: FormData) => string;
  /** Pure transform from form values to document blocks. */
  readonly render: (data: FormData) => DocBlock[];
  /** Page defaults for this document type. */
  readonly page?: {
    readonly size?: 'A4' | 'Letter' | 'Legal';
    readonly orientation?: 'portrait' | 'landscape';
    readonly margin?: number;
    readonly font?: 'sans' | 'serif';
  };
}

/* ------------------------------------------------------------------
   Value helpers used by every template
   ------------------------------------------------------------------ */

export function str(data: FormData, key: string, fallback = ''): string {
  const value = data[key];
  return value === undefined || value === null ? fallback : String(value);
}

export function num(data: FormData, key: string, fallback = 0): number {
  const value = Number(data[key]);
  return Number.isFinite(value) ? value : fallback;
}

export function bool(data: FormData, key: string): boolean {
  return data[key] === true || data[key] === 'true';
}

export function rows(data: FormData, key: string): FormData[] {
  const value = data[key];
  return Array.isArray(value) ? (value as FormData[]) : [];
}

export function list(data: FormData, key: string): string[] {
  const value = data[key];
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

/** Formats a number as currency without assuming a locale's symbol placement. */
export function money(amount: number, currency: string): string {
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency}${formatted}`;
}

export function formatDate(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Today in the `yyyy-mm-dd` shape a date input expects. */
export function today(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

const ONES = [
  '',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** Spells an amount out, as payslips and cheques require. */
export function amountInWords(amount: number): string {
  const whole = Math.floor(Math.abs(amount));
  const cents = Math.round((Math.abs(amount) - whole) * 100);

  const words = whole === 0 ? 'zero' : spell(whole);
  const capitalised = words.charAt(0).toUpperCase() + words.slice(1);
  return cents > 0 ? `${capitalised} and ${cents}/100` : `${capitalised} only`;
}

function spell(value: number): string {
  if (value < 20) return ONES[value];
  if (value < 100) {
    return TENS[Math.floor(value / 10)] + (value % 10 ? `-${ONES[value % 10]}` : '');
  }
  if (value < 1000) {
    return `${ONES[Math.floor(value / 100)]} hundred${value % 100 ? ` and ${spell(value % 100)}` : ''}`;
  }
  for (const [limit, name] of [
    [1e9, 'billion'],
    [1e6, 'million'],
    [1e3, 'thousand'],
  ] as const) {
    if (value >= limit) {
      return `${spell(Math.floor(value / limit))} ${name}${
        value % limit ? ` ${spell(value % limit)}` : ''
      }`;
    }
  }
  return String(value);
}
