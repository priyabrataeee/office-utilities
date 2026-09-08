/**
 * Extended per-tool copy for the pages that carry the most search traffic.
 *
 * Every tool in the catalog has a `description` and a set of FAQs, which is
 * enough for a long-tail page. The tools below compete for terms people search
 * in volume, so they get three more sections: body copy that goes past the
 * one-line summary, a technically specific account of what runs in the browser,
 * and concrete situations the tool is for.
 *
 * This lives apart from the catalog deliberately. It is optional, it is only
 * populated where there is something real to say, and keeping it separate means
 * a page never ends up carrying a section of padding written to fill a template.
 *
 * The `howItWorks` copy names the actual libraries and states the actual limits.
 * That is the point of it: a vague reassurance is worth nothing on a site whose
 * whole claim is that you can check what it does.
 */

export interface ToolContent {
  /** Body paragraphs. Expands on `description` rather than restating it. */
  readonly about: readonly string[];
  /** What executes on the visitor's device — named libraries, real limits. */
  readonly howItWorks: readonly string[];
  /** Concrete situations, not a rephrasing of the description. */
  readonly useCases: readonly string[];
}

export const TOOL_CONTENT: Record<string, ToolContent> = {
  /* ---------------------------------------------------------------- PDF */

  'merge-pdf': {
    about: [
      'Combining PDFs is the most common thing anyone needs to do to a PDF, and the usual route is to hand a stack of documents to a website that keeps them for an hour. That is a poor trade for something a browser can do on its own.',
      'Order the files, reorder them if you got it wrong, and produce a single document. Nothing is queued behind other people’s jobs, because there is no queue and no server.',
    ],
    howItWorks: [
      'Merging runs on pdf-lib. Each source document is parsed in this tab, and its pages are copied into a new document rather than re-rendered — the page objects, their fonts and their images move across unchanged.',
      'That copy-rather-than-rebuild approach is what preserves quality. Text stays selectable and searchable because it is still text, vector graphics stay vector, and images keep their original encoding at their original resolution. A merged file is normally close to the sum of its inputs in size, which is the honest result of nothing having been thrown away.',
      'Pages of different sizes stay at their own sizes. A merged document can legitimately contain A4 and Letter pages together; nothing is scaled to match, because scaling would change every measurement on the page.',
    ],
    useCases: [
      'Assembling a single PDF from a signed contract, its annexes and a scanned identity page — the case where uploading is exactly what you want to avoid.',
      'Putting a set of scanned receipts into one file before submitting an expense claim.',
      'Combining chapters written separately into one document for review.',
      'Merging a cover letter with a CV so an application arrives as one attachment rather than three.',
    ],
  },

  'split-pdf': {
    about: [
      'Splitting is the other half of merging, and it comes up whenever a document contains more than the person you are sending it to should receive.',
      'Take a page range, extract several ranges at once, or break a document into individual pages. Each result is a real PDF rather than a view of the original.',
    ],
    howItWorks: [
      'Splitting uses the same pdf-lib page-copying path as merging, in reverse: a new document is created for each grouping you ask for, and the pages you selected are copied into it.',
      'Because pages are copied rather than re-encoded, an extracted page is byte-for-byte as good as it was in the original. There is no generation loss from splitting a file and there would be none from splitting the result again.',
      'One thing worth knowing: content that lives at document level rather than page level does not follow a page into its new file. Bookmarks pointing at pages you did not take have nothing to point at, and a form field that was part of a larger form is no longer part of it. The visible page is unchanged; the structure around it is necessarily different.',
    ],
    useCases: [
      'Pulling the three pages of a bank statement an application actually asked for, instead of sending twelve months.',
      'Separating a scanned batch where several unrelated documents went through the feeder together.',
      'Extracting one chapter from a manual to send to somebody who needs only that.',
      'Removing an internal cover sheet or pricing annex before a document goes to a client.',
    ],
  },

  'compress-pdf': {
    about: [
      'Most oversized PDFs are oversized for one reason: photographs stored at far higher resolution than anything will ever display or print them at. Compression is mostly a matter of finding those and re-encoding them sensibly.',
      'You choose how hard to push, and the result reports what it actually saved rather than promising a percentage in advance.',
    ],
    howItWorks: [
      'Each page is examined before anything is changed. Pages that are predominantly vector text are copied through untouched, because rasterising a page of text would make the file both larger and visibly worse — the common failure of tools that treat every page the same way.',
      'Pages carrying significant image content are rendered with PDF.js and re-encoded through the browser’s own canvas codecs at the quality you selected. That is a lossy step and it is the only lossy step: everything else in the document is copied as-is.',
      'Compression is therefore bounded by what is in your file. A scanned document is mostly photographs and compresses heavily. A text report with two logos has almost nothing to remove, and a tool claiming it can shrink one by 80 per cent is either rasterising your text or not telling you what it did.',
    ],
    useCases: [
      'Getting a scanned document under an email attachment limit without printing and rescanning it.',
      'Reducing a photo-heavy report before uploading it to a portal that caps file size.',
      'Shrinking a deck exported to PDF where every slide carries a full-resolution background image.',
      'Preparing a document for a government or banking form with a strict size cap, where the file contains personal identity documents.',
    ],
  },

  'pdf-to-word': {
    about: [
      'Converting a PDF to Word is not really a conversion. A PDF records where glyphs were placed on a page; a Word document records paragraphs, headings and lists. The structure a converter produces was inferred, not recovered, because it was discarded when the PDF was made.',
      'Knowing that is what lets you use the result well: expect editable text in a sensible order, and expect to reapply some formatting.',
    ],
    howItWorks: [
      'PDF.js reports every text run on the page along with its position, size and font name. Those runs are grouped into lines by vertical position and into paragraphs by the spacing between lines, then written out as a .docx through the docx library.',
      'Structure is inferred from the only evidence the file still contains. Font size relative to the document’s most common size suggests a heading; a bold or italic weight in the font name suggests emphasis; text repeating at the same position on every page is treated as a running header rather than a paragraph.',
      'The inference is deliberately conservative. Producing a plain paragraph where the original had a heading is a small loss you can fix in seconds; inventing headings throughout a document because one page used a larger font produces something nobody can edit. Multi-column layouts, tables and text baked into images are where any converter struggles, and this one does not pretend otherwise — there is no OCR, so a scanned page contains no text to extract at all.',
    ],
    useCases: [
      'Recovering the text of a report whose original document has been lost.',
      'Getting a quotable draft out of a PDF without retyping several thousand words.',
      'Editing a form or template you received as a PDF and were expected to fill in by hand.',
      'Reusing your own published work — a paper or a proposal — where the PDF is the only copy you still have.',
    ],
  },

  'pdf-to-text': {
    about: [
      'When you want the words and nothing else, extracting plain text is faster and far more reliable than converting to a document format that has to guess at layout.',
      'The output is the text of the document in reading order, ready to paste anywhere.',
    ],
    howItWorks: [
      'PDF.js walks each page and returns its text items with coordinates. Items are sorted into lines by vertical position and joined by horizontal order, which reconstructs reading order for ordinary single-column pages.',
      'Word spacing is inferred from the gaps between runs, because a PDF does not necessarily store spaces as characters — a line can be twenty separately positioned fragments with no space anywhere in the file. This is why naive extraction produces text with words jammed together.',
      'Two limits are worth stating plainly. Multi-column layouts extract across the page rather than down each column, because nothing in the file says which fragments belong to which column. And a scanned PDF contains images of text, not text: there is no OCR here, so those pages yield nothing at all rather than something wrong.',
    ],
    useCases: [
      'Pulling quotations out of a long report without retyping them.',
      'Feeding a document into a script, a spreadsheet or a search index.',
      'Checking what text a machine can actually read from your CV before sending it to an employer.',
      'Reading a PDF whose fonts render badly on your device, where the words matter and the layout does not.',
    ],
  },

  'pdf-to-images': {
    about: [
      'Turning pages into images is the reliable way to put a page somewhere that cannot display a PDF — a slide, a chat message, a web page, a document that will be printed by somebody else’s software.',
      'Each page becomes its own image at a resolution you choose.',
    ],
    howItWorks: [
      'Pages are rendered by PDF.js onto a canvas at the scale you pick, then encoded as PNG or JPEG by the browser’s own image codecs. The rendering is the same one the viewer on this site uses, so what you get is what you saw.',
      'Resolution is the decision that matters. Rendering at higher scale produces a sharper image and a proportionally larger file — doubling the scale roughly quadruples the pixel count. For screen use the default is enough; for print, render higher than looks necessary, because an image cannot be sharpened after the fact.',
      'PNG is lossless and right for pages of text and line art, where JPEG artefacts show clearly around letter edges. JPEG is right for pages that are mostly photographs. Whichever you choose, the result is a picture: the text in it is no longer selectable or searchable, which is sometimes precisely the point.',
    ],
    useCases: [
      'Putting a page from a report into a slide deck without an unreadable screenshot.',
      'Sending one page of a document through a chat application that will not preview a PDF.',
      'Producing a thumbnail or preview image of a document’s first page.',
      'Flattening a page so the recipient cannot select or copy its text as conveniently.',
    ],
  },

  'images-to-pdf': {
    about: [
      'Photographs of documents are what most people actually have, and almost every organisation asking for them wants a PDF. This does that conversion without the pictures leaving your phone or laptop.',
      'Order the images, choose a page size, and get one document.',
    ],
    howItWorks: [
      'Each image is decoded by the browser and embedded into a new PDF built with pdf-lib. JPEG images are embedded directly in their existing encoding, so there is no quality loss and no re-compression — the bytes of the photograph go into the PDF as they are.',
      'PNG images are embedded losslessly too, which is worth knowing because a PNG screenshot placed in a PDF stays exactly as sharp as the original.',
      'Page sizing preserves the aspect ratio of each image and fits it within the page you chose, so nothing is stretched. A portrait photograph and a landscape one produce differently filled pages rather than distorted ones.',
    ],
    useCases: [
      'Turning phone photographs of a passport, a licence or a utility bill into the single PDF an application form demands.',
      'Assembling scanned receipts into one document for an expense claim.',
      'Making a printable document out of a set of screenshots.',
      'Submitting handwritten notes or a signed page where the recipient will only accept a PDF.',
    ],
  },

  'rotate-pdf': {
    about: [
      'Scanned pages arrive sideways constantly, and the rotate button in a PDF reader usually only changes how the page looks on your screen. Close the file and the rotation is gone.',
      'This writes the rotation into the document, so it opens the right way up for everyone who receives it.',
    ],
    howItWorks: [
      'Every PDF page carries a rotation property — 0, 90, 180 or 270 degrees — which readers apply when displaying it. Rotating here sets that property with pdf-lib and saves the document, which is why the change persists rather than lasting until you close the viewer.',
      'Nothing about the page content is touched. The glyphs, images and vectors stay exactly where they were; only the instruction telling readers which way up to display them changes. That is why rotation is lossless and instantaneous even on a large document, and why it can be undone perfectly.',
      'Pages can be rotated individually, which matters for the common case: a scanned batch where the feeder took some sheets the wrong way round and most of the document is already correct.',
    ],
    useCases: [
      'Fixing a scan where the document was fed in sideways.',
      'Correcting pages photographed in landscape when the rest of the document is portrait.',
      'Turning a page the right way up before sending it to somebody who will print it.',
      'Making a sideways document readable on a phone, where you cannot rotate the view conveniently.',
    ],
  },

  'protect-pdf': {
    about: [
      'PDF encryption is genuinely useful and widely misunderstood. The format has two different passwords that do very different things, and only one of them actually protects a document.',
      'Set a password to open the file, restrict what can be done with it, or both — and see plainly which of those is real security.',
    ],
    howItWorks: [
      'Encryption is applied by pdf-lib in this tab. The document and the password are both read into memory here, the encrypted result is written here, and neither is transmitted anywhere. That matters more for this tool than most: encrypting on a server means uploading the unprotected document first, which is exactly the situation you were trying to avoid.',
      'A user password encrypts the contents. Without it there is nothing to read, because the text is not recoverable — this is real protection and it is the one to set when the document matters.',
      'An owner password leaves the document readable by anyone and sets permission flags for printing, copying, annotating and assembly. Compliant readers honour those flags; readers that choose not to can ignore them, and several do. Treat owner-password restrictions as a clear statement of intent rather than as security, because that is what the specification makes them.',
    ],
    useCases: [
      'Encrypting a document containing bank details or identity papers before emailing it.',
      'Protecting a contract sent to several parties, where the password travels by a different channel.',
      'Marking a report as not-for-printing where the audience is co-operative and the point is to signal intent.',
      'Securing personal records before storing them in a cloud drive you do not entirely trust.',
    ],
  },

  /* --------------------------------------------------------------- Word */

  'docx-to-pdf': {
    about: [
      'Sending a Word document means trusting the recipient’s software to render it the way you saw it. Sending a PDF means it renders identically everywhere, which is why almost every formal submission asks for one.',
      'Conversion happens here, so a document that is not ready to be public does not become public in order to be converted.',
    ],
    howItWorks: [
      'Mammoth reads the .docx and reconstructs it as semantic HTML — headings as headings, lists as lists, tables as tables — and that structured result is laid out into pages and written as a PDF.',
      'Working from structure rather than from Word’s exact page geometry is a deliberate trade. It produces a clean, correctly ordered document with real selectable text and working links, and it does not attempt to reproduce Word’s own line-breaking decisions to the millimetre.',
      'So expect faithful content and sensible layout, and expect page breaks to fall where this engine puts them rather than exactly where Word put them. Complex floating layouts, text boxes and elaborate section formatting are the areas where the two diverge most; ordinary documents — letters, reports, CVs, contracts — convert closely.',
    ],
    useCases: [
      'Submitting a CV or application where the posting asks for a PDF.',
      'Sending a quotation or contract that must not be casually edited in transit.',
      'Producing a document that will look the same on a phone, a Mac and a printer.',
      'Converting a draft containing confidential information, where a server-side converter would mean uploading it first.',
    ],
  },

  'word-count': {
    about: [
      'Word counts decide things: whether an essay meets a brief, whether an abstract fits a limit, roughly how long a translation will cost. It is worth counting the same way the person checking will.',
      'Paste text or open a document, and see the breakdown rather than a single number.',
    ],
    howItWorks: [
      'Counting runs on the text in this page. Words are separated on whitespace after the text is normalised, which matches how word processors count and is why the number here should agree with the one Word shows you.',
      'Characters are reported both with and without spaces, because different limits mean different things — social platforms and database fields usually count everything, while academic limits often do not. Sentences are detected on terminal punctuation followed by a break, and paragraphs on blank lines.',
      'For a .docx, Mammoth extracts the document’s visible text first and the same counting applies. Headers, footers and footnotes sit outside the main text flow and are not included, which is also how most institutions define the count.',
    ],
    useCases: [
      'Checking an essay or dissertation chapter against a strict limit before submission.',
      'Trimming an abstract, a bio or a covering letter to a maximum length.',
      'Estimating translation or copywriting cost, which is normally quoted per word.',
      'Counting a confidential draft — an unpublished manuscript or an internal report — without pasting it into someone else’s website.',
    ],
  },

  'docx-viewer': {
    about: [
      'Opening a .docx should not require buying an office suite, creating an account, or uploading a document to a service that will keep a copy.',
      'Open the file and read it. Nothing is installed and nothing is sent.',
    ],
    howItWorks: [
      'A .docx is a ZIP archive of XML parts. JSZip opens the container in this tab and Mammoth reconstructs the document body as semantic HTML — headings, paragraphs, lists, tables and images — which is then styled for reading.',
      'Mammoth deliberately maps to meaning rather than to Word’s exact appearance. A heading becomes a real heading rather than a paragraph with a particular font size, which is why the result reads well on a phone as well as a laptop. Images embedded in the document are extracted from the archive and displayed inline.',
      'What it will not reproduce is the parts of Word that are presentation rather than content: precise page geometry, text boxes, complex floating layouts and tracked-change markup. This is a reader, not an editor, and it is honest about the difference.',
    ],
    useCases: [
      'Reading an attachment on a machine with no copy of Word installed.',
      'Opening a document on a phone or a borrowed computer.',
      'Checking what is inside a .docx from an unfamiliar sender without opening it in software that runs macros.',
      'Reading a confidential document where uploading it to a web viewer would defeat the purpose.',
    ],
  },

  'pdf-viewer': {
    about: [
      'Reading a PDF in the browser is normal. Reading one that was uploaded to somebody’s server first is not, and a surprising number of online viewers work that way.',
      'This one renders the file on your own machine, with search, page navigation and zoom.',
    ],
    howItWorks: [
      'Rendering uses PDF.js, the engine Firefox ships as its built-in PDF reader. Pages are drawn to a canvas at your zoom level, and a text layer is positioned over them so selection, copying and search work against real text rather than the picture.',
      'The supporting assets matter to the privacy claim and are worth being specific about: the PDF.js worker, its character maps, its standard fonts and its WebAssembly module are all served from this site’s own origin rather than a public CDN. A viewer that fetches those from elsewhere tells a third party which document you are reading even if the file itself never moves.',
      'Encrypted documents prompt for the password in the page, and the password is used here to decrypt in memory. Nothing about the file or the password is transmitted.',
    ],
    useCases: [
      'Reading a PDF on a device with no reader installed, or one whose reader you would rather not use.',
      'Searching a long document for a clause or a figure.',
      'Opening a bank statement, a medical letter or a contract where an uploading viewer is the wrong tool.',
      'Checking a PDF from an unfamiliar sender in a sandboxed browser tab rather than a desktop application.',
    ],
  },

  /* -------------------------------------------------------------- Excel */

  'excel-to-csv': {
    about: [
      'CSV is what almost every system will accept, and converting to it is the usual last step before an import. It is also where spreadsheet data quietly goes wrong.',
      'Choose the sheet, convert it, and see what the file will actually contain.',
    ],
    howItWorks: [
      'The workbook is parsed by SheetJS in this tab. Each sheet is read into a cell model and the selected one is written out as comma-separated values with proper quoting — fields containing commas, quotes or line breaks are quoted and escaped so the file parses correctly at the other end.',
      'The important thing to understand is what CSV cannot carry. It is a text format with no notion of a cell type, so formulas are replaced by their computed values, number formatting disappears, and colours, merged cells, multiple sheets and column widths do not exist in the output.',
      'Dates are the trap. A spreadsheet stores a date as a number with a display format attached, and CSV can carry only the rendered text. That text is then ambiguous — 03/04/2026 reads two ways — and a mistaken reading fails silently for any day above the twelfth while looking correct for the rest. Exporting in an unambiguous format is the fix.',
    ],
    useCases: [
      'Preparing a contact or product list for import into a CRM, a shop or a mailing platform.',
      'Handing data to a developer or a script that expects plain text.',
      'Producing a diff-able file so changes between two versions can be reviewed in Git.',
      'Converting a spreadsheet of real customer or employee records, where uploading it to a converter would mean disclosing all of them.',
    ],
  },

  'csv-to-excel': {
    about: [
      'CSV opened directly in a spreadsheet is where data gets damaged: leading zeros vanish, long numbers become scientific notation, and anything that resembles a date is converted into one.',
      'Converting deliberately produces a real .xlsx workbook instead of leaving the file to be reinterpreted every time it is opened.',
    ],
    howItWorks: [
      'The file is parsed with PapaParse, which handles quoted fields, embedded commas, escaped quotes and line breaks inside cells — the cases that break a naive split on commas. The delimiter is detected from the content, so semicolon-separated files common in European locales are read correctly.',
      'Parsed rows are written into a workbook by SheetJS and saved as .xlsx. Because the result is a real spreadsheet file with typed cells, the interpretation is fixed at conversion time rather than redone by whichever application opens the CSV next.',
      'That is the practical benefit: a product code like 00123 stays 00123, and a 16-digit reference number stays a full number instead of being rounded and displayed in scientific notation. Once a spreadsheet has silently made those changes, the original values are not recoverable from the file it saves.',
    ],
    useCases: [
      'Turning an export from a database, an analytics tool or a payment provider into a workbook people can actually work in.',
      'Protecting identifiers with leading zeros — postcodes, SKUs, account numbers — from being mangled on open.',
      'Preparing a file for colleagues who need filters, formatting and multiple sheets.',
      'Handling an export containing personal data, where a browser-based conversion keeps it off third-party servers.',
    ],
  },

  'excel-to-pdf': {
    about: [
      'Spreadsheets are for working in; PDFs are for sending. Converting fixes the layout so the recipient sees the figures as you arranged them rather than as their own column widths render them.',
      'The sheet becomes a paginated document with the table intact.',
    ],
    howItWorks: [
      'SheetJS reads the workbook and the selected sheet’s cells are laid out as a table, which is then paginated and written as a PDF. Cell values are rendered as they display in the sheet, so a formula appears as its result — which is what a reader of a report wants to see.',
      'Wide sheets are the real problem in any spreadsheet-to-PDF conversion, and it is worth being clear about it. A table wider than the page has to be either scaled down or split across pages; there is no third option, and a sheet with fifty columns will not be comfortable reading whichever is chosen.',
      'Charts, conditional formatting and images anchored to cells are not reproduced. The output is the data as a table, which is what most reporting and record-keeping actually needs — and stating it plainly is better than a conversion that silently drops half of what you saw.',
    ],
    useCases: [
      'Sending a financial summary or invoice detail to somebody who should not edit the figures.',
      'Attaching a report to an email where the recipient may not have a spreadsheet application.',
      'Filing a fixed record of numbers as they stood on a particular date.',
      'Printing a sheet with predictable pagination rather than fighting a spreadsheet’s own print settings.',
    ],
  },

  /* --------------------------------------------------------- PowerPoint */

  'pptx-to-pdf': {
    about: [
      'A deck sent as .pptx opens differently on every machine, and it invites editing. A PDF is what you send when the slides are finished.',
      'Each slide becomes a page, in order, at slide proportions.',
    ],
    howItWorks: [
      'There is no browser API that renders a PowerPoint file, so the .pptx — which is a ZIP of OOXML parts — is parsed here directly. The shape tree of each slide is read: positions, sizes, text runs, tables and pictures, converted from OOXML’s internal units into points.',
      'That model is drawn as a page in the output PDF at the deck’s own aspect ratio, so a 16:9 presentation produces 16:9 pages rather than slides letterboxed onto A4.',
      'The limits are specific and are reported rather than hidden. Charts, SmartArt, 3-D effects, transitions and animations are not reproduced — they are features of PowerPoint’s renderer rather than content in the file, and a converter claiming to reproduce them is generally rasterising a screenshot. Ordinary slides of text, images, shapes and tables convert faithfully.',
    ],
    useCases: [
      'Circulating a finished deck for review without inviting edits.',
      'Sending slides to somebody who has no copy of PowerPoint.',
      'Attaching a presentation to an application or a tender that requires PDF.',
      'Producing printable handouts from a deck.',
    ],
  },

  /* ----------------------------------------------------------- Converts */

  'image-converter': {
    about: [
      'Format conversion is simple work that most sites make you upload a photograph for. Browsers have contained a complete set of image codecs for years, because displaying images is what they do.',
      'Convert between PNG, JPEG and WebP, with control over quality and size.',
    ],
    howItWorks: [
      'Conversion goes through the browser’s own codecs. The image is decoded into an ImageBitmap, drawn to a canvas, and re-encoded in the format you chose — the same code path the browser uses to display any image on any page, which is why this works offline and why nothing is uploaded.',
      'Quality applies to the lossy formats, JPEG and WebP, and is a genuine trade rather than a slider to leave at maximum. Around 80 to 85 per cent is the usual sweet spot for photographs; above 95 the file grows quickly for almost no visible gain.',
      'Two limits follow from how the formats work. Converting to JPEG discards transparency, because JPEG has no alpha channel — a transparent background becomes solid. And converting a JPEG to PNG does not restore detail the JPEG already discarded; it stores the degraded image losslessly. Always convert from the best original you have, never from a copy that has already been through the process.',
    ],
    useCases: [
      'Converting screenshots to WebP to cut their size before putting them on a web page.',
      'Producing a JPEG for a form or portal that rejects PNG uploads.',
      'Getting a format an older application will accept.',
      'Converting photographs of people, documents or private places, where the picture and its embedded location data should not be handed to a website.',
    ],
  },

  /* --------------------------------------------------------- Generators */

  'invoice-generator': {
    about: [
      'An invoice is a simple document that generators routinely put behind a sign-up, because a set of invoices reveals who your clients are and what you charge them.',
      'Fill in the fields and download the PDF. There is no account, and the details stay in this tab.',
    ],
    howItWorks: [
      'The form is rendered into a PDF in the browser and saved straight to your device. Nothing is submitted: the client’s name, your bank details and the line items exist only in this page, and closing the tab is the end of them.',
      'That has one consequence worth planning around. Nothing is stored between visits, so the invoice number is not remembered for you. Numbers must be unique and should be sequential — a dated scheme such as 2026-014 stays readable years later and makes gaps obvious — and the sequence needs to live wherever you keep the invoices themselves.',
      'The output is a normal PDF with selectable text, which is what accounts payable systems expect to receive and what they can run their own text extraction against.',
    ],
    useCases: [
      'Invoicing as a freelancer or a small business without paying for accounting software.',
      'Issuing a one-off invoice outside whatever system you normally use.',
      'Producing an invoice on a shared or borrowed machine, where an account would leave a trail.',
      'Billing a client whose name and rates you would rather not register with a third party.',
    ],
  },

  'resume-builder': {
    about: [
      'A CV is a complete personal record — full name, address, phone number, employment history — and job seekers hand it to websites routinely while looking for work.',
      'This builds one in your browser and gives you the file. Nothing is stored, and no account is created.',
    ],
    howItWorks: [
      'The document is assembled and rendered in this tab, then downloaded. The layout is deliberately single-column, because that is what survives the text extraction an applicant tracking system runs before any person sees your application.',
      'That constraint is worth understanding rather than working around. An ATS reads the plain text of your file, not its appearance: two-column layouts interleave your skills with your employment history line by line, text inside boxes and graphics is frequently skipped entirely, and contact details in a page header are often dropped. A single column extracts in the order it was written.',
      'You can check the result rather than trust it. Export the PDF, then run it through the PDF to Text tool on this site and read what comes out — that is approximately what an employer’s software will store, and two minutes of reading it tells you more than any article about CV formatting.',
    ],
    useCases: [
      'Writing a CV from scratch without a subscription or a watermark on the output.',
      'Producing a version tailored to one posting, using that posting’s own vocabulary.',
      'Rebuilding a CV that only exists as an old PDF.',
      'Keeping your address, phone number and employment history off a résumé site’s servers while you are job hunting.',
    ],
  },

  /* ------------------------------------------------ PDF page operations */

  'organize-pdf': {
    about: [
      'Most page problems are easier to see than to describe. Reordering, rotating and deleting are all the same job — deciding what the finished document should contain — and doing them one tool at a time means saving and reopening the file between each step.',
      'Every page appears as a thumbnail. Drag, rotate and remove, then export once.',
    ],
    howItWorks: [
      'Thumbnails are rendered by PDF.js at a small scale, which is why a long document previews quickly: the pages are drawn at preview size rather than full resolution and discarded from memory as you scroll.',
      'Your edits are recorded as a plan — this page moves here, that one is rotated, this one goes — and nothing is written until you export. At that point pdf-lib builds the output by copying the pages you kept, in the order you put them, with the rotations you set.',
      'Because the export copies pages rather than re-rendering them, the result is lossless no matter how much rearranging you did. The thumbnails are a picture of the page; the exported document contains the original.',
    ],
    useCases: [
      'Cleaning up a scanned batch: dropping blank separator sheets, turning the pages that went in sideways, and putting two documents back in order.',
      'Assembling a submission where the pages exist but the order was never right.',
      'Removing internal pages from a report before it goes outside the organisation.',
      'Reviewing a long PDF page by page when you are not sure what is in it.',
    ],
  },

  'delete-pdf-pages': {
    about: [
      'Removing pages is the most common redaction there is — not blacking out words, but taking out whole pages that the recipient has no business seeing.',
      'Select by clicking thumbnails or by typing a range such as 2, 5-9, 12.',
    ],
    howItWorks: [
      'The pages you keep are copied into a new document with pdf-lib; the ones you removed are simply never copied. This is the important difference from a viewer that hides pages or a print-to-PDF that skips them — the removed pages are not present in the output file in any form.',
      'That distinction matters for anything sensitive. A page hidden by an annotation or covered by a black rectangle is still in the file and can be recovered in seconds. A page that was not copied cannot be recovered, because there is nothing to recover.',
      'Typed ranges and thumbnail selection edit the same list, so you can type 5-9 and then click one more page rather than working out the range arithmetic yourself.',
    ],
    useCases: [
      'Stripping a pricing annex or internal cover sheet before a document leaves the company.',
      'Removing blank pages a scanner inserted between double-sided sheets.',
      'Sending only the relevant pages of a long statement or contract.',
      'Deleting pages containing other people’s personal data before sharing a document you are entitled to share.',
    ],
  },

  'reorder-pdf-pages': {
    about: [
      'Pages arrive in the wrong order more often than they should — a scanner that fed the stack backwards, a merge done in the wrong sequence, an appendix that belongs at the end.',
      'Drag the thumbnails into the right order, or reverse the whole document in one click.',
    ],
    howItWorks: [
      'Reordering does not move anything inside the file while you work. You are rearranging a list of page indices, and only on export does pdf-lib copy the pages into a new document in the order that list now describes.',
      'That is why reordering is instant even on a document of several hundred pages, and why it is completely lossless: no page is re-encoded, re-rendered or altered in any way. Each one is copied exactly as it was, into a different position.',
      'Reversing is the same operation applied to the whole list at once, which is the fix for the single most common cause of a scrambled scan — a document-feeder stack loaded the wrong way up.',
    ],
    useCases: [
      'Fixing a scan that came out back to front.',
      'Moving an appendix or a signature page to where it belongs.',
      'Correcting a merge where the files were added in the wrong sequence.',
      'Putting a document into reading order before sending it to someone who will print it double-sided.',
    ],
  },

  'extract-pdf-pages': {
    about: [
      'Extracting is the positive form of deleting: instead of saying what to remove, you say what to keep. For a long document where you want three pages, that is far less work.',
      'Export the selection as one document, or as a separate file per page.',
    ],
    howItWorks: [
      'The selected pages are copied into a new document with pdf-lib and saved. Exporting one file per page runs the same operation once per selection, producing a numbered set.',
      'Copying preserves everything on the page — selectable text, vector graphics, embedded fonts, image resolution. An extracted page is not a screenshot or a re-print of the original; it is the original page in a new container.',
      'What does not follow a page out of its document is anything defined at document level. A bookmark pointing to a page you did not take, or a form field belonging to a form you split up, has nothing left to refer to. The page itself is unchanged.',
    ],
    useCases: [
      'Pulling the two pages an application actually asked for out of a twelve-page statement.',
      'Separating one invoice from a batch that was scanned as a single document.',
      'Taking a single chart or table out of a report to circulate on its own.',
      'Splitting a multi-document scan into one file per document.',
    ],
  },

  'watermark-pdf': {
    about: [
      'A watermark marks a draft as a draft and puts your name on work that will circulate. It is a deterrent and an attribution mark rather than a protection, and it is worth being clear about which of those you are getting.',
      'Text or image, with control over rotation, opacity, size, colour and position.',
    ],
    howItWorks: [
      'A PDF page is a list of drawing instructions, and the watermark is appended to that list with pdf-lib. It becomes part of the page in the same way the body text is part of the page, which is why it survives printing, screenshotting and conversion to images — nothing about it is an overlay applied by the reader.',
      'It is also why a watermark is not security. Instructions that were added can be found and removed, and the page underneath was never altered; it was drawn over. The words beneath a watermark remain fully selectable and extractable.',
      'Opacity is the whole design problem. Too faint and it vanishes in print; too strong and it interferes with reading, which is what sends people looking for a way to strip it. Somewhere around 15 to 25 per cent works for most documents, and it should be checked on the densest page rather than the title page.',
    ],
    useCases: [
      'Marking a document DRAFT so it does not get quoted as final.',
      'Putting a recipient’s name on each copy of a document sent to several people, so forwarding is traceable.',
      'Adding a company mark to a proposal that will be passed around.',
      'Labelling a specimen or sample so it cannot be mistaken for the real thing.',
    ],
  },

  'remove-watermark-pdf': {
    about: [
      'There are legitimate reasons to remove a watermark: a draft that has been approved, a template mark left on a document you own, a sample you have since paid for.',
      'How well it comes away depends entirely on how it was applied, and this is honest about which case you are in.',
    ],
    howItWorks: [
      'Two kinds of watermark are detectable. Some software adds one as an annotation or as a form XObject repeated on every page — its own object, tagged as such, which can be identified and deleted cleanly. The page then returns to exactly its original state, because the underlying content was never touched.',
      'The harder case is a watermark merged into the page content stream itself. Separating it from the content it overlaps means editing drawing instructions that no longer distinguish between the two, which is why automated removal of a merged watermark often leaves artefacts or takes part of the page with it.',
      'This tool detects and removes the first kind and tells you when it is looking at the second, rather than damaging the document to produce a result. Scanned pages where the watermark is part of the image cannot be separated at all — there is one picture, and the mark is in it.',
    ],
    useCases: [
      'Clearing a DRAFT mark from a document that has since been approved.',
      'Removing a template or trial watermark from a file you have a licence for.',
      'Cleaning up your own document where the mark was applied to the wrong version.',
      'Checking how a watermark was applied before assuming it offers any protection.',
    ],
  },

  'unlock-pdf': {
    about: [
      'If you have the password and want a copy that does not ask for it every time — for archiving, for a document you reopen daily, or before merging it with something else — decryption produces an unencrypted version.',
      'This requires the password. It is for documents you are entitled to open.',
    ],
    howItWorks: [
      'The password you supply is used by pdf-lib to decrypt the document in this tab, and an unencrypted copy is written out. Neither the file nor the password is transmitted, which is the whole reason to do this locally: pasting a working password into a web form sends both halves of the protection to a stranger.',
      'Permission restrictions come off in the same operation. Those flags — no printing, no copying — are advisory instructions to compliant readers rather than encryption, so removing them changes what readers are asked to do, not what the file protects.',
      'There is no password recovery here and there will not be. Breaking encryption without the password means guessing it, which is what password-cracking software does; a tool that offered it would be built for a different purpose than this one.',
    ],
    useCases: [
      'Archiving a document you will need in five years, when the password will be long forgotten.',
      'Removing encryption from a statement you receive monthly and open constantly.',
      'Decrypting a file before merging it into a larger document.',
      'Making a protected document searchable by tools on your own machine.',
    ],
  },

  /* --------------------------------------------------------- Word tools */

  'docx-creator': {
    about: [
      'Writing a document should not require installing an office suite or signing in to one. This is an editor that produces a real .docx — not an export that approximates one.',
      'Type or paste, apply structure, and download as Word or PDF.',
    ],
    howItWorks: [
      'What you type is held as a structured document model — headings, paragraphs, lists, tables and inline runs — rather than as styled HTML. That model is what the .docx writer consumes, which is why the output contains genuine Word structure instead of a wall of text with formatting painted on.',
      'The writer uses Word’s own built-in styles: Heading 1 to 6, Quote, List Paragraph. A document written here therefore picks up the theme of whatever template it is dropped into, appears correctly in the navigation pane, and generates a working table of contents — none of which is true of a file that hard-codes font sizes to look like headings.',
      'The same model feeds the PDF writer, so exporting to PDF is a second render of the same document rather than a conversion of the Word file, and the two outputs agree.',
    ],
    useCases: [
      'Writing a letter or report on a machine with no copy of Word.',
      'Producing a properly structured .docx for someone who will edit it in Word.',
      'Drafting a document that must not touch a cloud editor’s servers.',
      'Cleaning up pasted content into a document with real headings before handing it on.',
    ],
  },

  'docx-to-html': {
    about: [
      'Getting Word content onto the web usually means either pasting it — which brings a mess of inline styles and mso- attributes with it — or retyping it.',
      'This produces semantic HTML: real heading tags, real lists, real tables.',
    ],
    howItWorks: [
      'Mammoth maps Word’s styles to meaning rather than to appearance. A paragraph styled Heading 2 becomes an h2 element, not a div with a font size; a list becomes ul or ol; a table becomes a table with proper rows and cells.',
      'That mapping is deliberately lossy in one direction and precise in the other. Word’s presentational detail — exact fonts, colours, spacing, text boxes — is discarded, because on a web page those decisions belong to the stylesheet. What survives is the structure, which is the part that carries meaning and the part a CMS or a stylesheet can then do something with.',
      'Output can be a fragment for pasting into an existing page or a complete document. Embedded images are extracted from the .docx container and inlined as data URIs, so the fragment is self-contained rather than pointing at files that do not exist yet.',
    ],
    useCases: [
      'Publishing a document written in Word to a website or CMS without hand-cleaning the markup.',
      'Turning a Word-authored article into content an email template can use.',
      'Extracting clean structure from a document to reuse in another system.',
      'Getting rid of the inline styling that pasting from Word normally drags along.',
    ],
  },

  'docx-to-markdown': {
    about: [
      'Markdown is where documentation, notes and technical writing live, and a great deal of source material arrives as .docx from people who do not use it.',
      'Convert to GitHub-flavoured Markdown with the structure intact.',
    ],
    howItWorks: [
      'Mammoth reconstructs the document’s semantic structure first, and that structure is written out as Markdown — headings become hash prefixes, emphasis becomes asterisks, lists become dashes or numbers, tables become pipe tables.',
      'Converting to Markdown is a genuine simplification, and it is worth expecting that rather than being surprised by it. Markdown has one way to express a heading and Word has many; formatting with no Markdown equivalent — text boxes, coloured text, precise spacing, multi-level numbering schemes — is discarded rather than approximated with markup that only looks similar.',
      'What you get back is therefore cleaner than the input and smaller than it. For text destined for a repository, a wiki or a static site, that simplification is the point rather than a cost.',
    ],
    useCases: [
      'Moving documentation out of Word and into a repository where it can be reviewed in pull requests.',
      'Turning a Word-authored draft into a blog post for a static site generator.',
      'Getting a diff-able version of a document so changes between drafts can be read as text.',
      'Converting meeting notes or specifications into a wiki that expects Markdown.',
    ],
  },

  'docx-to-txt': {
    about: [
      'Sometimes the words are all you need, and every layer of formatting between you and them is in the way.',
      'Extract the text with paragraph structure preserved and everything else stripped.',
    ],
    howItWorks: [
      'The document’s visible text is extracted in reading order and written out as plain text, with paragraph breaks kept so the result is still readable rather than one continuous block.',
      'Everything presentational is discarded: fonts, sizes, colours, tables reduced to their cell contents, images gone entirely because a picture has no text to extract. That is the intent — plain text is a format with no way to express any of it.',
      'Content that sits outside the main body — headers, footers, footnotes, comments — is not part of the reading flow and is not included here. If you need those as well, the dedicated text extractor reaches into the container for them.',
    ],
    useCases: [
      'Feeding a document into a script, a search index or a command-line tool.',
      'Getting a clean copy to paste somewhere that would otherwise inherit Word’s formatting.',
      'Producing a plain-text archive copy that will still be readable in twenty years.',
      'Counting, diffing or grepping the contents of a document with ordinary text tools.',
    ],
  },

  'docx-extract-images': {
    about: [
      'The pictures in a Word document are complete files sitting inside it. Screenshotting them loses resolution for no reason — the originals are right there.',
      'List every image with its dimensions, format and size, and download what you want.',
    ],
    howItWorks: [
      'A .docx is a ZIP archive. JSZip opens it in this tab and reads the media folder directly, which is where Word stores every embedded picture as the file it originally was — a PNG stays a PNG at its original pixel dimensions, a JPEG keeps its original encoding.',
      'That means extraction is lossless and gives you better images than the document displays. Word often shows a picture scaled down to fit the page while storing the full-resolution original, so the extracted file is frequently larger and sharper than what you can see.',
      'Because the archive is read directly rather than through a document renderer, images that are not visible in the document — a picture behind a text box, or one left on a page that was deleted — are listed too.',
    ],
    useCases: [
      'Recovering photographs from a document when the originals have been lost.',
      'Pulling diagrams out of a report to reuse in a presentation.',
      'Getting a logo at full resolution from a letterhead template.',
      'Checking what images a document is carrying before sending it, including ones you cannot see.',
    ],
  },

  'docx-extract-text': {
    about: [
      'Word documents hide text in places the page does not show you: headers, footers, footnotes, comments and text boxes all sit outside the main flow.',
      'This reaches into the container and gets all of it.',
    ],
    howItWorks: [
      'Rather than going through a renderer, the .docx is opened as the ZIP of XML parts it actually is, and the parts are read directly — document.xml for the body, but also the header and footer parts, footnotes, endnotes, comments and the text inside drawing shapes.',
      'That is a genuinely different result from ordinary extraction, which reports the reading flow and legitimately omits everything else. A comment left by a reviewer, a name in a footer, or a note in a text box will not appear in a normal text extract and will appear here.',
      'It is worth knowing this cuts both ways. If you are checking a document before sending it, this shows you what a determined recipient can also read — including tracked comments people forget are still attached.',
    ],
    useCases: [
      'Auditing a document for content you did not realise was still in it before sending it out.',
      'Recovering reviewer comments from a draft when the discussion matters more than the text.',
      'Getting the text of headers and footers, where document control numbers and author names usually live.',
      'Extracting labels from diagrams built out of Word text boxes.',
    ],
  },

  'docx-metadata': {
    about: [
      'Every Word document carries properties nobody looks at: who wrote it, who last saved it, how long it was edited for, and which template it came from.',
      'This shows you exactly what a recipient can read.',
    ],
    howItWorks: [
      'OpenXML stores two property sets inside the .docx container. The core properties hold author, last modified by, title, subject, keywords and the created and modified timestamps. The application properties hold the producing software and version, total editing time, and page, word and character counts.',
      'Both are read straight out of the archive here, which is why the tool reports what is genuinely in the file rather than what Word chooses to display. Word’s own properties dialogue hides several of these fields.',
      'The revealing ones are rarely the obvious ones. Last modified by names the last person to touch the file, which on a document circulated for review is the whole distribution list. Total editing time is a real number of minutes. And a document created from a template often still carries the template author’s name in the author field years later.',
    ],
    useCases: [
      'Checking what a document discloses about you and your organisation before sending it outside.',
      'Establishing when a document was actually created or last altered.',
      'Finding out who produced a file you received from a third party.',
      'Auditing a set of documents for author names left over from an old template.',
    ],
  },

  'compare-docx': {
    about: [
      'Two files called contract-final.docx and contract-final-v2.docx, no tracked changes, and nobody willing to say what moved. Comparison answers it directly.',
      'Load both and see every insertion and deletion.',
    ],
    howItWorks: [
      'The text of both documents is extracted in reading order, broken into words, and the longest sequences the two versions share are found. Everything between those matches is what changed: present only in the original means deleted, present only in the revision means inserted.',
      'Working at word level rather than line or paragraph level is what makes the result readable. A paragraph where one number changed highlights the number, not the whole paragraph — otherwise a legal review becomes rereading the document with extra colour.',
      'Two limits are worth knowing before you rely on it. Moved text has no special representation: a clause relocated from section 3 to section 9 appears as a deletion in one place and an insertion in another, and noticing they are the same words is your job. And a comparison of text cannot see formatting, so a heading that quietly stopped being a heading reports as no change at all.',
    ],
    useCases: [
      'Finding out what the other side actually changed in a contract they returned.',
      'Checking a policy or terms document against the version you last approved.',
      'Reviewing an edited draft when the editor forgot to turn tracking on.',
      'Comparing two confidential drafts, where uploading either one is the thing you are trying to avoid.',
    ],
  },

  /* ------------------------------------------------------- Excel & data */

  'xlsx-creator': {
    about: [
      'Sometimes you need a spreadsheet file rather than a spreadsheet application — a workbook to send, to attach, or to feed into something that expects .xlsx.',
      'Build it in a grid and download a real Excel file.',
    ],
    howItWorks: [
      'The grid holds a plain cell model, and SheetJS writes that model out as a genuine .xlsx workbook — a ZIP of OpenXML parts, exactly what Excel produces. It is not a CSV with a different extension, which is what some "export to Excel" features actually give you.',
      'Cell types are set deliberately at write time rather than guessed when the file is opened. A value entered as text stays text, which is how a product code like 00123 keeps its leading zeros instead of becoming the number 123 the first time the file is opened.',
      'That is the practical reason to build a workbook rather than hand over a CSV: the interpretation is fixed once, here, instead of being redone by whichever application opens the file next.',
    ],
    useCases: [
      'Producing a workbook on a machine with no spreadsheet application installed.',
      'Creating a template for colleagues to fill in.',
      'Turning a list you have typed or pasted into a file a finance system will accept.',
      'Building a small dataset without opening a heavyweight application for twenty rows.',
    ],
  },

  'excel-to-json': {
    about: [
      'JSON is what applications and APIs consume, and spreadsheets are where the data usually starts. This is the bridge.',
      'An array of objects keyed by the header row, or an array of arrays.',
    ],
    howItWorks: [
      'SheetJS parses the workbook and the chosen sheet is walked row by row. In object mode the header row becomes the keys and each subsequent row becomes one object; in array mode you get the raw grid with no key mapping at all.',
      'Types are carried across rather than flattened to strings. A numeric cell becomes a JSON number, a boolean becomes a boolean, and an empty cell becomes null rather than an empty string — which matters, because a consumer that treats "" and null the same way usually has a bug waiting.',
      'Dates are the case to watch. A spreadsheet stores a date as a number with a display format attached, so a converter has to decide whether to emit the number, the rendered text or an ISO timestamp. Check the first few rows of the output against the sheet before wiring it into anything.',
    ],
    useCases: [
      'Turning a spreadsheet a colleague maintains into seed data for an application.',
      'Preparing a fixture file for tests from a real dataset.',
      'Feeding a list into an API that expects JSON.',
      'Converting a workbook of customer or employee records without uploading it to a converter.',
    ],
  },

  'json-to-excel': {
    about: [
      'JSON is unreadable to most of the people who need to read it. Putting it in a spreadsheet is how an API response becomes something a colleague can sort and filter.',
      'Paste or open JSON and get an .xlsx workbook.',
    ],
    howItWorks: [
      'An array of objects becomes rows, with the union of all keys across every object forming the header row — so an object missing a field produces an empty cell rather than shifting the columns out of alignment.',
      'Nested objects are flattened into dotted column names: an address object with a city inside it becomes an address.city column. This is the only honest way to fit a tree into a grid, and keeping the full path in the header means you can still tell where a value came from.',
      'Arrays inside a record are the awkward case, because a cell holds one value and an array does not. They are serialised into the cell rather than silently dropped, so nothing disappears — but a record with a long nested array is a sign the data wants more than one sheet.',
    ],
    useCases: [
      'Making an API response readable by somebody who does not read JSON.',
      'Turning a configuration or export file into something reviewable in a spreadsheet.',
      'Getting log or analytics data into a form you can pivot and filter.',
      'Sharing structured data with a colleague who works entirely in Excel.',
    ],
  },

  'spreadsheet-cleaner': {
    about: [
      'A spreadsheet that has passed through several people acquires a particular mess: stray blank rows, trailing spaces, numbers stored as text, duplicates that are not quite identical.',
      'This does the whole pass in the right order.',
    ],
    howItWorks: [
      'Order is the part that matters, and it is why doing this as one operation beats doing it as four. Whitespace is trimmed first, because duplicate detection compares values exactly and "Acme Ltd" with a trailing space is a different string from "Acme Ltd" — deduplicating before trimming leaves the duplicates behind and looks like it worked.',
      'Trimming also handles non-breaking spaces, which arrive constantly in data pasted from web pages and PDFs. They look identical to ordinary spaces, occupy the same width and are a different character, so a manual find-and-replace for a space does not touch them.',
      'Blank rows and columns go next, then duplicates last, on values that are now actually comparable. The row count before and after is reported, because the failure mode of cleaning is removing rows you needed rather than leaving rows you did not.',
    ],
    useCases: [
      'Preparing an export from another system before importing it anywhere.',
      'Fixing a list that has been merged from several people’s copies.',
      'Cleaning data pasted out of a web page or a PDF, where invisible characters are the norm.',
      'Tidying a sheet of real customer records without uploading the records to do it.',
    ],
  },

  'remove-duplicate-rows': {
    about: [
      'Duplicate is a judgement rather than a fact: duplicate according to which columns? The answer changes what gets deleted, and nothing in the data can decide it for you.',
      'Match on the whole row or on the key columns that actually identify a record.',
    ],
    howItWorks: [
      'Rows are compared by building a key from the columns you selected and keeping the first occurrence of each. Whole-row matching is the safe default because it only removes rows identical in every respect; matching on a key column such as an ID or an email address catches more, and will delete rows that differ elsewhere in ways you may have wanted.',
      'The decision has real consequences. Two orders from the same customer on the same day for the same amount are duplicates if the file was imported twice and two genuine orders if it was not — and nothing in the file distinguishes those cases.',
      'Comparison is exact, which means it is defeated by whitespace and inconsistent capitalisation. Trimming first is not optional if the data came from more than one source.',
    ],
    useCases: [
      'Cleaning a mailing list assembled from several exports.',
      'Fixing a table where an import ran twice.',
      'Deduplicating contacts by email address rather than by name, where the same person is entered differently.',
      'Preparing a dataset for analysis where repeated rows would double-count.',
    ],
  },

  'remove-blank-rows': {
    about: [
      'Empty rows break more than they look like they should. Many spreadsheet operations treat a blank row as the end of the data, so a sort or a filter silently applies to the top section only.',
      'Strip empty rows and columns, including the ones that only look empty.',
    ],
    howItWorks: [
      'A row is removed when every cell in it is empty after trimming — which is the important detail, because a row containing a single space is not blank to a spreadsheet and is blank to a human reading the screen. Those are exactly the rows that break a sort while appearing to be nothing.',
      'Empty columns are handled the same way, and both usually arrive from the same source: an export padded out to a fixed grid, or a file where somebody deleted content without deleting the rows.',
      'One case deserves thought before you run it. A blank row left deliberately as a visual separator between sections carries meaning, and removing it loses that. A sheet laid out for reading rather than for processing may need restructuring instead of cleaning.',
    ],
    useCases: [
      'Fixing a sheet where sorting or filtering only affects part of the data.',
      'Cleaning an export padded out with empty rows and columns.',
      'Preparing a file for import into a system that rejects blank records.',
      'Shrinking a workbook whose used range extends far beyond its actual content.',
    ],
  },

  'formula-viewer': {
    about: [
      'A spreadsheet shows you results. The formulas producing them are hidden one cell at a time, which is no way to audit a workbook somebody else built.',
      'List every formula in the file alongside its cell reference and sheet.',
    ],
    howItWorks: [
      'SheetJS preserves the formula string on each cell as well as its computed value, so the workbook can be walked and every formula collected with its address and sheet name. What you get is the logic of the workbook as a list rather than as something to hunt for.',
      'Seeing them together is what makes errors visible. A column where one cell in two hundred has been overtyped with a constant is invisible on the grid and obvious in a list, and it is one of the most common causes of a spreadsheet that quietly gives the wrong answer.',
      'The formulas are read as text rather than evaluated. This is an audit of what the workbook says it does, which is the right question when you are reviewing someone else’s model rather than running it.',
    ],
    useCases: [
      'Auditing a financial model you inherited and did not write.',
      'Finding hard-coded values overtyped into a calculated column.',
      'Documenting how a workbook works before rebuilding it in something else.',
      'Checking a spreadsheet before relying on its figures in a report.',
    ],
  },

  'column-statistics': {
    about: [
      'Before analysing a dataset it is worth knowing what is in it — how complete each column is, how varied, and whether the numbers fall where you expect.',
      'A statistical profile of every column at once.',
    ],
    howItWorks: [
      'Each column is scanned and profiled: non-empty count, distinct values, and for numeric columns the minimum, maximum, mean and median. The profile is computed over the whole column rather than a sample, so the numbers describe your actual data.',
      'The useful signals are usually the boring fields. A non-empty count well below the row count means missing data that will skew any average taken over it. A distinct-value count of one means a column carrying no information at all. A distinct count equal to the row count means an identifier rather than a category.',
      'Minimum and maximum are the fastest way to find data-entry errors. A negative age, a date in 1900, or a price three orders of magnitude above the rest are all visible immediately and effectively invisible when scrolling.',
    ],
    useCases: [
      'Sizing up a dataset somebody has just sent you before doing anything with it.',
      'Finding the columns with enough missing values to invalidate an analysis.',
      'Spotting outliers and impossible values caused by data entry.',
      'Documenting the shape of a dataset for someone else who will use it.',
    ],
  },

  'data-type-detection': {
    about: [
      'A column is either numeric or it is not, and one stray cell breaks the distinction. The consequences are quiet: sums skip text cells, sorting puts 100 before 20, charts drop what they cannot read.',
      'Scan the sheet and see what each column actually contains.',
    ],
    howItWorks: [
      'Every value in a column is tested against a series of patterns — integer, decimal, date, boolean, email, URL, plain text — and the column is reported as the type that fits all of its values, along with the count of any that do not.',
      'The exceptions are the point. A column reported as 998 integers and 2 text values is telling you exactly where to look, and finding those two cells by scrolling is what the tool saves you.',
      'Dates deserve particular attention, because a date column is the one most likely to be silently wrong. A spreadsheet stores a date as a number wearing a display format, and ambiguous values like 03/04/2026 read two ways — a misreading that is invisible for any day above the twelfth and wrong for the rest.',
    ],
    useCases: [
      'Finding the one text cell that is stopping a column from summing.',
      'Validating a dataset before importing it into a system with typed columns.',
      'Checking whether a date column was parsed the way you assumed.',
      'Identifying which columns hold email addresses or URLs before processing them.',
    ],
  },

  /* --------------------------------------------------------- PowerPoint */

  'pptx-creator': {
    about: [
      'Building a deck usually means opening PowerPoint, and a lot of decks are simple enough that opening PowerPoint is the slowest part.',
      'Title, content, two-column and section-divider layouts, exported as a real .pptx.',
    ],
    howItWorks: [
      'Slides are written with PptxGenJS, which produces a genuine OpenXML presentation — a ZIP of the same parts PowerPoint itself writes. The result opens in PowerPoint, Keynote and Google Slides as an editable deck rather than as a set of pictures.',
      'Content goes into real placeholders rather than free-floating text boxes. That is what makes the outline view work, what lets a corporate template restyle the deck when you apply one, and what keeps the text accessible to a screen reader.',
      'Layouts are deliberately few. A deck assembled from four consistent layouts reads better than one where every slide was positioned by hand, and it is far easier for someone else to pick up and continue.',
    ],
    useCases: [
      'Putting together a short deck without opening a presentation application.',
      'Drafting slides on a machine that has no copy of PowerPoint.',
      'Producing a starting deck for a colleague to finish in their own template.',
      'Building a presentation containing commercially sensitive figures without using a cloud editor.',
    ],
  },

  'pptx-to-images': {
    about: [
      'Slides are needed as pictures more often than as slides — in a document, on a page, in a chat message, as a thumbnail.',
      'Each slide becomes an image at the resolution you choose.',
    ],
    howItWorks: [
      'No browser can render a PowerPoint file, so the .pptx is parsed here directly: it is a ZIP of OpenXML, and the shape tree of each slide is read out — positions, sizes, text runs, tables and pictures, converted from OpenXML’s internal units into points.',
      'That model is drawn to a canvas at your chosen scale and encoded as an image. Rendering at higher scale gives a sharper result and a proportionally larger file; doubling the scale roughly quadruples the pixel count, and an image cannot be sharpened afterwards.',
      'The limits are specific and reported rather than hidden. Charts, SmartArt, 3-D effects and animations are features of PowerPoint’s own renderer rather than content stored in the file, and they are not reproduced. Ordinary slides of text, shapes, tables and images render faithfully.',
    ],
    useCases: [
      'Putting a slide into a report or a web page without a blurry screenshot.',
      'Sending one slide through a chat application that will not preview a deck.',
      'Generating thumbnails of a presentation for a listing or an index.',
      'Producing images from a deck that should not be uploaded to a conversion service.',
    ],
  },

  'pptx-extract-text': {
    about: [
      'The text in a deck is scattered across placeholders, text boxes, tables and speaker notes, and copying it out slide by slide is tedious enough that people retype it.',
      'Pull all of it in one pass.',
    ],
    howItWorks: [
      'Each slide’s XML is read directly from the .pptx archive and the shape tree walked, collecting text runs from title and body placeholders, free-standing text boxes and table cells. Speaker notes live in separate parts of the archive and are read from there.',
      'Reading the container rather than a rendering is what makes this complete. Text positioned off the edge of a slide, or on a slide hidden from the presentation, is still in the file and is still extracted — which is useful when auditing and surprising when you had forgotten it was there.',
      'Text inside a picture is not text and cannot be extracted. A slide whose content is a screenshot yields nothing, because there is nothing in the file but an image.',
    ],
    useCases: [
      'Turning a deck into a written summary or a set of notes.',
      'Getting speaker notes out as a script before presenting.',
      'Making a presentation searchable, or feeding it into a document.',
      'Checking what text a deck still contains before circulating it outside.',
    ],
  },

  'pptx-extract-images': {
    about: [
      'Decks accumulate visual assets nobody keeps anywhere else — a chart someone pasted in, a diagram built once, a background nobody has the source for.',
      'List every media item in the presentation and take the originals.',
    ],
    howItWorks: [
      'Presentations store their media pooled at package level rather than per slide, so one image reused on twenty slides is stored once. Reading that pool with JSZip therefore gives you the deck’s complete asset inventory in one list, with no duplicates to sift through.',
      'The trade-off of pooling is that the list is not organised by where things appear. An asset shows up whether it sits on slide three, on a master, on a layout, or on a slide that was deleted without clearing the package.',
      'That last category is the one worth checking. Removing a slide does not necessarily remove what it contained, so a deck can carry an image from a version you thought was gone — visible to anyone willing to open the archive.',
    ],
    useCases: [
      'Rescuing a chart or diagram from a deck when the file it was made in is long gone.',
      'Collecting brand assets from a template nobody has the source files for.',
      'Auditing a deck before it goes outside, including assets from deleted slides.',
      'Pulling every image out of a long presentation at once instead of slide by slide.',
    ],
  },

  'slide-selector': {
    about: [
      'Cutting a long deck down for a shorter audience normally means duplicating the file and deleting slides one at a time, hoping you did not remove one you needed.',
      'Preview every slide as a thumbnail, tick what to keep, export a new deck.',
    ],
    howItWorks: [
      'Slides are parsed and rendered as thumbnails so you can judge the deck visually, which is the only sensible way to decide what a shorter version should contain.',
      'The export writes a new presentation containing the slides you selected, in their original order, with the original left untouched. Nothing is edited in place, so a selection you regret costs nothing.',
      'Because the source deck is parsed rather than rendered to pictures, the exported slides remain editable slides rather than images of slides.',
    ],
    useCases: [
      'Producing a fifteen-minute version of an hour-long deck.',
      'Removing internal or financial slides before presenting to a client.',
      'Pulling a handful of slides out of a large template library.',
      'Making a short version of a confidential deck without uploading the full one.',
    ],
  },

  /* ------------------------------------------------------------ Viewers */

  'universal-viewer': {
    about: [
      'The everyday problem is not opening one format, it is not knowing which format you have been sent — and having a different tool bookmarked for each one.',
      'Drop in almost any document and it opens in the right reader.',
    ],
    howItWorks: [
      'The file’s type is determined from its bytes rather than its extension, then the matching reader is loaded on demand: PDF.js for PDFs, Mammoth for Word, SheetJS for spreadsheets, a direct OpenXML parser for PowerPoint, and dedicated readers for CSV, Markdown, JSON, XML, HTML and plain text.',
      'Reading the bytes matters because extensions lie constantly. A .txt that is really a PDF, or a .xls that is really an HTML table, both open correctly here and both defeat a viewer that trusts the file name.',
      'Only the reader you need is downloaded. Opening a Markdown file does not fetch the PDF engine, which is why the page stays light despite handling a dozen formats.',
    ],
    useCases: [
      'Opening an attachment when you are not sure what it is.',
      'Reading documents on a device with no office software installed.',
      'Checking a file from an unfamiliar sender in a browser tab rather than in desktop software.',
      'Reading a confidential document without uploading it to a web viewer.',
    ],
  },

  'xlsx-viewer': {
    about: [
      'Reading a spreadsheet should not require a spreadsheet application, and a workbook with a hundred thousand rows should not lock up the page.',
      'Open .xlsx and .xls in a virtualised grid with working sheet tabs.',
    ],
    howItWorks: [
      'SheetJS parses the workbook in this tab, and the grid is virtualised: only the cells currently on screen exist as DOM elements, and they are recycled as you scroll. Rendering a hundred thousand rows at once would freeze any browser, so it never happens.',
      'Cells display their computed values, which is what a workbook stores alongside each formula. You are reading the spreadsheet as it last calculated, not re-evaluating it.',
      'This is a reader rather than an editor, and the trade is honest: it opens large files quickly and it will not recalculate. Charts, conditional formatting and macros are not rendered — the last of those is a feature rather than a limitation, since a macro is code and nothing here runs it.',
    ],
    useCases: [
      'Reading a workbook on a machine with no spreadsheet application.',
      'Opening a large export that a full application would take a long time to load.',
      'Checking a spreadsheet from an unfamiliar sender without letting any macro run.',
      'Reading a file of real records without uploading it to an online viewer.',
    ],
  },

  'csv-viewer': {
    about: [
      'Opening a CSV in a spreadsheet application is how data gets damaged: leading zeros vanish, long numbers turn into scientific notation, and anything resembling a date is converted into one.',
      'This shows you the file as it is.',
    ],
    howItWorks: [
      'PapaParse reads the file, detecting the delimiter from the content — comma, tab or semicolon — and handling quoted fields, escaped quotes and line breaks inside cells. Those are the cases that defeat splitting on commas, and they are common in exported data.',
      'Values are displayed as text exactly as stored. Nothing is converted to a number or a date, so 00123 stays 00123 and a 16-digit reference stays a full number instead of being rounded into scientific notation.',
      'That is the reason to look at a CSV here before opening it anywhere else: this shows what the file contains, and a spreadsheet shows what it decided the file meant.',
    ],
    useCases: [
      'Checking an export before importing it, to see what the data actually says.',
      'Reading a CSV without a spreadsheet application silently reformatting it.',
      'Diagnosing an import that failed, by finding the row where the structure breaks.',
      'Inspecting a delimiter-separated file whose separator you do not know.',
    ],
  },

  'pptx-viewer': {
    about: [
      'Decks arrive constantly and PowerPoint is not always to hand. Most web viewers solve that by uploading the file.',
      'This renders the slides from the file’s own structure, on your machine.',
    ],
    howItWorks: [
      'A .pptx is a ZIP of OpenXML parts and no browser API renders one, so the shape tree of each slide is parsed here: positions, sizes, text runs, tables and pictures, converted from OpenXML’s internal units into points and drawn as positioned HTML.',
      'Because the slides are reconstructed as elements rather than rasterised, the text stays selectable and searchable and stays sharp at any zoom — which a viewer that renders slides to images cannot offer.',
      'Charts, SmartArt, 3-D effects, transitions and animations are not reproduced. They are behaviours of PowerPoint’s renderer rather than content in the file, and this reports them rather than dropping them silently.',
    ],
    useCases: [
      'Reading a deck on a machine or phone with no presentation software.',
      'Checking a presentation attachment quickly without launching a heavy application.',
      'Searching a long deck for a particular slide.',
      'Opening a confidential deck without handing it to an online viewer.',
    ],
  },

  'markdown-viewer': {
    about: [
      'Markdown is written as text and read as a rendered document, and the gap between the two is where mistakes hide — a broken table, an unclosed code fence, a list that will not nest.',
      'Preview it exactly as it will publish.',
    ],
    howItWorks: [
      'Marked parses the document with GitHub-flavoured extensions enabled, so tables, task lists, fenced code blocks and strikethrough all render the way they will on a repository or a static site.',
      'The rendered HTML passes through DOMPurify before it reaches the page. Markdown permits raw HTML, which means a document from someone else can contain markup you would not want executed — sanitising is what makes it safe to preview a file you did not write.',
      'What you see is the structure the parser actually produced, which is the point. If a table is not rendering as a table here, the separator row is wrong, and no converter downstream will fix it.',
    ],
    useCases: [
      'Checking a README renders correctly before pushing it.',
      'Reading a .md file on a machine with no editor that previews Markdown.',
      'Finding the unclosed code fence that has swallowed the rest of a document.',
      'Previewing a document before converting it, where the source is the real problem.',
    ],
  },

  'json-viewer': {
    about: [
      'Minified JSON is unreadable by design, and the usual fix — pasting it into an online formatter — means pasting whatever it contains into somebody else’s server.',
      'Browse it as a collapsible tree, pretty-print it, or minify it.',
    ],
    howItWorks: [
      'Parsing uses the browser’s own JSON implementation. The same engine your application uses reads the text, which means anything accepted here your code will accept too, and the output of formatting is guaranteed valid.',
      'That also means the parser is strict, as the specification requires. Trailing commas, single-quoted strings, comments and unquoted keys are rejected rather than quietly repaired — and when parsing fails, the position of the first token that could not be accepted is reported so you can find it.',
      'Key order is preserved exactly as written, so a formatted document still diffs cleanly against the original in version control.',
    ],
    useCases: [
      'Reading a minified API response pulled out of a browser’s network tab.',
      'Finding the exact position of a syntax error a build tool only called "invalid".',
      'Exploring a deeply nested configuration file without scrolling through one long line.',
      'Inspecting a payload containing credentials or customer data, which should not be pasted into a third-party formatter.',
    ],
  },

  'xml-viewer': {
    about: [
      'XML is verbose enough that structure is hard to see in raw text, and the documents that matter — configuration, feeds, OpenXML parts — are usually the deeply nested ones.',
      'Open it as an indented, collapsible tree with attributes and namespaces shown.',
    ],
    howItWorks: [
      'Parsing uses the browser’s built-in DOM parser inside an inert document. Nothing in the file executes, no external entity is fetched, and no referenced stylesheet or image is loaded — which is what makes it safe to open XML from a source you do not control.',
      'The tree is built from the parsed document rather than from pattern-matching the text, so namespaces are resolved properly and attributes are shown against the elements they belong to rather than inline in a wall of angle brackets.',
      'A malformed document reports where parsing failed rather than displaying a partial tree, because a tree built from broken XML is more misleading than no tree at all.',
    ],
    useCases: [
      'Reading a configuration file whose nesting is impossible to follow as text.',
      'Inspecting an RSS or sitemap feed.',
      'Looking inside the OpenXML parts of an unzipped Office document.',
      'Debugging an API response or a data interchange file that will not parse.',
    ],
  },

  'text-viewer': {
    about: [
      'Log files are the ones that defeat ordinary editors: hundreds of megabytes, one line at a time, and an editor that tries to load the whole thing at once.',
      'A virtualised reader with line numbers, wrap toggle and encoding detection.',
    ],
    howItWorks: [
      'The view is virtualised, so only the lines currently on screen exist in the page and they are recycled as you scroll. That is what allows a very large file to open immediately instead of freezing the browser while it builds elements for every line.',
      'Encoding is detected rather than assumed. A byte-order mark identifies UTF-16 and UTF-8 variants; without one, the bytes are examined for valid UTF-8 sequences before falling back. Guessing wrong is what produces a screen of replacement characters in files containing any non-English text.',
      'Line numbers come from the file’s own line breaks, and the wrap toggle changes only display — turning wrapping off is usually right for logs, where the important content sits at the end of long lines.',
    ],
    useCases: [
      'Opening a log file too large for a text editor to load.',
      'Reading a data dump or export without an application reformatting it.',
      'Checking the encoding of a file that displays as gibberish elsewhere.',
      'Reading a log containing production data on your own machine rather than uploading it.',
    ],
  },

  'html-viewer': {
    about: [
      'An HTML file from an unknown source is executable content. Opening it directly runs its scripts, loads its images and reports back to whoever wrote it.',
      'Render it in a sandbox, or read the source as highlighted markup.',
    ],
    howItWorks: [
      'The rendered view runs inside a sandboxed frame with scripting disabled, so nothing in the document executes and no tracking pixel or remote resource is fetched. You see the page as it is written rather than as it would behave.',
      'The source view parses the markup with the browser’s own parser inside an inert document — the same parser, without the execution — and pretty-prints it with syntax highlighting so structure is readable.',
      'That combination is the useful part: the rendered view tells you what a document looks like, and the source view tells you what it actually contains, including the remote resources it would have loaded.',
    ],
    useCases: [
      'Opening an HTML attachment safely, which is a common phishing vector.',
      'Reading a saved page or an exported report without letting it phone home.',
      'Inspecting the markup of a file before publishing or embedding it.',
      'Checking what a marketing email would load before opening it in a mail client.',
    ],
  },

  /* --------------------------------------------------------- Converters */

  'markdown-to-pdf': {
    about: [
      'Markdown is a good place to write and a poor place to deliver. When somebody asks for the document, they mean a PDF.',
      'Typeset with real heading hierarchy, lists, tables and code blocks.',
    ],
    howItWorks: [
      'Marked’s token stream is walked directly rather than going through HTML first, which preserves table alignment, task lists and nesting that a round trip through the DOM would blur. The tokens become a structured document model, and the PDF writer lays that model onto pages.',
      'The writer is a genuine if compact layout engine: it wraps mixed bold and italic runs, paginates lists and tables, repeats table headers across page breaks, draws link annotations so links stay clickable, and adds page numbers in a second pass once the total is known.',
      'The result contains real selectable text rather than an image of a rendered page, which means it is searchable, accessible and small.',
    ],
    useCases: [
      'Turning documentation written in Markdown into something to circulate or file.',
      'Producing a printable version of a README or specification.',
      'Delivering notes to somebody who will not accept a .md file.',
      'Converting a draft that is not public yet without uploading it to a converter.',
    ],
  },

  'markdown-to-docx': {
    about: [
      'A colleague who will comment on your document needs Word, not Markdown. Pasting the source in gives them hashes and asterisks.',
      'Convert to a .docx that uses genuine Word styles.',
    ],
    howItWorks: [
      'Marked’s tokens become a structured document model, and the .docx writer maps that model onto Word’s own built-in styles — Heading 1 to 6, Quote, List Paragraph — rather than hard-coding font sizes to imitate them.',
      'That distinction is what makes the output genuinely useful. A real Heading 2 appears in Word’s navigation pane, generates a working table of contents, and takes on the theme of any template the document is dropped into. A paragraph made large and bold does none of those things.',
      'Tables keep their structure and their alignment, and lists renumber themselves when edited, because both are written as real Word constructs rather than as text that looks like them.',
    ],
    useCases: [
      'Sending Markdown-authored content to someone who works in Word and will track changes.',
      'Producing a document that has to go into a corporate template.',
      'Handing notes to a colleague who does not use Markdown and should not have to.',
      'Converting a draft locally rather than through a service that keeps a copy.',
    ],
  },

  'markdown-to-html': {
    about: [
      'Markdown was designed as a shorthand for HTML, so this is the most faithful of the conversions — close to one to one.',
      'Export a fragment to paste into a page, or a complete document.',
    ],
    howItWorks: [
      'Marked parses with GitHub-flavoured extensions enabled, so tables, task lists, fenced code blocks and strikethrough all convert rather than passing through as literal text.',
      'The output is sanitised with DOMPurify before it is shown or exported. Markdown permits raw HTML inline, which means a document from elsewhere can carry markup you would not want to run — sanitising is what makes converting someone else’s file safe.',
      'Fragment mode gives you just the content, for pasting into an existing page or template. Document mode wraps it in a complete file. Neither adds styling of its own, which is deliberate: on a web page those decisions belong to your stylesheet.',
    ],
    useCases: [
      'Publishing Markdown-authored content to a CMS that expects HTML.',
      'Getting formatted content into an email template.',
      'Converting notes into a page you can host directly.',
      'Producing clean HTML from a Markdown file without a build pipeline.',
    ],
  },

  'html-to-markdown': {
    about: [
      'Getting content out of a web page usually means pasting it and then deleting the formatting that came along. Converting to Markdown does that as one deliberate step.',
      'Headings, links, images, lists and tables all map across.',
    ],
    howItWorks: [
      'The markup is parsed with the browser’s own DOM parser inside an inert document — nothing runs, and no image or stylesheet is fetched — and the resulting tree is walked to produce Markdown from the structure rather than from the text.',
      'Working from the parsed tree is what makes the output clean. Presentational wrappers, inline styles and layout divs have no Markdown equivalent and are dropped; what survives is the content and its structure, which is what you wanted.',
      'Constructs Markdown cannot express — nested tables, forms, iframes, arbitrary attributes — are the honest limit. They are simplified rather than reproduced with raw HTML that would defeat the point of converting.',
    ],
    useCases: [
      'Moving content from a website or CMS into a repository or wiki.',
      'Cleaning up copied web content into plain, portable text.',
      'Turning an exported HTML article into a post for a static site.',
      'Getting a diff-able version of a page for tracking changes over time.',
    ],
  },

  'html-to-pdf': {
    about: [
      'Printing a page to PDF from a browser gives you the browser’s print stylesheet, its headers and its page breaks, which is rarely what you wanted.',
      'This paginates the content properly and keeps the text real.',
    ],
    howItWorks: [
      'The markup is parsed inside an inert document, so no script runs and no remote resource is fetched, then converted into the structured document model and laid onto pages by the PDF writer.',
      'That writer paginates lists and tables, repeats table headers across page breaks, wraps mixed bold and italic runs, and draws link annotations so links remain clickable in the PDF. Page numbers are added in a second pass once the total page count is known.',
      'Because the model is built from structure rather than from a screenshot of a rendered page, the output contains selectable, searchable text. What it does not do is reproduce arbitrary CSS layout — this is a document renderer, not a browser engine, and a page built out of absolute positioning will not survive.',
    ],
    useCases: [
      'Turning an exported HTML report into a PDF to file or send.',
      'Converting a saved web page into a fixed document.',
      'Producing a PDF from generated markup without running a headless browser.',
      'Converting a page containing private data without sending the markup anywhere.',
    ],
  },

  'html-to-docx': {
    about: [
      'Content that lives on the web often has to end up in Word — for review, for a submission, for someone who works that way.',
      'Convert with heading styles, lists, tables and images mapped properly.',
    ],
    howItWorks: [
      'The markup is parsed in an inert document, converted into the structured document model, and written as a .docx using Word’s built-in styles. An h2 becomes a real Heading 2, not a large bold paragraph.',
      'Images referenced in the markup are embedded into the document where they can be resolved. Nothing is fetched from the network during conversion, so a remote image that is not already inline as a data URI cannot be included — that restriction is the same one that stops a converted document phoning home.',
      'CSS is deliberately not carried across. Word’s formatting model and CSS overlap only partially, and a conversion that tried to reproduce every declaration produces a document nobody can restyle. Structure converts; presentation is left to Word.',
    ],
    useCases: [
      'Getting web content into Word for a colleague to review and comment on.',
      'Converting an HTML report into a document that must go into a corporate template.',
      'Turning generated markup into a submission that has to be a .docx.',
      'Producing an editable document from a page without a round trip through copy and paste.',
    ],
  },

  'txt-to-pdf': {
    about: [
      'Plain text is the most portable format there is and the least presentable. Sending a log or a note as a .txt often means it arrives unreadable.',
      'Convert with a proper page, a chosen typeface and real pagination.',
    ],
    howItWorks: [
      'The text is laid onto pages by the PDF writer with the face, size and margins you pick. A monospaced face preserves column alignment, which matters for logs, tables of figures and anything that was formatted with spaces; a proportional face reads better for prose.',
      'Long lines are wrapped rather than truncated, and the wrap point is calculated from the actual glyph widths of the chosen font, so nothing runs off the edge of the page.',
      'Encoding is detected from the bytes before conversion. Getting this wrong is what turns accented characters into replacement symbols, and a byte-order mark or a scan for valid UTF-8 sequences settles it.',
    ],
    useCases: [
      'Attaching a log file to a report or a ticket in a form people will actually read.',
      'Printing a plain-text document with sensible margins and page numbers.',
      'Archiving notes or configuration in a fixed, portable format.',
      'Filing a text record where the recipient requires a PDF.',
    ],
  },

  'csv-to-json': {
    about: [
      'CSV is what systems export and JSON is what applications consume, so this conversion sits between almost every spreadsheet and almost every script.',
      'An array of objects, with the delimiter detected for you.',
    ],
    howItWorks: [
      'PapaParse reads the file, detecting whether it is comma, tab or semicolon separated from the content itself, and handling quoted fields, escaped quotes and line breaks inside cells — the cases that break a naive split and that appear constantly in real exports.',
      'The header row becomes the object keys. Values can be kept as strings or type-inferred into numbers and booleans; inference is convenient and occasionally wrong, and the case to watch is an identifier of digits that becomes a number and loses its leading zeros.',
      'Rows with more or fewer fields than the header are reported rather than silently padded, because a row count that does not match is usually a quoting problem earlier in the file rather than a genuinely short record.',
    ],
    useCases: [
      'Turning an export into seed data or a test fixture.',
      'Feeding spreadsheet data into an API that expects JSON.',
      'Converting a data file for a script without writing a parser.',
      'Processing a file of personal records without uploading it to a converter.',
    ],
  },

  'json-to-csv': {
    about: [
      'JSON is unreadable to most people who need to read it, and CSV is what a spreadsheet, a finance system or a colleague will accept.',
      'Flatten an array of objects into a table.',
    ],
    howItWorks: [
      'The union of all keys across every object forms the header row, so an object missing a field produces an empty cell rather than shifting the columns out of alignment — which is what happens when a converter takes its headers from the first record only.',
      'Nested objects are flattened into dotted column names, so an address object with a city inside becomes an address.city column. Keeping the full path in the header means a value can still be traced back to where it came from.',
      'Output is quoted and escaped properly: fields containing commas, quotes or line breaks are wrapped and their quotes doubled, so the file parses correctly at the other end rather than falling apart on the first address field.',
    ],
    useCases: [
      'Loading structured data into a system whose only import path is CSV.',
      'Producing a flat file for a bulk upload where nesting has to be resolved first.',
      'Getting a dataset into a form a database import or a shell tool will accept.',
      'Preparing an extract for a finance or billing system that will not read JSON.',
    ],
  },

  'svg-to-png': {
    about: [
      'An SVG stays perfectly sharp at any size because it is a set of drawing instructions rather than a grid of pixels. Converting to PNG fixes it at one resolution, so choosing that resolution is the whole decision.',
      'Render at 1× to 8× scale, or at an exact pixel size.',
    ],
    howItWorks: [
      'The SVG is drawn by the browser’s own renderer onto a canvas at the size you asked for and encoded as PNG. Because the vector is rasterised at the target size rather than scaled after the fact, the result is as sharp as the format allows.',
      'PNG is lossless and keeps the alpha channel, so transparency survives — which matters for logos and icons, where a JPEG would put a white box behind the artwork.',
      'Export larger than looks necessary. Twice the display size is a sensible default for high-density screens, and an image cannot be sharpened afterwards. Keep the SVG, because it is the only version you can go back to.',
    ],
    useCases: [
      'Getting a logo into a format an application will not take as SVG.',
      'Producing a raster icon or favicon at exact pixel dimensions.',
      'Putting a vector diagram into a document or a slide.',
      'Rendering an SVG at high resolution for print.',
    ],
  },

  'png-to-webp': {
    about: [
      'WebP is smaller than PNG for the same image and every current browser reads it, which makes it the obvious format for anything going on a web page.',
      'Convert with control over quality, or losslessly.',
    ],
    howItWorks: [
      'The PNG is decoded and re-encoded as WebP by the browser’s own codecs. WebP has both a lossless mode, which typically beats PNG on size with pixel-identical output, and a lossy mode, which is much smaller again and discards detail.',
      'For screenshots, diagrams and anything containing text, lossless is usually right — lossy compression smears the sharp edges of letterforms in exactly the way that looks cheap. For photographs stored as PNG, lossy WebP is often dramatically smaller at no visible cost.',
      'Transparency survives in both modes, which is what distinguishes WebP from JPEG and makes it a genuine replacement for PNG rather than a compromise.',
    ],
    useCases: [
      'Cutting the weight of screenshots and diagrams on a web page.',
      'Reducing image payload to improve page load times.',
      'Getting a transparent image smaller than PNG allows.',
      'Compressing images before attaching them, where the recipient can read WebP.',
    ],
  },

  'jpg-to-png': {
    about: [
      'Converting to PNG gives you a lossless container and an alpha channel. It does not give you back anything the JPEG already discarded.',
      'Useful before editing, or where transparency will be added later.',
    ],
    howItWorks: [
      'The JPEG is decoded and re-encoded as PNG by the browser’s codecs. From that point on the image is lossless: it can be opened, edited and saved repeatedly with no further degradation, which is the actual reason to convert before working on a file.',
      'What conversion cannot do is undo the original compression. The detail a JPEG threw away is gone, and storing the degraded result losslessly preserves the degradation perfectly. Always convert from the best original you have.',
      'PNG supports transparency but cannot create any. A JPEG’s white background is part of the picture, not an absence of one, and removing it is an editing job rather than a conversion.',
    ],
    useCases: [
      'Preparing a photograph for editing, so repeated saves do not degrade it.',
      'Getting a format that will accept transparency once a background is removed.',
      'Meeting a requirement for PNG uploads.',
      'Converting to a lossless format before compositing an image into a design.',
    ],
  },

  /* --------------------------------------------------------- Generators */

  'quotation-generator': {
    about: [
      'A quotation is an offer, and an invoice is a demand for payment. They look similar and are treated very differently, so sending the wrong one is more than a labelling mistake.',
      'Line items, optional items, taxes and a validity date, exported as a PDF.',
    ],
    howItWorks: [
      'The form is rendered to a PDF in this tab and saved straight to your device. Your pricing, your margins and the client’s name exist only in this page — which matters, because a set of quotations is a complete picture of what you charge and who you are pitching to.',
      'A validity date is the field most often left off and the one that causes the most trouble. A quotation with no expiry is an open offer, and being held to a price quoted eight months ago is a real commercial risk rather than a theoretical one.',
      'Give the quotation a number and keep it. When the work is agreed, the invoice should reference that number — which is what turns a disputed invoice into a short conversation.',
    ],
    useCases: [
      'Pricing a job for a client before any work is agreed.',
      'Offering tiered options where some line items are marked optional.',
      'Producing a formal estimate a client can take to their own approvals process.',
      'Quoting without registering your rates and client list with a third-party service.',
    ],
  },

  'certificate-generator': {
    about: [
      'Certificates are needed in batches and almost always at short notice, usually the day before the event.',
      'Landscape certificates of achievement, participation or completion.',
    ],
    howItWorks: [
      'The certificate is composed and written as a PDF at landscape page size, with the decorative border and typography drawn as vector graphics rather than placed as a background image — so it stays sharp at any zoom and prints cleanly at any size.',
      'Because the output is a vector PDF rather than a rasterised design, the recipient’s name remains real selectable text. That matters if certificates are ever searched, filed or verified.',
      'Names go in exactly as typed, which is worth a moment’s care. A certificate with a misspelled name is worse than no certificate, and it is the single most common thing to get wrong when producing them quickly.',
    ],
    useCases: [
      'Issuing certificates after a training course or workshop.',
      'Recognising participation in an event or competition.',
      'Producing completion certificates for an internal programme.',
      'Creating certificates that carry names and results without putting that list on someone else’s server.',
    ],
  },

  'meeting-minutes-generator': {
    about: [
      'Minutes are worth almost nothing as a transcript and a great deal as a record of what was decided and who is doing what next.',
      'Attendees, apologies, agenda items, decisions and actions with owners and due dates.',
    ],
    howItWorks: [
      'The structure is deliberately opinionated: every action item takes an owner and a due date, because an action with neither is a note rather than a commitment, and that is the difference between minutes that work and minutes nobody reads.',
      'Decisions are recorded separately from discussion. Weeks later the only questions anyone asks are what was decided and who owns the next step; separating the two means the answer is findable rather than buried in narrative.',
      'The document is generated as a PDF here and never transmitted. Minutes routinely contain personnel matters, commercial terms and things said in confidence, which makes a cloud minute-taker an odd choice for exactly the meetings that need minutes most.',
    ],
    useCases: [
      'Recording a board, committee or project meeting properly.',
      'Circulating agreed actions after a client call.',
      'Keeping a formal record where one may later be required.',
      'Minuting a meeting about personnel or commercial matters that should not be uploaded anywhere.',
    ],
  },

  'business-proposal-generator': {
    about: [
      'A proposal that wins is structured rather than eloquent: the problem stated in the client’s own terms, then the solution, the scope, and the price.',
      'Executive summary, problem, solution, scope, timeline and pricing.',
    ],
    howItWorks: [
      'The sections follow the order proposals are actually read in. Most readers read the executive summary and the price, then decide whether to read anything else — which is why the summary comes first and has to work alone.',
      'Scope is given its own section because it is where proposals go wrong. What is included, and explicitly what is not, is the section you will refer back to when the client asks for something you did not quote for.',
      'The document is generated as a PDF in this tab. A proposal contains your pricing, your approach and your assessment of a client’s problems — commercially sensitive on every count, and not something to hand to a generator that keeps a copy.',
    ],
    useCases: [
      'Responding to a request for proposal with a structured document.',
      'Pitching a project to a new client.',
      'Turning a scoping conversation into a written offer.',
      'Preparing a competitive bid whose pricing should not sit on a third-party server.',
    ],
  },

  'salary-slip-generator': {
    about: [
      'A payslip is among the most sensitive documents a small employer produces, and it is needed every month for every person.',
      'Employee details, earnings, deductions, employer contributions and net pay.',
    ],
    howItWorks: [
      'Earnings and deductions are itemised separately and the net figure is computed from them, so the slip shows the arithmetic rather than asserting a total. That is what makes a payslip answer questions instead of prompting them.',
      'Everything stays in this tab. A payslip carries a person’s full name, salary, deductions and often their tax and bank identifiers together on one page — the combination that makes it worth more to an attacker than most documents a business handles.',
      'Statutory requirements for what a payslip must show vary by country and by employment type. This produces the document; whether it satisfies your jurisdiction’s rules is worth confirming against them.',
    ],
    useCases: [
      'Issuing monthly payslips as a small employer without payroll software.',
      'Producing a payslip for a contractor or a one-off payment.',
      'Reissuing a slip an employee has lost.',
      'Generating pay records without uploading salary data to a cloud service.',
    ],
  },

  'offer-letter-generator': {
    about: [
      'An offer letter is the first formal document a new employee receives and often the one they refer back to for years.',
      'Role, compensation, start date, probation and working terms.',
    ],
    howItWorks: [
      'The fields cover the terms that get disputed: title, reporting line, compensation and its components, start date, probation period, notice, and working location or hours. Ambiguity in any of these is where disagreements begin.',
      'Compensation is broken into its parts rather than stated as one figure, because a candidate comparing offers needs to see what is fixed and what is variable — and because a single number invites a different reading later.',
      'The letter is generated here and never transmitted. An offer names a person, their salary and their start date before anything is public; a leak damages the candidate’s current position as much as your process.',
    ],
    useCases: [
      'Making a formal offer to a candidate after interviews.',
      'Documenting an internal promotion or a change of terms.',
      'Issuing a fixed-term or contractor engagement letter.',
      'Producing an offer whose salary figures should not pass through a third party.',
    ],
  },

  'experience-letter-generator': {
    about: [
      'An experience or relieving letter is what a departing employee needs for their next role, and it is usually asked for after they have left.',
      'Confirms role, dates of service and conduct.',
    ],
    howItWorks: [
      'The letter states the facts an employer can verify: job title, start and end dates, and the nature of the employment. Keeping to verifiable facts is deliberate — a reference expressing opinions about performance carries legal exposure in many jurisdictions that a factual confirmation does not.',
      'Wording differs by purpose. An experience certificate confirms service, a relieving letter confirms the employment has formally ended and dues are settled, and an employer asked for one is frequently asked for the other in the same week.',
      'The document is produced in this tab, which suits a letter naming a former employee and their dates of service — data you hold as an employer and should not scatter across services.',
    ],
    useCases: [
      'Confirming service for an employee who has resigned.',
      'Providing a factual reference for a former colleague’s next employer.',
      'Issuing a relieving letter on an employee’s final day.',
      'Producing a service certificate for a visa or a loan application.',
    ],
  },

  'cover-letter-generator': {
    about: [
      'A cover letter is read for about twenty seconds and does one job: connecting what the posting asks for to something you have actually done.',
      'A proper business heading, salutation, hook and evidence paragraphs.',
    ],
    howItWorks: [
      'The structure enforces a business letter rather than an email — sender block, recipient, date, salutation, body, sign-off. That is what a formal application expects, and a letter that opens like a message reads as less considered.',
      'The body is split into a hook and evidence paragraphs deliberately. The most common failure is a letter that restates the CV; separating the opening from the evidence forces each paragraph to make one specific claim and support it.',
      'It is generated as a PDF here. A cover letter carries your name, contact details and employment situation, and is written while you are looking for work — which is exactly when you would rather not leave copies on a job site’s servers.',
    ],
    useCases: [
      'Applying for a role that asks for a covering letter.',
      'Writing a speculative approach to an employer with no advertised vacancy.',
      'Tailoring a letter to one posting using that posting’s own vocabulary.',
      'Producing an application while employed, where discretion matters.',
    ],
  },

  /* ----------------------------------------------------------- Diagrams */

  'diagram-studio': {
    about: [
      'Diagramming tools are almost all cloud services now, which means every architecture diagram and every network map is stored on somebody else’s infrastructure.',
      'An editor on an infinite grid with routed connectors, running entirely in the browser.',
    ],
    howItWorks: [
      'Shapes, connectors and text are held as a document model and rendered as vectors, so the canvas stays sharp at any zoom and exports at any size without pixelation.',
      'Connectors are routed rather than drawn as straight lines: they attach to shapes and re-route when a shape moves, which is what keeps a diagram legible after the tenth rearrangement instead of degrading into crossed lines.',
      'Nothing is saved to a server, which has a consequence worth planning around — the diagram exists in this tab until you export it. That is the trade for a diagram of your internal network that never leaves your machine.',
    ],
    useCases: [
      'Documenting an internal system architecture that should not be stored externally.',
      'Sketching a design during a discussion and exporting it into the notes.',
      'Producing a diagram for a document without a subscription to a diagramming service.',
      'Drawing infrastructure under a confidentiality obligation that a cloud tool would breach.',
    ],
  },

  'text-to-diagram': {
    about: [
      'Dragging boxes is slow, and a diagram defined as text can be version-controlled, reviewed in a pull request and regenerated when the system changes.',
      'Type Mermaid, a PlantUML subset, or a simple indented outline.',
    ],
    howItWorks: [
      'The text is parsed and laid out automatically — you describe what connects to what, and positioning is computed rather than chosen. That is the trade: less control over the exact look, and no manual rearranging when a node is added.',
      'The diagram redraws as you type, which makes the syntax easy to learn by experiment rather than by reading a specification.',
      'Because the source is text, it belongs in the repository next to the thing it documents. A diagram stored as a PNG goes stale silently; one stored as a few lines of text gets updated in the same commit as the change it describes.',
    ],
    useCases: [
      'Keeping architecture diagrams in version control alongside the code.',
      'Generating a flowchart from a description without positioning anything by hand.',
      'Producing a sequence or state diagram for documentation.',
      'Drafting a diagram quickly during a discussion where dragging shapes is too slow.',
    ],
  },

  'flowchart-maker': {
    about: [
      'A flowchart earns its place when a process has branches. Prose describing three conditional paths is far harder to follow than a picture of them.',
      'Opens the studio with a flowchart stencil ready.',
    ],
    howItWorks: [
      'The stencil carries the standard flowchart vocabulary — terminators for start and end, rectangles for processes, diamonds for decisions, parallelograms for input and output. Those shapes are a convention readers already know, which is what makes a flowchart readable without a legend.',
      'Connectors route themselves around shapes and follow them when they move, so adding a step to the middle of a chart does not mean redrawing everything after it.',
      'A decision diamond should have every branch labelled. An unlabelled fork is the most common flaw in a hand-drawn flowchart and the one that makes readers guess.',
    ],
    useCases: [
      'Documenting an approval process with its exception paths.',
      'Mapping a customer journey including where it fails.',
      'Explaining an algorithm or a decision rule to non-technical colleagues.',
      'Writing down an internal procedure that has only ever existed in someone’s head.',
    ],
  },

  'uml-diagram': {
    about: [
      'UML is worth using for the parts people actually read: class structure and the relationships between types. The rest of the specification is rarely the point.',
      'Class boxes, interfaces, inheritance and association connectors.',
    ],
    howItWorks: [
      'Class boxes carry the three standard compartments — name, attributes, operations — because that layout is what makes a class diagram scannable by anyone who has seen one before.',
      'Relationships use their conventional notation: a hollow triangle for inheritance, plain lines for association. The distinction between "is a" and "has a" is the main thing a class diagram communicates, and drawing both as the same line loses it.',
      'Drawing by hand rather than generating from code is deliberate here. A diagram of the design you intend is a different and often more useful document than a diagram of every class that currently exists.',
    ],
    useCases: [
      'Designing a domain model before writing the code.',
      'Documenting the important types in a system for someone joining it.',
      'Explaining an inheritance hierarchy in a design review.',
      'Sketching a structure during a discussion without generating it from a codebase.',
    ],
  },

  'er-diagram': {
    about: [
      'A schema is far easier to reason about as a picture, and the relationships between tables are what a written schema hides.',
      'Entity tables with typed attribute rows, primary and foreign keys, and cardinality.',
    ],
    howItWorks: [
      'Entities are drawn as tables with one row per attribute and its type, which mirrors how the schema will actually be written and makes the diagram directly translatable into DDL.',
      'Keys are marked explicitly. A foreign key is the relationship, so showing which column carries it — rather than only drawing a line between two boxes — is what makes the diagram usable when writing the migration.',
      'Cardinality on each relationship is the detail that changes the design. One-to-many and many-to-many produce different schemas, and leaving it off means the diagram cannot answer the question it was drawn for.',
    ],
    useCases: [
      'Designing a database schema before creating any tables.',
      'Documenting an existing database for people who have to query it.',
      'Reviewing a proposed schema change with colleagues.',
      'Mapping a schema containing commercially sensitive structure without a cloud tool.',
    ],
  },

  'aws-architecture-diagram': {
    about: [
      'Cloud architecture diagrams are needed for design reviews, audits and handovers — and they describe exactly the infrastructure you would least like stored on a third-party service.',
      'A stencil of common building blocks: compute, storage, networking, databases.',
    ],
    howItWorks: [
      'The stencil uses generic building blocks rather than one vendor’s icon set, which keeps a diagram readable across providers and avoids the trademark questions that come with redistributing official icons.',
      'Grouping matters more than the icons. A diagram that shows which components sit inside a VPC, a subnet or an availability zone communicates the security boundaries — and those boundaries are what a design review is actually examining.',
      'Nothing leaves this tab, which is the substantive point for this diagram in particular. An architecture diagram is a map of your attack surface, and it is routinely uploaded to services that keep it indefinitely.',
    ],
    useCases: [
      'Documenting an environment for a design or security review.',
      'Planning an infrastructure change before making it.',
      'Explaining a deployment to colleagues or auditors.',
      'Drawing infrastructure under a confidentiality obligation.',
    ],
  },

  'network-diagram': {
    about: [
      'Network documentation is the thing everyone agrees should exist and nobody has, until an outage makes its absence expensive.',
      'Routers, switches, firewalls, servers, clients and the links between them.',
    ],
    howItWorks: [
      'The stencil uses conventional network symbols, which matter because network diagrams are read under pressure by people who did not draw them. A recognisable firewall symbol is understood instantly; a labelled rectangle has to be read.',
      'Connections can carry labels for interface, VLAN or address, and those labels are usually the reason the diagram is being consulted at all — a topology with no addressing tells you what connects to what but not where to look.',
      'It stays on your machine. A network diagram names your internal addressing, your segmentation and your security appliances; it is among the most useful documents an attacker could obtain, and uploading one to a free diagramming service is a genuine exposure rather than a theoretical one.',
    ],
    useCases: [
      'Documenting an office or data-centre topology before you need it.',
      'Planning a segmentation or addressing change.',
      'Producing network documentation for an audit or a compliance requirement.',
      'Handing over infrastructure knowledge when someone leaves.',
    ],
  },

  'mind-map': {
    about: [
      'Mind maps work when thinking is faster than typing, which means the interaction has to keep up with you.',
      'Keyboard-driven branching: Tab for a child, Enter for a sibling.',
    ],
    howItWorks: [
      'Nodes are created from the keyboard so your hands never leave it — Tab adds a child, Enter adds a sibling. The value of a mind map is capturing thoughts before they are lost, and reaching for a mouse between every node breaks that.',
      'The layout is computed as the map grows: branches are positioned and spaced automatically, so adding a node in the middle rearranges the rest rather than leaving you to tidy up.',
      'It is a thinking tool rather than a document. Export it when a structure has emerged, and expect the finished artefact to be an outline or a diagram rather than the map itself.',
    ],
    useCases: [
      'Brainstorming before any structure exists.',
      'Breaking a large piece of work into parts.',
      'Taking notes in a session where ideas arrive faster than sentences.',
      'Planning the structure of a document or a talk.',
    ],
  },

  'org-chart': {
    about: [
      'Org charts are needed for onboarding, planning and reorganisations — and they are a list of named employees and their reporting lines, which is personal data.',
      'Cards with name, title, department and photo initials.',
    ],
    howItWorks: [
      'The hierarchy is laid out automatically from the reporting relationships you set, so moving a person moves their reports with them rather than leaving you to reposition a subtree by hand.',
      'Cards carry title and department alongside the name, because a chart of names alone answers who reports to whom and not the question people usually have, which is who does what.',
      'Everything stays in this tab. A complete org chart is a roster of your staff, their seniority and your management structure — useful to a recruiter, useful to anyone attempting social engineering, and routinely uploaded to free chart tools.',
    ],
    useCases: [
      'Producing a chart for an induction pack.',
      'Planning a reorganisation before it is announced.',
      'Documenting reporting lines for an audit or a funding application.',
      'Mapping a team structure containing staff names without putting it on a third-party service.',
    ],
  },

  'process-diagram': {
    about: [
      'The useful thing about a business process diagram is not the steps, which everyone knows, but the handoffs between people — which is where processes actually fail.',
      'Swimlanes per role, sequential steps and decision gateways.',
    ],
    howItWorks: [
      'Swimlanes assign every step to a role, which forces the question a plain flowchart lets you avoid: who does this. A process diagram without lanes describes what happens; one with lanes describes who is responsible.',
      'Handoffs become visible as connectors crossing a lane boundary. Counting those crossings is a reliable way to find delay in a process, because each one is a wait for another person.',
      'Decision gateways branch the flow with labelled conditions, so exception paths are documented rather than left as the part everyone improvises.',
    ],
    useCases: [
      'Mapping an approval or onboarding process across several departments.',
      'Finding the handoffs that cause delay before trying to fix them.',
      'Documenting a procedure for training or for an audit.',
      'Agreeing who owns which step when responsibilities are disputed.',
    ],
  },

  /* ------------------------------------------------------ File utilities */

  'file-size-analyzer': {
    about: [
      'A file that is too large is rarely uniformly large. Almost always one component accounts for most of it, and finding that component is the whole job.',
      'Break a PDF, DOCX, XLSX, PPTX or ZIP into its parts and see what is heavy.',
    ],
    howItWorks: [
      'Office formats are ZIP archives, so the container is opened here and every entry listed with its compressed and uncompressed size. PDFs are parsed for their embedded objects. Either way the report comes from the file’s actual structure rather than an estimate.',
      'The answer is nearly always images. A single photograph placed at full camera resolution and displayed two centimetres wide can be most of a document, and it is invisible from the page.',
      'Seeing the breakdown tells you what to do rather than leaving you to guess. One enormous image means replace that image; hundreds of small ones mean compress them all; a large content stream with no images means the document is genuinely long and compression will not help.',
    ],
    useCases: [
      'Finding out why a document will not fit an attachment limit.',
      'Locating the one oversized image in a report before compressing everything.',
      'Understanding what a colleague’s 40 MB deck is actually carrying.',
      'Inspecting a container file’s contents without extracting it.',
    ],
  },

  'file-signature-checker': {
    about: [
      'Extensions lie. A file called invoice.pdf can be anything at all, and the name is chosen by whoever sent it.',
      'Read the magic bytes and identify the real format.',
    ],
    howItWorks: [
      'Nearly every binary format begins with a signature — a fixed sequence of bytes at a known offset. PDFs start with %PDF, ZIP-based formats including .docx and .xlsx start with PK, PNGs carry an eight-byte header. The first bytes of your file are matched against a database of these signatures.',
      'The result is what the file actually is, independent of its name. A .txt that reports as a PDF is mislabelled; a .jpg that reports as an executable is something else entirely and should not be opened.',
      'One limitation is worth stating: a ZIP-based signature identifies the container, not the contents. A .docx and a .xlsx both begin the same way, so the format inside is determined by looking at the entries rather than the header alone.',
    ],
    useCases: [
      'Checking an unexpected attachment before opening it.',
      'Identifying a file that has lost its extension.',
      'Diagnosing why an upload was rejected as the wrong type.',
      'Verifying that a file is what a sender claims, without executing it.',
    ],
  },

  'duplicate-file-detector': {
    about: [
      'Same name and same size is a guess. Two different photographs from one camera can share both, and identical files often have completely different names.',
      'Hash every file and group the ones that are genuinely identical.',
    ],
    howItWorks: [
      'Every file is read and digested with the Web Crypto API — the browser’s own audited implementation, the same primitive used for TLS. Files with matching digests are byte-for-byte identical whatever they are called and wherever they sit.',
      'That gives the property name-and-size matching cannot: no false positives, and no missed duplicates hiding behind a different filename. Files are read in this tab and never transmitted, which is the difference from a cloud duplicate finder — those must receive your entire folder in order to tell you two files match.',
      'Hashing is not free. Every byte of every file has to be read, so a large folder takes time proportional to its total size, on your own hardware.',
    ],
    useCases: [
      'Clearing space by finding photographs imported more than once.',
      'Reconciling a folder that has been copied and edited in two places.',
      'Checking whether a download you already have is the same file.',
      'Deduplicating personal documents without uploading them to a scanner.',
    ],
  },

  'batch-rename': {
    about: [
      'Renaming files one at a time is tolerable up to about ten and unbearable after that, and the files that need it usually arrive in hundreds.',
      'Find and replace, prefixes, suffixes, numbering, case changes and dates.',
    ],
    howItWorks: [
      'Rules are applied in order to produce the new names, and the full before-and-after list is shown before anything happens. Renaming is easy to get wrong in a way that is tedious to undo, so previewing is not a convenience.',
      'Collisions are detected rather than allowed. Two files that would end up with the same name is the failure that silently loses one of them, and it is caught before any rename is applied.',
      'Sequential numbering is padded so names sort correctly — file-001 rather than file-1, because otherwise file-10 sorts before file-2 in every file manager and every script that reads the folder.',
    ],
    useCases: [
      'Renaming a folder of camera files into something meaningful before archiving.',
      'Applying a naming convention to documents for a client or a project.',
      'Adding dates or sequence numbers across a batch of scans.',
      'Stripping copy suffixes and download artefacts from a set of filenames.',
    ],
  },

  'file-metadata': {
    about: [
      'Files carry more than their contents. Names, timestamps, formats and embedded properties all travel with a document, and most of it is invisible until someone looks.',
      'Read everything the browser and the file itself can tell you.',
    ],
    howItWorks: [
      'Two layers are reported separately, because they come from different places and have different reliability. The browser supplies the file name, its MIME type as the operating system reports it, the exact byte length and the last-modified timestamp.',
      'The second layer comes from the bytes. The real format is identified from the file’s signature rather than its extension, and for known document types the embedded properties are read out of the container — author, application, creation and modification dates.',
      'Where those two layers disagree is the interesting part. A file whose extension says one thing and whose signature says another is mislabelled, deliberately or otherwise, and that mismatch is exactly what an extension alone cannot show you.',
    ],
    useCases: [
      'Checking what a document discloses before you send it on.',
      'Establishing when a file was really created or last altered.',
      'Confirming a file’s true type when the extension looks wrong.',
      'Finding out why a file was rejected by a system with a size or type limit.',
    ],
  },

  'file-hash-generator': {
    about: [
      'A hash is a fingerprint: read every byte, produce a short string, and change one byte anywhere to change the string completely.',
      'SHA-1, SHA-256, SHA-384 and SHA-512 for any file.',
    ],
    howItWorks: [
      'Hashing uses the Web Crypto API — crypto.subtle.digest — which is the browser’s own audited implementation of these algorithms, the same primitive used for TLS. The file is read here and the digest rendered as lowercase hexadecimal.',
      'Web Crypto is only available over HTTPS or on localhost. A hashing function delivered over a connection an attacker could modify would offer no assurance at all, and that restriction is enforced by the browser rather than by this page.',
      'One thing to be clear about: a hash is a fingerprint, not encryption. It cannot be reversed, but identical input always produces identical output, so a plain hash of a common password is trivially reversed with a lookup table. Storing passwords needs a deliberately slow, salted algorithm such as bcrypt, scrypt or Argon2 — not any of these.',
    ],
    useCases: [
      'Verifying a download against the checksum its publisher published.',
      'Confirming a file transferred or copied without corruption.',
      'Proving two files are identical when their names and dates differ.',
      'Recording a fingerprint of a document as evidence it has not been altered since.',
    ],
  },
};
