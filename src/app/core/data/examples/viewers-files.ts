import type { ToolExample } from '../tool-examples';

export const VIEWER_FILE_EXAMPLES: Record<string, ToolExample> = {
  'universal-viewer': {
    title: 'Open a file without knowing which viewer it needs',
    sample: { href: '/samples/meeting-brief.docx', label: 'Download the sample DOCX' },
    steps: ['Download the fictional meeting brief and choose it in the universal viewer.', 'Check that it opens in the Word viewer with its heading and table.', 'Try a PDF or CSV of your own and note how the controls change with the format.'],
    check: 'The viewer is chosen from the file extension, so a file with the wrong extension opens in the wrong viewer or not at all. Use File Signature Checker if you are unsure what a file really is.',
  },
  'pdf-viewer': {
    title: 'Find a name in a bookmarked PDF',
    sample: { href: '/samples/bookmarked-brief.pdf', label: 'Download the bookmarked PDF' },
    steps: ['Open the fictional two-page brief and select the Document outline button to see the Overview entry.', 'Select Search and type Jordan. The match is listed under p2.', 'Try Rotate and the zoom controls, then use Page thumbnails to return to page 1.'],
    check: 'The second page is a different size from the first, and both should keep their proportions. Outline entries are listed but are not clickable links. Search needs at least two characters and only finds text in the text layer, so a scanned page without one returns no matches.',
  },
  'xlsx-viewer': {
    title: 'Check order IDs in a workbook',
    sample: { href: '/samples/date-export.xlsx', label: 'Download the sample workbook' },
    steps: ['Open the workbook. It has one sheet, Orders, with three columns.', 'Type 00123 in Find in sheet and check that the row count drops to 1 of 2 rows.', 'Clear the search, compare the Excel date column with the ISO date text column, then select CSV.'],
    check: 'The Order ID column should keep its leading zeros. The CSV button exports the whole active sheet, not only the rows matching your search. Cell colours and other styling are not shown, and the viewer cannot edit cells.',
  },
  'csv-viewer': {
    title: 'Open a CSV without losing leading zeros',
    steps: ['Save these three lines as staff.csv: id,name,joined then 007,Ana,2026-01-05 then 012,Ben,2026-02-11.', 'Open the file and check that the id column shows 007 and 012.', 'Click the name header to sort, then type Ben in Find in sheet.'],
    check: 'The first line becomes the column headers and the delimiter is detected automatically. Numbers without a leading zero are read as numbers. The viewer is read-only; the CSV button saves the whole file again with commas, not only the matching rows.',
  },
  'pptx-viewer': {
    title: 'Step through a short presentation',
    sample: { href: '/samples/presentation-example.pptx', label: 'Download the sample presentation' },
    steps: ['Open the fictional two-slide presentation.', 'Move between slides with the arrow keys or the slide thumbnails.', 'Leave Notes switched on and read the Speaker notes panel under each slide.'],
    check: 'The second slide should read Action: Jordan confirms the room. This sample has no speaker notes, so the panel says so. Slides are redrawn in the browser as an approximation, and charts and SmartArt appear only as placeholders.',
  },
  'markdown-viewer': {
    title: 'Preview a short Markdown note',
    steps: ['Save a file called notes.md with a # Launch heading, a ## Tasks heading and two - bullet lines.', 'Open it and check the Rendered tab and the Contents list, which should show 2 headings.', 'Switch to Source, then select HTML to save the converted markup.'],
    check: 'Headings, lists and GitHub-style tables should render. Inline style attributes, style blocks and form elements are removed from the preview. The HTML download contains the converted content only, without a page stylesheet.',
  },
  'json-viewer': {
    title: 'Explore and minify a small JSON object',
    steps: ['Save {"order": "00123", "items": [{"sku": "A1", "qty": 2}], "paid": false} as order.json.', 'Open it in the Tree tab, use Collapse and Expand, then check the Formatted tab.', 'Select Minify, copy the result, then delete one comma from the file and open it again to see the error.'],
    check: 'An invalid file shows the line and column of the problem and opens in the Source tab. Save writes what the Source tab shows, so after Minify it saves the one-line version; from the Tree or Formatted tab it saves the indented version. A JSON Lines file with several records is not a single JSON value and shows a parse error.',
  },
  'xml-viewer': {
    title: 'Inspect elements and attributes',
    steps: ['Save <order id="00123"><item sku="A1">2</item><note>Fictional</note></order> as order.xml.', 'Open it and find the @id and @sku attribute rows in the Tree tab.', 'Type note in Search to filter the tree, then compare the Formatted and Source tabs.'],
    check: 'Malformed XML shows the parser message and opens in the Source tab. The tree lists elements, attributes and the text of elements without child elements. Comments and text placed between child elements appear only in Source.',
  },
  'text-viewer': {
    title: 'Search a log file for errors',
    steps: ['Open a .log or .txt file of your own, or save a few fictional lines that include the word ERROR.', 'Type ERROR in Search and check the count of matching lines.', 'Toggle Wrap long lines to read the longest entries, then use the copy button or Save.'],
    check: 'Matching lines are highlighted with their line numbers. Only the first 20,000 lines are displayed; Save gives you the whole file. Text is read as UTF-8, so files in other encodings may show incorrect accented characters.',
  },
  'html-viewer': {
    title: 'Look inside an HTML attachment safely',
    steps: ['Save <h1>Notice</h1><p>Fictional text.</p><img src="https://example.com/logo.png" alt="logo"> as notice.html.', 'Open it and check the Preview tab shows the heading and paragraph.', 'Compare the Formatted and Source tabs to read the full markup.'],
    check: 'The preview does not load the remote image and does not run scripts. Style blocks, style attributes and forms are also removed, so the page will not look the same as in a browser tab. Use Source to see exactly what the file contains.',
  },
  'file-metadata': {
    title: 'Read the properties of a PDF',
    sample: { href: '/samples/bookmarked-brief.pdf', label: 'Download a sample PDF' },
    steps: ['Open the fictional PDF in the metadata viewer.', 'Check that Detected format is PDF document and that Pages shows 2.', 'Find the Has text layer row, then select Copy all to keep the list.'],
    check: 'The File group comes from the browser; the PDF properties group is read from the file itself. For images only dimensions, megapixels and aspect ratio are shown, not camera or location data. The tool reads properties but does not remove them.',
  },
  'file-hash-generator': {
    title: 'Verify a download with SHA-256',
    sample: { href: '/samples/bookmarked-brief.pdf', label: 'Download a sample file' },
    steps: ['Drop the sample PDF. A SHA-256 hash is computed straight away.', 'Tick CRC32 and select Compute hashes to add a second value.', 'Copy the SHA-256 value and paste it into Paste an expected checksum to see Match.'],
    check: 'Change one character of the pasted value and the result should become No match. SHA-256, SHA-384, SHA-512 and CRC32 are available; MD5 and SHA-1 are not. SHA-384 and SHA-512 need the whole file in memory.',
  },
  'file-signature-checker': {
    title: 'Catch a file with the wrong extension',
    sample: { href: '/samples/bookmarked-brief.pdf', label: 'Download the sample PDF' },
    steps: ['Download the PDF, make a copy and rename the copy to brief.docx.', 'Drop both files into the checker.', 'Compare Detected with Extension says, and read the first bytes, which start with %PDF-.'],
    check: 'The renamed copy should be flagged as not matching its extension. Only the first 4 KB are read. Text formats are reported only as Plain text, and a matching signature does not show that a file is safe.',
  },
  'duplicate-file-detector': {
    title: 'Find a renamed copy',
    sample: { href: '/samples/bookmarked-brief.pdf', label: 'Download the sample PDF' },
    steps: ['Download the PDF and make a copy with a different name.', 'Add both copies and one other small file of your own.', 'Check Duplicate groups, then select Copy report.'],
    check: 'The two PDFs should form one group of 2 copies; the other file is ruled out by size. Only byte-for-byte identical files match, so a re-saved or resized copy is not caught. Empty files are skipped, and nothing is deleted for you.',
  },
  'batch-rename': {
    title: 'Tidy a set of file names',
    steps: ['Drop three small files of your own with spaces in their names.', 'Choose kebab-case under Case, tick Add sequential numbering and set Digits to 2.', 'Check the Current name and New name columns, then select Download renamed files (ZIP).'],
    check: 'Numbers follow the order the files were added and are joined to the name with a space, for example 01 meeting-notes.txt. Your original files are not renamed; you get renamed copies in a ZIP. Change extension alters the name only, not the file format.',
  },
};
