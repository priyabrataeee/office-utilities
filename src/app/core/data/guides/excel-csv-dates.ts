import type { GuideDefinition } from '../../models/guide.model';

export const guide: GuideDefinition = {
  slug: 'why-excel-dates-break-when-you-export-to-csv',
  title: 'Why your Excel dates break when you export to CSV',
  summary:
    'Dates turn into numbers, days and months swap places, and leading zeros vanish. Here is what a spreadsheet actually stores in a date cell, and how to export so the other side reads it correctly.',
  answer:
    'A spreadsheet does not store a date — it stores a number counting days from a fixed origin, and displays it using a format. CSV has no formats, so what gets written is whatever the display happened to be, and whatever reads it next guesses. Exporting in ISO format (2026-03-09) removes the guessing.',
  keywords: [
    'excel csv dates wrong',
    'excel date format changed csv',
    'csv dates swapped day month',
    'excel export date problem',
    'iso date csv export',
  ],
  tools: ['excel-to-csv', 'data-type-detection', 'spreadsheet-cleaner'],
  published: '2026-09-03',
  body: [
    {
      type: 'p',
      text: 'You export a sheet to CSV and the dates arrive wrong. Sometimes they are five-digit numbers. Sometimes the ninth of March has become the third of September. Sometimes they look right until someone in another country opens the file.',
    },
    {
      type: 'p',
      text: 'All three have the same root cause, and it is not a bug in the export.',
    },

    { type: 'h2', text: 'What a date cell actually contains' },
    {
      type: 'p',
      text: 'A spreadsheet stores a date as a number: the count of days since an origin date. In Excel, 1 January 1900 is day 1, so 9 March 2026 is stored as roughly 46,090. The cell also carries a display format — "dd/mm/yyyy", say — and that format is the only reason you see a date rather than a number.',
    },
    {
      type: 'p',
      text: 'The number is the data. The format is a costume. CSV is a plain text file with no room for costumes, so exporting has to choose: write the number, or write what the costume currently looks like.',
    },

    { type: 'h2', text: 'The three failure modes' },
    { type: 'h3', text: 'Dates became five-digit numbers' },
    {
      type: 'p',
      text: 'The export wrote the underlying value rather than the formatted one. 46090 is not corruption — it is the date, unformatted. It is recoverable, but only if you know the origin.',
    },
    { type: 'h3', text: 'Day and month swapped' },
    {
      type: 'p',
      text: 'The export wrote "03/09/2026" and whatever opened it read that as month-first rather than day-first. Both readings are valid; the file gives no way to tell them apart. This is the most damaging failure because it is silent — every date from the 1st to the 12th converts to a plausible wrong date, and only the 13th onward throws an error that reveals the problem.',
    },
    {
      type: 'note',
      tone: 'warn',
      title: 'Why this one is dangerous',
      text: 'A column of ambiguous dates does not fail loudly. It fails for roughly 40% of rows and looks fine for the rest, so it is often discovered weeks later in a report nobody can reconcile.',
    },
    { type: 'h3', text: 'Leading zeros disappeared' },
    {
      type: 'p',
      text: 'Not strictly a date problem, but it arrives with the same export. Postcodes, phone numbers and reference codes beginning with zero are read as numbers, and 00123 becomes 123. Once written that way, the zeros are gone.',
    },

    { type: 'h2', text: 'The fix: export ISO dates' },
    {
      type: 'p',
      text: 'The ISO 8601 format — 2026-03-09, year first — is unambiguous. There is no locale in which it means something else, it sorts correctly as plain text, and every database, language and spreadsheet reads it the same way.',
    },
    {
      type: 'p',
      text: 'Choose the date format at export time rather than hoping the cell formatting survives. That single decision removes the whole class of problem.',
    },
    {
      type: 'tool',
      toolId: 'excel-to-csv',
      text: 'Pick the sheet, delimiter and how dates and numbers are written before exporting.',
    },

    { type: 'h2', text: 'The delimiter problem that arrives alongside' },
    {
      type: 'p',
      text: 'In much of Europe the comma is the decimal separator, so spreadsheets there use a semicolon to separate CSV fields. A comma-delimited file opened in that locale lands entirely in one column, and a semicolon-delimited file opened elsewhere does the same.',
    },
    {
      type: 'p',
      text: 'If you know where the file is going, match the delimiter to the destination. If you do not, comma with quoted fields is the safer default — and worth saying explicitly when you send it.',
    },

    { type: 'h2', text: 'Checking an export before you send it' },
    {
      type: 'ol',
      items: [
        'Open the CSV in a plain text editor, not a spreadsheet. A spreadsheet re-guesses the formats and hides exactly what you are trying to inspect.',
        'Look at a date. Is it 2026-03-09, or something a reader has to interpret?',
        'Find a date after the 12th of a month. If it reads correctly and one before the 12th does too, the interpretation is consistent.',
        'Check any column of codes for missing leading zeros.',
      ],
    },
    {
      type: 'p',
      text: 'Opening in a text editor is the important step. Most date problems are invisible in a spreadsheet, because the spreadsheet re-applies a format over whatever it guessed.',
    },

    { type: 'h2', text: 'Fixing a file you already received' },
    {
      type: 'p',
      text: 'If dates arrived as numbers, they are recoverable — you need the origin the exporter used, which is almost always 1 January 1900 for Excel or 30 December 1899 for some other tools.',
    },
    {
      type: 'p',
      text: 'If day and month were swapped, they may not be recoverable at all. Where both values are 12 or lower the original is genuinely ambiguous, and only an outside reference — a row you know the true date of — can settle it. This is why getting the export right matters more than fixing it afterwards.',
    },
    {
      type: 'p',
      text: 'To see what a file actually contains before trusting it, [data type detection](/excel/data-type-detection) infers each column’s type and lists the rows that do not match, which surfaces a handful of malformed dates in a large file quickly.',
    },
    {
      type: 'tool',
      toolId: 'data-type-detection',
      text: 'Infers each column’s real type and lists the rows that break the pattern.',
    },

    { type: 'h2', text: 'A rule worth adopting' },
    {
      type: 'p',
      text: 'Use ISO dates in every file that leaves your machine. It looks less friendly than 09/03/2026 and it is the only format that cannot be misread. Formatting for humans belongs in the report; data interchange should be unambiguous.',
    },
  ],
};
