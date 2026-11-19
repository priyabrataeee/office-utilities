import type { ToolExample } from '../tool-examples';

export const EXCEL_DIAGRAM_EXAMPLES: Record<string, ToolExample> = {
  'xlsx-creator': {
    title: 'Make a small order list that keeps its leading zeros',
    steps: ['Select Clear, rename Column A to Order ID, then use Add column and rename the new column to Amount.', 'Enter 00123 and 1250 in the first row, use Add row, then enter 00124 and 80.', 'Leave Detect numbers and dates on export ticked and select .xlsx. Amount should open as numbers and Order ID should keep its leading zeros.'],
    check: 'The draft is kept in this browser until you select Discard draft. Only text in the form 2026-03-09 is detected as a date, and the workbook has a single sheet named Sheet1.',
  },
  'csv-to-excel': {
    title: 'Convert a semicolon CSV without losing order numbers',
    steps: ['Paste three lines: Order ID;Customer;Amount, then 00123;Jordan Reyes;1250, then 00124;Casey Lim;80.', 'Check that the detected delimiter is ; and the preview shows 2 rows × 3 columns.', 'Keep Convert numbers and booleans to real types ticked, select Download .xlsx and check that 00123 is still text.'],
    check: 'Only numbers and true/false are converted. Dates stay as text, and numbers with a leading zero or more than 15 digits are kept as text on purpose.',
  },
  'excel-to-json': {
    title: 'Turn an order sheet into JSON records',
    sample: { href: '/samples/date-export.xlsx', label: 'Download the sample workbook' },
    steps: ['Open the workbook. The Orders sheet has 2 rows × 3 columns.', 'Keep Array of objects and Pretty-print with indentation, then read the JSON preview.', 'Check that order 00123 keeps its leading zeros and compare its Excel date with the ISO date text 2026-03-09, then select Download JSON.'],
    check: 'Workbook cells are read as the text they display, so numbers and dates arrive as JSON strings. The header row becomes the keys, and only the selected sheet is exported unless you tick the Export all option for a multi-sheet workbook.',
  },
  'json-to-excel': {
    title: 'Flatten nested order records into columns',
    steps: ['Paste {"orders":[{"id":"00123","customer":{"name":"Jordan Reyes"},"tags":["new","priority"]},{"id":"00124","customer":{"name":"Casey Lim"},"tags":[]}]}.', 'Check that the preview shows 2 rows × 3 columns: id, customer.name and tags.', 'Confirm that the first tags cell reads new, priority, then select Download .xlsx.'],
    check: 'When the top level is an object, only its longest array is used. Arrays of objects and objects nested more than four levels deep are written as JSON text rather than extra columns.',
  },
  'spreadsheet-cleaner': {
    title: 'Tidy names and amounts without breaking IDs',
    steps: ['Save a CSV with three lines: Order ID,Customer,Amount, then 00123,  Jordan   Reyes ,1 250, then 00124,Casey Lim,80.', 'Open it with the default rules. Customer becomes Jordan Reyes and 1 250 becomes the number 1250.', 'Notice that 00123 also becomes 123. Untick Convert numeric text to real numbers to keep the IDs, then select Download .xlsx.'],
    check: 'Check the Result preview before downloading. Number conversion applies to every column, so codes with leading zeros lose them unless you turn it off. Only the selected sheet is cleaned.',
  },
  'remove-duplicate-rows': {
    title: 'Find a repeated contact written in a different case',
    steps: ['Save a CSV with four lines: Name,Email, then Jordan Reyes,jordan@example.com, then Casey Lim,casey@example.com, then jordan reyes,JORDAN@example.com.', 'Open it with no columns selected. With Ignore letter case ticked, Duplicates shows 1 and Rows after shows 2.', 'Untick Ignore letter case and check that no duplicates remain, then tick it again and select Download .xlsx.'],
    check: 'Rows match only when the chosen columns are identical after the case and whitespace options. There is no fuzzy matching, so J. Reyes and Jordan Reyes are treated as different people.',
  },
  'remove-blank-rows': {
    title: 'Close a gap in a short list',
    steps: ['In your spreadsheet app, put a header row, two data rows and one empty row between them, then save it as XLSX.', 'Open it here. Blank rows is always ticked; leave Blank columns ticked as well.', 'Check that Rows before shows 3 and Rows after shows 2, then select Download .xlsx.'],
    check: 'Cells that contain only spaces count as empty. Empty lines in a CSV are already skipped when the file is read, so they never appear in the count.',
  },
  'formula-viewer': {
    title: 'List the formulas in a small workbook',
    sample: { href: '/samples/date-export.xlsx', label: 'Download a values-only workbook' },
    steps: ['Open the sample workbook. It holds values only, so the viewer reports No formulas in this workbook.', 'In your spreadsheet app, enter 10 in A1, 20 in A2, =SUM(A1:A2) in A3 and =IF(A3>25,"Over","Under") in B3, then save it as XLSX.', 'Open that file. Formulas and Distinct functions should both show 2; select IF under Functions used to filter the list.'],
    check: 'Cached result is the value last saved in the file. The viewer does not recalculate formulas, so a file saved without results shows that column empty.',
  },
  'column-statistics': {
    title: 'Profile a short price list',
    steps: ['Save a CSV with five lines: Item,Price, then Pens,2.50, then Paper,4.00, then Stapler,12, then Tape, with no price.', 'Open it and expand Price. It should be typed decimal and 75% filled, with Sum 18.5, Mean 6.17 and Median 4.', 'Select Copy summary to paste the per-column figures into a document.'],
    check: 'Sum, mean, median and standard deviation use only values detected as numbers. The first row is treated as the header, and one sheet is profiled at a time.',
  },
  'data-type-detection': {
    title: 'See why an ID column is labelled as numbers',
    sample: { href: '/samples/date-export.xlsx', label: 'Download the sample workbook' },
    steps: ['Open the workbook. The Orders sheet is profiled straight away.', 'Check Order ID. It is labelled integer, although 00123 is stored as text with leading zeros.', 'Check that ISO date text is labelled date, then expand each column to compare its values.'],
    check: 'The label describes what values look like, not how the cells are stored. Mismatched values are listed only when at least 90% of a column\'s filled values share one type; otherwise the column is labelled text and nothing is flagged.',
  },
  'excel-to-word': {
    title: 'Put an order sheet into a Word report',
    sample: { href: '/samples/date-export.xlsx', label: 'Download the sample workbook' },
    steps: ['Open the workbook. The Orders sheet is listed as 2 × 3 and already ticked.', 'Keep First row is a header and Put each sheet\'s name above its table ticked, then select Create the Word document.', 'Open the .docx and check the Orders heading, the bold header row and the row for order 00123.'],
    check: 'Cell colours and fonts are not carried over, and formulas arrive as their last saved values. Hidden sheets are listed but not ticked, and sheets wider than eight columns trigger a warning on portrait pages.',
  },
  'text-to-diagram': {
    title: 'Write a two-branch approval flow',
    steps: ['Choose Mermaid / PlantUML-style and replace the text with four lines: flowchart TD, A[Request received] --> B{Approved?}, B -- yes --> C[Book the room] and B -- no --> D[Tell the requester].', 'Check that the preview shows one decision with yes and no branches, then select SVG or PNG.', 'Switch to Indented outline, replace the text with Workshop followed by Room and Samples each indented by two spaces, and select JSON.'],
    check: 'If an error appears under the source, the preview may still show the last valid diagram. Mermaid text is drawn by the Mermaid library, and the JSON button is offered only for the indented outline.',
  },
};
