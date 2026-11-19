import type { ToolExample } from '../tool-examples';

export const WORD_POWERPOINT_EXAMPLES: Record<string, ToolExample> = {
  'docx-creator': {
    title: 'Draft a short agenda and export it',
    steps: ['Replace the starter text, using H2 for a heading and the Bulleted list button for two agenda items.', 'Type a name in the document title box above the toolbar; it becomes the file name.', 'Select .docx and open the file in Word. Select .pdf if you also need a fixed copy.'],
    check: 'Check that headings and list items keep their levels in Word. The draft is saved in this browser only, and Discard draft resets the editor to the starter text. The PDF uses standard fonts that cover Latin text only, so other characters are substituted.',
  },
  'docx-to-pdf': {
    title: 'Turn a meeting brief into an A4 PDF',
    sample: { href: '/samples/meeting-brief.docx', label: 'Download the sample DOCX' },
    steps: ['Open the fictional meeting brief and find the heading, the two action items and the Owner / Action table in the Document preview.', 'Under Page setup, choose a Page size and Typeface, and leave Add page numbers in the footer ticked.', 'Select Download PDF and compare the pages with the preview.'],
    check: 'The PDF is laid out again from the content Mammoth reads, not from Word\'s own page layout, so page breaks, floating objects and custom fonts can differ. Only standard Times or Helvetica fonts are used, and characters outside Latin text are replaced with "?".',
  },
  'docx-to-html': {
    title: 'Publish a meeting brief as a web page',
    sample: { href: '/samples/meeting-brief.docx', label: 'Download the sample DOCX' },
    steps: ['Open the meeting brief and compare the Document preview with the HTML output pane.', 'Leave Complete HTML page ticked for a standalone file, or untick it for a fragment to paste into another page.', 'Select Download HTML and open the file in a browser to check the heading, list and table.'],
    check: 'The output keeps structure such as headings, lists, tables and links, not Word\'s fonts, colours or spacing. Mammoth ignores some formatting, and any warnings appear under conversion notes. Images are embedded in the file as data, which can make it large.',
  },
  'docx-to-markdown': {
    title: 'Move a meeting brief into Markdown notes',
    sample: { href: '/samples/meeting-brief.docx', label: 'Download the sample DOCX' },
    steps: ['Open the meeting brief and read the Markdown output pane beside the preview.', 'Check that the heading starts with # and each action item starts with a hyphen.', 'Look at the Owner / Action table, then select Copy or Download Markdown.'],
    check: 'Word tables without a marked header row get an empty Markdown header, so the Owner / Action row becomes the first body row. Images are written as long inline data URLs. Fonts, colours and spacing are not carried across.',
  },
  'docx-to-txt': {
    title: 'Get the plain words from a meeting brief',
    sample: { href: '/samples/meeting-brief.docx', label: 'Download the sample DOCX' },
    steps: ['Open the meeting brief and read the plain text output pane.', 'Check that each action item sits on its own line and that the table cells are separated by tabs.', 'Select Download plain text and open the .txt file in a text editor.'],
    check: 'Formatting, list markers and images are removed; only the words remain. Headers, footers and comments are not included. Use Extract Text from Word if you need those.',
  },
  'docx-extract-images': {
    title: 'Recover the pictures from a report',
    steps: ['Open a small Word document of your own that contains two or three photos or screenshots.', 'Compare each card\'s name, pixel size and file size with the pictures you inserted.', 'Select Download for one image, or Prepare all for download to collect the set.'],
    check: 'Files are copied from the document\'s media folder as stored, so a picture cropped in Word comes out uncropped. Charts and shapes drawn in Word are not pictures and are not listed.',
  },
  'docx-extract-text': {
    title: 'Choose which parts of a document to copy',
    sample: { href: '/samples/meeting-brief.docx', label: 'Download the sample DOCX' },
    steps: ['Open the meeting brief and look at the What to include panel.', 'Note which parts say none found; this sample contains body text only.', 'Untick any parts you do not need, then select Copy text or Download .txt.'],
    check: 'Comments are not ticked by default, so tick them if you want them. Body text is flattened, with table cells separated by tabs and images ignored. Headers, footers, notes and text boxes are added as labelled sections, not in their original positions.',
  },
  'docx-metadata': {
    title: 'Check what a document says about its author',
    sample: { href: '/samples/meeting-brief.docx', label: 'Download the sample DOCX' },
    steps: ['Open the meeting brief and read the Core properties section.', 'Compare the Author, Created and Modified values with a Word document of your own, which usually shows Application properties too.', 'Select Copy all to keep a text record of the properties.'],
    check: 'This viewer only reads properties; it cannot edit or remove them. Values are whatever the saving program wrote, so converters can leave fields empty. Dates are shown in your browser\'s local time.',
  },
  'word-count': {
    title: 'Check a brief against a word limit',
    sample: { href: '/samples/meeting-brief.docx', label: 'Download the sample DOCX' },
    steps: ['Open the meeting brief, or paste a paragraph of your own into the Text box.', 'Read Words, Sentences and Reading time, then edit the text and watch the counts change.', 'Check Keyword density for the main terms, then select Copy summary.'],
    check: 'Counts use the extracted text, so they can differ slightly from Word, which also counts headers and footnotes. Reading time, speaking time and pages are estimates at 238 and 140 words per minute and about 500 words a page.',
  },
  'compare-docx': {
    title: 'Find what changed between two drafts',
    steps: ['Save a copy of a short document of your own, then change one sentence and delete another in the copy.', 'Drop the first file under Original and the edited copy under Revised.', 'Read the Inline view, switch to Side by side, then tick Changes only.'],
    check: 'The comparison works on text, paragraph by paragraph, so formatting, image and layout changes are not detected. It does not produce a Word file with tracked changes; Copy diff gives a plain-text summary.',
  },
  'pptx-creator': {
    title: 'Build a three-slide update',
    steps: ['Rename the starter title slide, then use Add slide after current and keep the Layout as Title + content.', 'Type one bullet per line in the Body box and add a line under Speaker notes.', 'Untick Widescreen (16:9) if you need 4:3, then select Download .pptx and open the file in PowerPoint.'],
    check: 'Slides hold text, a background colour and an accent colour only; there is no way to add pictures, charts or tables. The draft is kept in this browser until you select Discard draft, so download the file to keep a copy.',
  },
  'pptx-to-pdf': {
    title: 'Make a handout from a short deck',
    sample: { href: '/samples/presentation-example.pptx', label: 'Download the sample presentation' },
    steps: ['Open the fictional two-slide presentation; both slides start selected.', 'Under Layout, choose One slide per page or a Handout option to place several slides on an A4 page.', 'Select the Export button and check the slide text in the PDF.'],
    check: 'Each slide is redrawn and placed in the PDF as an image, so its text cannot be selected or searched. Charts, SmartArt and animations are not re-rendered, and fonts missing from your computer are substituted.',
  },
  'pptx-to-images': {
    title: 'Export one slide as a picture',
    sample: { href: '/samples/presentation-example.pptx', label: 'Download the sample presentation' },
    steps: ['Open the sample presentation and select slide 2 to deselect it, leaving slide 1.', 'Choose PNG under Format and set Quality to 2× or higher for sharper text.', 'Select the Export button and compare the image with the slide in PowerPoint.'],
    check: 'Slides are rebuilt from the file\'s XML in the browser, so positions, fonts and effects can differ from PowerPoint. Charts, SmartArt and animations appear as labelled placeholders.',
  },
  'pptx-extract-text': {
    title: 'Copy slide text into notes',
    sample: { href: '/samples/presentation-example.pptx', label: 'Download the sample presentation' },
    steps: ['Open the sample presentation and leave Format set to Plain text.', 'Check that slide 1 shows Fictional workshop and slide 2 shows Action: Jordan confirms the room.', 'Switch Format to Markdown or JSON, then select Copy or Download.'],
    check: 'Text is read from text boxes and placeholders, slide by slide. Text in tables, charts, SmartArt and pictures is not included, and the order within a slide follows the file rather than the visual layout.',
  },
  'pptx-extract-images': {
    title: 'Collect the photos from a deck',
    steps: ['Open a presentation of your own that contains a few photos or logos.', 'Compare the listed names and sizes; the largest images are shown first.', 'Select Download for one image, or Prepare all for download for the full set.'],
    check: 'Images come straight from the media folder, so you get the stored files, including cropped-out areas and pictures used only by layouts. Video, audio, EMF and WMF files are skipped, and charts or shapes drawn in PowerPoint are not images.',
  },
  'slide-selector': {
    title: 'Keep only the action slide',
    sample: { href: '/samples/presentation-example.pptx', label: 'Download the sample presentation' },
    steps: ['Open the sample presentation; both slides start selected.', 'Type 2 in the range box and choose Select, so only slide 2 is kept.', 'Select the Export button and open the file ending in -selected in PowerPoint.'],
    check: 'Removed slides and their speaker notes are taken out, but pictures and layouts stay in the file, so it may not get much smaller. Hyperlinks or sections that pointed to removed slides are not updated.',
  },
};
