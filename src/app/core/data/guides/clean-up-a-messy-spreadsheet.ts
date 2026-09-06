import type { GuideDefinition } from '../../models/guide.model';

export const guide: GuideDefinition = {
  slug: 'how-to-clean-up-a-messy-spreadsheet',
  title: 'How to clean up a messy spreadsheet',
  summary:
    'The order to do it in, why trailing spaces defeat duplicate detection, how a single text cell poisons a numeric column, and how to clean a spreadsheet without uploading the data in it.',
  answer:
    'Work in this order: trim whitespace, fix data types, remove blank rows and columns, then remove duplicates last. Duplicate detection compares values exactly, so “Acme Ltd” and “Acme Ltd ” are different rows until the whitespace is trimmed — cleaning in the wrong order leaves duplicates behind and looks like it worked.',
  keywords: [
    'clean up messy spreadsheet',
    'remove duplicate rows excel',
    'remove blank rows',
    'excel data cleaning steps',
    'spreadsheet trailing spaces',
  ],
  tools: [
    'spreadsheet-cleaner',
    'remove-duplicate-rows',
    'remove-blank-rows',
    'data-type-detection',
    'column-statistics',
  ],
  published: '2026-09-06',
  body: [
    {
      type: 'p',
      text: 'A spreadsheet that has passed through several people acquires a particular kind of mess: stray blank rows, a heading repeated halfway down, numbers stored as text, dates in three formats, and duplicates that are not quite identical. None of it is hard to fix. Fixing it in the wrong order is what wastes the afternoon.',
    },

    { type: 'h2', text: 'Do it in this order' },
    {
      type: 'p',
      text: 'The steps interact, and one ordering is clearly correct.',
    },
    {
      type: 'ol',
      items: [
        'Trim whitespace from every cell.',
        'Normalise data types — numbers as numbers, dates as dates.',
        'Remove blank rows and columns.',
        'Remove duplicates.',
        'Check the result against the original row count.',
      ],
    },
    {
      type: 'p',
      text: 'Duplicates come last because duplicate detection compares values, and values that have not been cleaned do not match. Whitespace comes first because everything downstream depends on it.',
    },

    { type: 'h2', text: 'Whitespace, and why it defeats everything' },
    {
      type: 'p',
      text: 'A trailing space is invisible. It survives copying, it survives export, and it is the single most common reason a cleaning pass appears to work while achieving nothing.',
    },
    {
      type: 'p',
      text: 'To a computer, “Acme Ltd” and “Acme Ltd ” are two different strings. Deduplication keeps both. A lookup against one fails to find the other. A grouped total splits across two categories that read identically on screen. You can stare directly at the problem and not see it.',
    },
    {
      type: 'note',
      title: 'Non-breaking spaces are worse',
      text: 'Data pasted from a web page or a PDF frequently contains non-breaking spaces rather than ordinary ones. They look identical, occupy the same width, and are a different character entirely — so a find-and-replace for a normal space will not touch them. A proper trim handles both; a manual one usually does not.',
    },
    {
      type: 'tool',
      toolId: 'spreadsheet-cleaner',
      text: 'Trim whitespace, drop empty rows and columns, and remove duplicates in one pass, in the right order.',
    },

    { type: 'h2', text: 'Data types: one text cell spoils a column' },
    {
      type: 'p',
      text: 'A column is either numeric or it is not, and a single cell breaks the distinction. One entry reading “12 units”, or “N/A”, or a number with a stray apostrophe in front of it, and the whole column becomes text.',
    },
    {
      type: 'p',
      text: 'The consequences are quiet. Sums skip the text cells rather than failing. Sorting puts 100 before 20, because as text it does. Charts drop the values they cannot read. Nothing reports an error, and the numbers are simply wrong.',
    },
    {
      type: 'p',
      text: 'Running [data type detection](/excel/data-type-detection) across the sheet tells you which columns are mixed, which is much faster than scrolling to find the one cell responsible. [Column statistics](/excel/column-statistics) then confirms the fix — if the count of numeric values matches the row count, the column is clean.',
    },
    {
      type: 'note',
      tone: 'warn',
      title: 'Dates deserve their own check',
      text: 'A date column is the most likely to be silently wrong, because a date is stored as a number wearing a format. Ambiguous values such as 03/04/2026 can be read two ways, and the misreading is invisible for any day above the twelfth while being wrong for the rest. See [why Excel dates break when you export to CSV](/guides/why-excel-dates-break-when-you-export-to-csv).',
    },

    { type: 'h2', text: 'Blank rows and columns' },
    {
      type: 'p',
      text: 'Empty rows break more than they look like they should. Many operations treat a blank row as the end of the data, so a sort or a filter silently applies to the top section only and leaves the rest untouched and unsorted.',
    },
    {
      type: 'p',
      text: 'Empty columns cause the same trouble sideways, and both tend to arrive from exports that padded the sheet out to a fixed size.',
    },
    {
      type: 'p',
      text: 'Two cases need care before [removing them](/excel/remove-blank-rows). A row that is blank apart from a stray space is not blank — trim first, which is why trimming leads. And a row deliberately left empty as a visual separator between sections carries meaning that will be lost; a spreadsheet laid out for reading rather than for processing may need restructuring instead of cleaning.',
    },

    { type: 'h2', text: 'Duplicates are a judgement, not a fact' },
    {
      type: 'p',
      text: 'The word “duplicate” hides a decision: duplicate according to which columns?',
    },
    {
      type: 'p',
      text: 'Two orders from the same customer on the same day for the same amount are duplicates if the file was imported twice, and two genuine orders if it was not. Nothing in the data can tell you which. Whole-row matching is the safe default because it only removes rows that are identical in every respect, but it will keep near-duplicates that differ by one typo.',
    },
    {
      type: 'p',
      text: 'Matching on a key column — an ID, an email address — catches more, and will delete rows that differ elsewhere in ways you may have wanted to keep. Decide which you mean before [removing anything](/excel/remove-duplicate-rows), and keep the original file either way.',
    },

    { type: 'h2', text: 'Check the result' },
    {
      type: 'p',
      text: 'Cleaning is destructive, and the failure mode is deleting rows you needed rather than leaving rows you did not. Two checks catch nearly everything.',
    },
    {
      type: 'ul',
      items: [
        'Compare row counts before and after. If 4,000 rows became 1,200, the duplicate rule was broader than you intended and it is worth understanding why before continuing.',
        'Total a numeric column before and after. Removing duplicates should reduce it by roughly the proportion of rows removed; a total that barely moves means the removed rows were not the ones you thought.',
      ],
    },

    { type: 'h2', text: 'Why to clean it on your own machine' },
    {
      type: 'p',
      text: 'Spreadsheets needing a clean-up are usually the ones full of real records — customers, employees, transactions, contact details. It is the least anonymous file most people handle, and cleaning it is the moment it gets uploaded to whichever free tool came up first.',
    },
    {
      type: 'p',
      text: 'None of this work requires a server. Trimming, type checking, and comparing rows are operations a browser performs immediately on a file it never sends anywhere, which keeps a list of real people out of a third party’s logs for no loss in capability.',
    },
  ],
};
