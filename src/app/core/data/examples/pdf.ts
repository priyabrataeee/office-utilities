import type { ToolExample } from '../tool-examples';

const BRIEF = { href: '/samples/bookmarked-brief.pdf', label: 'Download the sample PDF' } as const;

export const PDF_EXAMPLES: Record<string, ToolExample> = {
  'split-pdf': {
    title: 'Split a two-page brief into single pages',
    sample: BRIEF,
    steps: ['Open the sample PDF and choose Every page.', 'Check that the plan lists two documents, then choose Split into 2 PDFs.', 'Open bookmarked-brief-page-1.pdf and confirm it holds only the Overview page.'],
    check: 'Pages are copied without re-encoding, so text stays selectable. The Overview bookmark in the sample is not carried into the parts. A protected PDF asks for its password before it can be split.',
  },
  'organize-pdf': {
    title: 'Duplicate, move and turn pages in one session',
    sample: BRIEF,
    steps: ['Open the sample PDF and use the duplicate button on page 1.', 'Drag the copy to the end, then select page 2 and press Right. Use Undo if you change your mind.', 'Choose Save organised PDF and check the three pages in a PDF viewer.'],
    check: 'Nothing is written until you save. Each page keeps its own size, so the sample still mixes A4 and US Letter. Bookmarks such as the sample’s Overview entry are not kept in the saved copy.',
  },
  'rotate-pdf': {
    title: 'Turn one page without touching the rest',
    sample: BRIEF,
    steps: ['Open the sample PDF and click the page 2 thumbnail to select it.', 'Press Right once and check that only that thumbnail turns.', 'Choose Save rotated PDF and confirm page 2 opens sideways in your PDF viewer.'],
    check: 'With nothing selected, Left and Right turn every page. Rotation works in 90° steps and is added to any rotation the page already had; it does not straighten a slightly crooked scan. Bookmarks are not kept in the saved copy.',
  },
  'delete-pdf-pages': {
    title: 'Remove the last page of a brief',
    sample: BRIEF,
    steps: ['Open the sample PDF, type 2 in the range box and choose Select.', 'Check that one page is marked as selected, then choose Delete selected pages.', 'Open the -trimmed copy and confirm that only the Overview page remains.'],
    check: 'At least one page must remain; the tool will not delete every page. Your original file is not changed. The trimmed copy does not keep the sample’s Overview bookmark.',
  },
  'reorder-pdf-pages': {
    title: 'Reverse the page order of a short document',
    sample: BRIEF,
    steps: ['Open the sample PDF and press Reverse.', 'Check that the Action page is now first and its card shows was 2.', 'Choose Save reordered PDF, or press Original order to undo the change.'],
    check: 'You can also drag thumbnails or use the arrow buttons on each card. Pages keep their own sizes, so the reordered sample still mixes A4 and US Letter. Bookmarks are not kept in the saved copy.',
  },
  'extract-pdf-pages': {
    title: 'Save one page as a new PDF',
    sample: BRIEF,
    steps: ['Open the sample PDF and click the page 1 thumbnail to select it.', 'Leave Save each page as its own PDF unticked and choose Extract selected pages.', 'Open the -extracted copy and confirm it contains the single A4 Overview page.'],
    check: 'Rotations made on this screen are not applied to extracted pages; use Rotate PDF for that. The extracted copy does not include the Overview bookmark. Tick the checkbox if you want one PDF per selected page.',
  },
  'images-to-pdf': {
    title: 'Turn photos of a document into one PDF',
    steps: ['Add two or three photos or scans that you are allowed to use.', 'Choose A4, Match each image and a margin, then drag the thumbnails into order or use Sort by name.', 'Choose Create PDF from the images and check each page in a PDF viewer.'],
    check: 'Each image becomes one page and is scaled down to fit inside the margin, never enlarged. Fit to image sizes each page to its picture instead. Text in the photos is not searchable or selectable, because there is no OCR.',
  },
  'pdf-to-word': {
    title: 'Recover editable text from a short PDF',
    sample: BRIEF,
    steps: ['Open the sample PDF; the text is read as soon as it loads.', 'Compare the Document preview with the Extracted text and adjust options such as Join wrapped lines.', 'Choose Download Word and open the .docx to check both lines of text.'],
    check: 'Headings, lists and paragraphs are inferred from text positions and font sizes, so check them before relying on the document. Images, tables, multi-column layouts and exact page design do not survive. A scanned PDF without a text layer cannot be converted, because there is no OCR.',
  },
  'pdf-to-text': {
    title: 'Copy the text out of a brief',
    sample: BRIEF,
    steps: ['Open the sample PDF and read the Extracted text panel.', 'Use Copy, or choose Download text to save a .txt file.', 'Open the file and check both lines: the Overview line and the Action line.'],
    check: 'The download follows the options you tick: Join wrapped lines rebuilds paragraphs, and Mark page breaks adds a “--- Page 2 ---” line between pages. Remove running headers drops lines repeated across most pages, so check the list of removed lines. Scanned pages have no text layer and there is no OCR; password-protected PDFs need unlocking first.',
  },
  'pdf-to-images': {
    title: 'Save each page as a PNG',
    sample: BRIEF,
    steps: ['Open the sample PDF; both pages start selected.', 'Choose PNG and Good (150 DPI), then press Convert 2 pages.', 'Use Download all (ZIP) and check both page images.'],
    check: 'Each page becomes a flat picture, so its text is no longer selectable or searchable. Print (300 DPI) gives sharper images but needs much more memory on large pages. JPEG and WebP get a white background and a Quality slider.',
  },
  'watermark-pdf': {
    title: 'Stamp CONFIDENTIAL on one page only',
    sample: BRIEF,
    steps: ['Open the sample PDF and keep the Text tab with CONFIDENTIAL.', 'Adjust Opacity and Rotation, untick Every page (2) and enter 2 in Pages.', 'Choose Add watermark and check that only page 2 is stamped.'],
    check: 'The live preview shows page 1 only and is approximate. The watermark is drawn into the page content, so Remove Watermark from PDF will not detect it later. Text watermarks use a standard Helvetica Bold font, so letters outside basic Latin may not work.',
  },
  'remove-watermark-pdf': {
    title: 'Check what kind of watermark you have',
    steps: ['Open a watermarked PDF that you are allowed to change.', 'Review the candidates found, or, if none are found, position the cover with the Left, Bottom, Width and Height sliders.', 'Choose Clean PDF and check the -clean copy page by page.'],
    check: 'Only stamp or watermark annotations and repeated objects with watermark-like names are detected. Watermarks drawn into the page content, including those added by Add Watermark to PDF, are not found. The cover option paints a box over the same area on every page; it hides content but does not remove it from the file.',
  },
  'protect-pdf': {
    title: 'Put an open password on a brief',
    sample: BRIEF,
    steps: ['Open the sample PDF and enter a fictional password such as Example-Brief-2026 in both fields.', 'Under What readers may do, leave Printing ticked and Copying text unticked, then choose Protect PDF.', 'Open the -protected copy and confirm your PDF viewer asks for the password.'],
    check: 'The password cannot be recovered, so store it somewhere safe before sharing the file. Permissions are respected by compliant readers but are not a hard guarantee. Without a separate owner password, the open password is also used as the owner password.',
  },
  'unlock-pdf': {
    title: 'Remove a password you already know',
    steps: ['Open the -protected copy made with Protect PDF, or another PDF whose password you know.', 'Enter the password and choose Unlock PDF.', 'Open the -unlocked copy and check that no password is requested.'],
    check: 'This tool needs the correct password; it does not guess or bypass one. The unlocked copy is rebuilt page by page and keeps only the title and author, so bookmarks are lost. An unencrypted PDF shows a notice that there is nothing to unlock.',
  },
  'pdf-to-excel': {
    title: 'Pull a simple table into a workbook',
    steps: ['Open a small text-based PDF with a table that you are allowed to use.', 'In What will be written, check the columns; untick The first row holds the column names if the table has no header.', 'Choose Download Excel workbook and compare a few totals with the PDF.'],
    check: 'Columns are inferred from where the text sits, so wrapped or merged cells can land in the wrong column. Pages of prose are exported as a single column of lines. Scanned PDFs have no text layer and there is no OCR.',
  },
  'pdf-to-csv': {
    title: 'Keep identifiers intact in a CSV export',
    steps: ['Open a small text-based PDF with a table that includes an identifier such as 00123.', 'Untick Convert figures to real numbers, so they can be totalled, and choose a Delimiter.', 'Choose Download CSV and inspect it in a text editor before opening it in a spreadsheet.'],
    check: 'With figure conversion ticked, 00123 becomes 123 and amounts in brackets become negative numbers. Columns are inferred from text positions, so check wrapped or merged cells. Scanned PDFs cannot be read because there is no OCR.',
  },
  'pdf-to-powerpoint': {
    title: 'Turn a two-page PDF into slides',
    sample: BRIEF,
    steps: ['Open the sample PDF and keep Match the PDF page — nothing cropped.', 'Leave Copy each page’s text into the speaker notes ticked and choose Build the presentation.', 'Open the .pptx and check both slides and the notes under each.'],
    check: 'Each slide is a picture of the page, so its text cannot be edited in PowerPoint. The slide size follows page 1; the sample’s second page is US Letter rather than A4, so it may show narrow margins. Speaker notes need a text layer.',
  },
  'sign-pdf': {
    title: 'Place a typed signature with a date',
    sample: BRIEF,
    steps: ['Open the sample PDF, choose Type and enter a fictional name such as Jordan Reyes.', 'Use Next to show page 2, click where the signature should go and tick Add a dated line under the signature.', 'Choose Sign and download and check the position in the -signed copy.'],
    check: 'This places a picture of a signature; it is not a certificate-backed digital signature and does not prove who applied it. Each run signs only the page shown, so repeat with the signed copy for another page. The typed style depends on the handwriting fonts installed on your device.',
  },
};
