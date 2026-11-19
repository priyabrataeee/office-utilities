/**
 * Search-result descriptions for tools whose catalogue description, once cut
 * at a sentence boundary, came out under 120 characters. Each is 150–160
 * characters and restates only facts already in the tool's catalogue entry.
 */
export const TOOL_META_DESCRIPTIONS: Readonly<Record<string, string>> = {
  'text-viewer':
    'Open text, log and config files in your browser. Wrap long lines, search with a count of matching lines and copy text; the first 20,000 lines are displayed.',
  'merge-pdf':
    'Combine PDFs in the order you choose, in your browser, without uploading them. Page sizes and quality are kept; bookmarks and interactive forms are not copied.',
  'delete-pdf-pages':
    'Remove pages from a PDF by clicking thumbnails or typing a range such as 2, 5-9, 12. The remaining pages are copied unchanged into a new PDF in your browser.',
  'images-to-pdf':
    'Turn photos or scans into one PDF in your browser. Put the images in order, choose page size, orientation and margins, then download a file ready to email.',
  'pdf-to-images':
    'Convert PDF pages to images at screen scale up to print-quality 300 DPI. Pick the pages and image format, then download them one by one or together as a ZIP.',
  'remove-watermark-pdf':
    'Remove watermarks added to a PDF as annotations or as a repeated form object. Watermarks burned into scanned images cannot be removed; they can only be covered.',
  'unlock-pdf':
    'Remove the password from a PDF you are allowed to open. Enter the correct password and download an unencrypted copy; this tool decrypts, it does not crack.',
  'pdf-to-csv':
    'Extract tables from a PDF as CSV in your browser. Choose the delimiter and take one page or all of them, then open the file in any spreadsheet or database tool.',
  'docx-to-markdown':
    'Convert Word .docx files to GitHub-flavoured Markdown, keeping headings, emphasis, links, lists, tables and code blocks. Useful for moving documents to a wiki.',
  'docx-to-txt':
    'Extract the plain text of a Word document with its paragraphs kept and all formatting removed. Use the result for comparing versions, indexing or other tools.',
  'word-count':
    'Count words, characters, sentences, paragraphs and pages in a Word file or pasted text, with estimated reading and speaking time and a keyword density table.',
  'compare-docx':
    'Compare two Word, text or Markdown files and see added, removed and edited paragraphs side by side or inline, with changed words highlighted in each paragraph.',
  'excel-to-csv':
    'Convert Excel .xlsx or .xls sheets to CSV. Choose the sheet, delimiter and header row, or export every sheet at once as a ZIP. Values are written as displayed.',
  'excel-to-json':
    'Convert an Excel worksheet to JSON as objects keyed by the header row or as arrays. Choose compact or pretty-printed output; blank cells are written as null.',
  'pptx-to-pdf':
    'Convert PowerPoint .pptx files to PDF with slides at their original size and aspect ratio. Optionally add speaker notes or print several slides on each page.',
  'markdown-to-pdf':
    'Convert Markdown to a typeset PDF with headings, lists, tables, quotes and code blocks. Choose page size, margins and typeface; linked images are not included.',
  'image-converter':
    'Convert images between PNG, JPEG, WebP and AVIF in your browser. Set quality, a maximum size and a background fill for transparency; convert several at once.',
  'png-to-webp':
    'Convert PNG images to WebP to reduce file size, often by a quarter or more. Set the quality with one slider and compare the size before and after for each file.',
  'invoice-generator':
    'Create an invoice with your business details, client, line items, tax and discount, then export it as PDF or DOCX. Totals update as you type; drafts stay local.',
  'text-to-diagram':
    'Write Mermaid or an indented outline and watch the diagram redraw as you type. Export SVG or PNG, or save an outline as JSON to keep editing in Diagram Studio.',
  'org-chart':
    'Build an organisation chart in your browser: edit labels, position people and connect reporting lines, then export SVG or PNG. CSV import is not available.',
  'duplicate-file-detector':
    'Find duplicate files in a folder by content, whatever their names. Files are hashed in your browser and grouped, showing how much space you could save.',
};
