import type { ToolCategoryId } from '../models/tool.model';

/**
 * Editorial copy for the category landing pages.
 *
 * A grid of tool cards tells a visitor what exists; it does not help somebody
 * who knows their problem but not which tool solves it. That is what `choosing`
 * is for — the question people actually arrive with, answered with a link.
 *
 * Kept out of the catalog because it is prose about a family of tools rather
 * than metadata about any one of them, and because the catalog is already long
 * enough to be awkward to review.
 */

export interface CategoryChoice {
  /** The problem, in the visitor's words rather than the product's. */
  readonly need: string;
  /** Catalog id of the tool that solves it. */
  readonly toolId: string;
}

export interface CategoryContent {
  /** What this family of tools is for, and why it works without a server. */
  readonly intro: readonly string[];
  /** Problem-to-tool routing, in rough order of how often it comes up. */
  readonly choosing: readonly CategoryChoice[];
  /** What is worth knowing about these formats before you start. */
  readonly notes: readonly string[];
}

export const CATEGORY_CONTENT: Partial<Record<ToolCategoryId, CategoryContent>> = {
  viewer: {
    intro: [
      'The everyday problem is not opening one format — it is being sent something and not having whatever produced it. A spreadsheet arrives and there is no Excel on the machine; a deck arrives on a phone; a colleague sends a .json and the browser offers to download it rather than show it.',
      'Every viewer here reads the file in the page you are on. Nothing is installed, no account is created, and the file is not uploaded to be rendered — which is what makes these safe to point at a document you would not email to a stranger.',
    ],
    choosing: [
      { need: 'I do not know what this file even is', toolId: 'universal-viewer' },
      { need: 'A spreadsheet, and it is very large', toolId: 'xlsx-viewer' },
      { need: 'A .docx, on a machine with no Word', toolId: 'docx-viewer' },
      { need: 'A CSV, without a spreadsheet reformatting it', toolId: 'csv-viewer' },
      { need: 'A log file too big for a text editor', toolId: 'text-viewer' },
      { need: 'An HTML attachment I do not trust', toolId: 'html-viewer' },
    ],
    notes: [
      'These are readers rather than editors, and the distinction is deliberate: a reader can open a very large file quickly and cannot damage it. Where a format has behaviour as well as content — a spreadsheet macro, a script in an HTML page — it is not executed here, which is the point rather than a shortcoming.',
    ],
  },

  pdf: {
    intro: [
      'PDF is the format documents end up in when they are finished, which is why so much of the work done to them is small, awkward and urgent: a page the wrong way up, a file three megabytes over an upload limit, a statement where only two pages should be sent.',
      'Everything here runs on your own machine through pdf-lib and PDF.js. Pages are copied rather than re-encoded wherever possible, so merging, splitting, extracting and rotating are lossless — text stays selectable and images keep their original quality.',
    ],
    choosing: [
      { need: 'Several files that should be one document', toolId: 'merge-pdf' },
      { need: 'One document that should be several', toolId: 'split-pdf' },
      { need: 'Too large to email or upload', toolId: 'compress-pdf' },
      { need: 'I need to edit the text', toolId: 'pdf-to-word' },
      { need: 'Only some pages should be sent', toolId: 'extract-pdf-pages' },
      { need: 'Scanned sideways', toolId: 'rotate-pdf' },
      { need: 'It contains something confidential', toolId: 'protect-pdf' },
      { need: 'Photographs that have to become a PDF', toolId: 'images-to-pdf' },
    ],
    notes: [
      'Two limits are worth knowing before you start. There is no OCR, so a scanned page is a picture of text and yields nothing to extract or convert. And PDF-to-Word is structural inference rather than true conversion — a PDF records where glyphs sit, not where paragraphs begin, so complex layouts will need work afterwards.',
    ],
  },

  word: {
    intro: [
      'A .docx is a ZIP archive of XML parts, which is why so much can be done with one without Microsoft Word: the text, the images, the comments, the document properties and the revision history are all files inside a container that any program can open.',
      'These tools read that container directly, or reconstruct the document through Mammoth where the visible content is what matters. Nothing is uploaded, which matters more here than in most categories — Word documents are where contracts, applications and internal drafts live.',
    ],
    choosing: [
      { need: 'Send it somewhere that wants a PDF', toolId: 'docx-to-pdf' },
      { need: 'Find out what changed between two versions', toolId: 'compare-docx' },
      { need: 'Check it against a word limit', toolId: 'word-count' },
      { need: 'Publish it to a website', toolId: 'docx-to-html' },
      { need: 'Move it into a repository or wiki', toolId: 'docx-to-markdown' },
      { need: 'Recover the pictures from inside it', toolId: 'docx-extract-images' },
      { need: 'See what it discloses about me', toolId: 'docx-metadata' },
      { need: 'Write one without Word installed', toolId: 'docx-creator' },
    ],
    notes: [
      'Word documents carry more than they display. Author names, the total time a file has been edited, tracked comments and text hidden in headers or text boxes all travel with the file and are readable by anyone who receives it. Checking the metadata before sending a document outside your organisation takes a few seconds and is the step most often skipped.',
    ],
  },

  excel: {
    intro: [
      'Spreadsheet work divides into two jobs that look similar and are not: converting a workbook into something another system will accept, and repairing data that arrived in a state nothing will accept.',
      'Both run here through SheetJS and PapaParse, on the file in your browser. That matters for this category in particular, because the spreadsheets that need cleaning are almost always the ones full of real records — customers, employees, transactions.',
    ],
    choosing: [
      { need: 'A system I am importing into wants CSV', toolId: 'excel-to-csv' },
      { need: 'A CSV that a spreadsheet keeps mangling', toolId: 'csv-to-excel' },
      { need: 'Feed it to an application or a script', toolId: 'excel-to-json' },
      { need: 'It is messy and I do not know where to start', toolId: 'spreadsheet-cleaner' },
      { need: 'The same rows appear more than once', toolId: 'remove-duplicate-rows' },
      { need: 'A column will not add up', toolId: 'data-type-detection' },
      { need: 'Understand a dataset before using it', toolId: 'column-statistics' },
      { need: 'Audit a workbook somebody else built', toolId: 'formula-viewer' },
    ],
    notes: [
      'Dates are where spreadsheet data goes wrong most often, and it fails quietly. A spreadsheet stores a date as a number with a display format attached; CSV can carry only the rendered text, and a value like 03/04/2026 reads two ways. The misreading is invisible for any day above the twelfth and wrong for the rest, which is why it survives a casual check.',
    ],
  },

  powerpoint: {
    intro: [
      'A .pptx is a ZIP of OpenXML parts describing each slide as a tree of shapes — positions, sizes, text runs, tables and pictures. No browser renders that natively, so these tools parse the shape tree directly and rebuild the deck.',
      'That approach is why the text stays selectable rather than becoming a picture of a slide, and why the media can be pulled out at its original resolution instead of being screenshotted.',
    ],
    choosing: [
      { need: 'Send it so nobody edits it', toolId: 'pptx-to-pdf' },
      { need: 'Put a slide into a document or a page', toolId: 'pptx-to-images' },
      { need: 'Cut a long deck down for a shorter slot', toolId: 'slide-selector' },
      { need: 'Turn the deck into written notes', toolId: 'pptx-extract-text' },
      { need: 'Recover a chart or photograph from it', toolId: 'pptx-extract-images' },
      { need: 'Build a deck without PowerPoint', toolId: 'pptx-creator' },
    ],
    notes: [
      'Charts, SmartArt, 3-D effects, transitions and animations are not reproduced by any of these tools. Those are behaviours of PowerPoint’s own renderer rather than content stored in the file, and a converter claiming to reproduce them is generally rasterising a screenshot. Ordinary slides of text, shapes, tables and images convert faithfully.',
    ],
  },

  convert: {
    intro: [
      'Conversion is the tax on working with other people: you write in one format and somebody needs another. The awkward part is that most converters are servers, so the price of the conversion is a copy of the document.',
      'These run in the browser. Word, Markdown, HTML and spreadsheets are all parsed into one intermediate document model, and the PDF, Word and HTML writers all consume that model — which is why the same structure survives whichever direction you convert in.',
    ],
    choosing: [
      { need: 'Markdown that has to become a real document', toolId: 'markdown-to-docx' },
      { need: 'Markdown that has to become a PDF', toolId: 'markdown-to-pdf' },
      { need: 'Web content I want in Markdown', toolId: 'html-to-markdown' },
      { need: 'An HTML report that should be a PDF', toolId: 'html-to-pdf' },
      { need: 'A spreadsheet to send as a fixed document', toolId: 'excel-to-pdf' },
      { need: 'Data moving between CSV and JSON', toolId: 'csv-to-json' },
      { need: 'An image in the wrong format', toolId: 'image-converter' },
      { need: 'A log or text file to attach as a PDF', toolId: 'txt-to-pdf' },
    ],
    notes: [
      'Every conversion loses something, and it is better to know what. Converting to Markdown discards formatting with no Markdown equivalent rather than approximating it. Converting to a lossy image format discards detail permanently, so always convert from the best original rather than from a copy that has already been through the process. Keep the source file; treat the conversion as an export.',
    ],
  },

  generate: {
    intro: [
      'These produce the documents small businesses and individuals need on a deadline and rarely have software for — an invoice, an offer letter, a payslip, a covering letter. Fill in the fields, download the PDF.',
      'None of them asks for an account, and that is the substantive difference rather than a convenience. Documents of this kind are unusually rich: an invoice names a client and a price, a payslip names a person and their salary, a CV is a complete personal record. A generator that keeps them is collecting exactly that.',
    ],
    choosing: [
      { need: 'Bill a client for completed work', toolId: 'invoice-generator' },
      { need: 'Price a job before it is agreed', toolId: 'quotation-generator' },
      { need: 'Apply for a role', toolId: 'resume-builder' },
      { need: 'Write the letter that goes with the CV', toolId: 'cover-letter-generator' },
      { need: 'Make a formal offer to a candidate', toolId: 'offer-letter-generator' },
      { need: 'Issue a payslip', toolId: 'salary-slip-generator' },
      { need: 'Record what a meeting decided', toolId: 'meeting-minutes-generator' },
      { need: 'Pitch a piece of work formally', toolId: 'business-proposal-generator' },
    ],
    notes: [
      'Because nothing is stored between visits, the record-keeping is yours. Save each PDF into a folder you control and name it so it sorts correctly, and keep invoice and quotation numbers in the same place you keep the documents — most tax authorities expect several years of records, and a sequence with gaps in it is a question you will eventually be asked.',
    ],
  },

  diagram: {
    intro: [
      'Diagramming moved to the cloud almost completely, which means the average architecture diagram, network map and org chart now lives on somebody else’s infrastructure. Those are three of the documents an organisation would least like to hand over: a map of its systems, its attack surface, and its staff.',
      'This is a diagram editor that runs in the browser and saves nothing to a server. Shapes and connectors are held as a document model and drawn as vectors, so a diagram stays sharp at any zoom and exports at any size.',
    ],
    choosing: [
      { need: 'A process with branches and exceptions', toolId: 'flowchart-maker' },
      { need: 'A database schema', toolId: 'er-diagram' },
      { need: 'Infrastructure, for a design review', toolId: 'aws-architecture-diagram' },
      { need: 'A network topology', toolId: 'network-diagram' },
      { need: 'Who reports to whom', toolId: 'org-chart' },
      { need: 'A process with several departments in it', toolId: 'process-diagram' },
      { need: 'Thinking, before any structure exists', toolId: 'mind-map' },
      { need: 'I would rather write it than draw it', toolId: 'text-to-diagram' },
    ],
    notes: [
      'A diagram defined as text can be reviewed in a pull request and regenerated when the system changes; one drawn by hand gives you control over exactly how it looks. Both are here for that reason. If a diagram documents something that changes, keeping its source next to the thing it describes is what stops it going quietly out of date.',
    ],
  },

  file: {
    intro: [
      'These answer questions about a file rather than changing it: what is it really, what is inside it, is it identical to that other one, and why is it so large.',
      'All of it works from the bytes themselves, read in your browser. That is the only way to get a truthful answer — a file extension is chosen by whoever sent the file, and it is wrong often enough to matter.',
    ],
    choosing: [
      { need: 'Is this file what it claims to be?', toolId: 'file-signature-checker' },
      { need: 'Why will this not fit an upload limit?', toolId: 'file-size-analyzer' },
      { need: 'Are these two files the same?', toolId: 'file-hash-generator' },
      { need: 'Which of these are duplicates?', toolId: 'duplicate-file-detector' },
      { need: 'What does this file say about me?', toolId: 'file-metadata' },
      { need: 'Rename a folder full of files properly', toolId: 'batch-rename' },
    ],
    notes: [
      'Hashing is the tool worth understanding here, because it answers a question nothing else answers exactly. Two files with the same digest are byte-for-byte identical whatever they are named; different digests mean genuinely different content. It also verifies a download against a published checksum, which is worth doing for installers regardless of whether you are hunting duplicates.',
    ],
  },
};
