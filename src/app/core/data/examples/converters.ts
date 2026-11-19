import type { ToolExample } from '../tool-examples';

export const CONVERTER_EXAMPLES: Record<string, ToolExample> = {
  'excel-to-pdf': {
    title: 'Print an order sheet as a PDF table',
    sample: { href: '/samples/date-export.xlsx', label: 'Download the sample workbook' },
    steps: ['Open the fictional workbook and check the Orders sheet in the Data preview.', 'Choose A4, Portrait and keep Repeat the header row on every page ticked.', 'Select Create PDF and compare the Excel date column with the ISO date text column.'],
    check: 'Check that order 00123 keeps its leading zeros and that both date columns agree. Only cell values are printed, not charts or cell colours, and rows above the Row limit are left out with a note. The standard PDF fonts cover Latin text only, so other characters are substituted.',
  },
  'markdown-to-pdf': {
    title: 'Typeset a short agenda',
    steps: ['Paste "# Agenda", a blank line, then "- Confirm the room" and "- Prepare **samples**".', 'Choose a Page size and Typeface, and tick Page numbers in the footer if you need them.', 'Select Download PDF and check the heading, the two bullets and the bold word.'],
    check: 'Text in the PDF stays selectable. Markdown images are not fetched; they appear as their alt text in square brackets. Characters outside the standard PDF fonts, such as emoji, are replaced and a warning says how many.',
  },
  'markdown-to-docx': {
    title: 'Turn meeting notes into a Word file',
    steps: ['Paste "## Actions", a blank line, then "1. Jordan confirms the room" and "2. Casey prepares samples".', 'Choose a Typeface and Body size for the document.', 'Select Download Word, open the file in Word and check the heading style and the numbered list.'],
    check: 'Headings use Word Heading styles and block quotes use the Quote style, so the result stays editable. Markdown images are not fetched; they become their alt text in square brackets. Raw HTML blocks in the Markdown are dropped.',
  },
  'markdown-to-html': {
    title: 'Get a fragment for a CMS',
    steps: ['Paste "# Agenda", a blank line, then "- Confirm the room" and "- Prepare **samples**".', 'Untick Complete HTML page to get a bare fragment.', 'Check that the output is an h1 heading and a ul list with <strong>samples</strong>, then select Copy.'],
    check: 'Leave Complete HTML page ticked for a standalone file with styles in the head. Images become their alt text in square brackets rather than img tags, and raw HTML blocks in the Markdown are dropped.',
  },
  'html-to-markdown': {
    title: 'Convert a short web snippet',
    steps: ['Paste <h2>Room booking</h2><p>Ask <strong>Jordan</strong> by <a href="https://example.com">email</a>.</p>.', 'Check the Markdown output: "## Room booking", then "Ask **Jordan** by [email](https://example.com).".', 'Select Copy, or Download Markdown for a .md file.'],
    check: 'Styles, scripts and layout wrappers are dropped. Only links starting with http, https, mailto or tel keep their address, and only images embedded as data URLs are kept; linked images are left out.',
  },
  'html-to-pdf': {
    title: 'Make a PDF from a small HTML table',
    steps: ['Paste <h1>Room booking</h1> followed by a table with th cells Owner and Action and one row: Jordan, Confirm room.', 'Check the Preview, then choose a Page size, Typeface and Margin.', 'Select Download PDF and confirm that the table header row is shaded and the text is selectable.'],
    check: 'Scripts never run and stylesheets are not applied; only basic inline formatting such as bold, italic, colour and alignment carries over. Images are included only when embedded as data URLs. Characters outside the standard PDF fonts are substituted.',
  },
  'html-to-docx': {
    title: 'Hand an email template to a colleague',
    steps: ['Paste <h1>Workshop update</h1><p>The room is <em>confirmed</em>.</p><ul><li>Bring a laptop</li></ul>.', 'Choose a Typeface and Body size, and tick Page numbers in the footer if wanted.', 'Select Download Word and check the Heading 1, the italic word and the bullet in Word.'],
    check: 'CSS layout, scripts and forms are not carried over. Images are embedded only when the HTML contains them as data URLs. A table row becomes a header row only when every cell in it is a th.',
  },
  'txt-to-pdf': {
    title: 'Archive a short log file',
    steps: ['Paste three lines of a fictional log, such as "09:00 Backup started", "09:05 Backup finished" and "09:06 Report sent".', 'Tick Monospaced with line numbers to keep each line separate and numbered.', 'Select Download PDF and check that long lines wrap onto the next line.'],
    check: 'Without Monospaced with line numbers, single line breaks are joined into paragraphs and only blank lines start a new one. Characters outside the standard PDF fonts are replaced with a warning.',
  },
  'csv-to-json': {
    title: 'Convert a small order list',
    steps: ['Paste "order,customer,paid", then "00123,Jordan,true" and "00124,Casey,false".', 'Keep First row is the header and Convert numbers and booleans to real types ticked.', 'Check that each record has "order": "00123" as text and "paid": true as a boolean, then select Download JSON.'],
    check: 'Values with leading zeros, and numbers longer than 15 digits, stay as text so they are not damaged. Empty cells become null. Dates are not detected; they stay as text, and every record is flat.',
  },
  'json-to-csv': {
    title: 'Flatten records with nested fields',
    steps: ['Paste [{"name":"Jordan","address":{"city":"Leeds"},"tags":["admin","editor"]},{"name":"Casey","email":"casey@example.com"}].', 'Check the columns name, address.city, tags and email in the Parsed data table.', 'Keep the Comma delimiter and select Download CSV.'],
    check: 'Jordan has no email and Casey has no city, so those cells are blank. A list of simple values is joined with commas into one quoted cell; a list of objects is written as JSON text in one cell.',
  },
  'image-converter': {
    title: 'Convert a few images to WebP',
    steps: ['Drop two or three small images of your own; the Format starts at WebP.', 'Set Quality to about 80% and leave Max size at original, or lower it to cap the longest side.', 'Select Convert and compare the Before, After and Change figures.'],
    check: 'Max size only shrinks images; it never enlarges them. If this browser cannot encode WebP or AVIF, the files are saved as PNG and the names say so. Animated images are converted as a single frame.',
  },
  'svg-to-png': {
    title: 'Rasterise an icon at double size',
    steps: ['Drop a small SVG icon of your own that has width and height or a viewBox.', 'Set Scale to 2× and keep Keep transparency ticked.', 'Select Convert and check the PNG dimensions are twice the SVG size and the background is transparent.'],
    check: 'The output size comes from the SVG width and height, or from its viewBox when they are missing. Untick Keep transparency to fill a Background colour instead.',
  },
  'png-to-webp': {
    title: 'Shrink a screenshot for a web page',
    steps: ['Drop a PNG screenshot of your own.', 'Leave Quality at 85% and keep Keep transparency ticked.', 'Select Convert and compare the file size before and after.'],
    check: 'Compare small text in the result with the original before replacing anything. Savings vary, and the Change figure shows if a file did not get smaller. Browsers that cannot encode WebP fall back to PNG.',
  },
  'jpg-to-png': {
    title: 'Make a lossless copy of a photo',
    steps: ['Drop a JPEG photo of your own.', 'Leave the Format at PNG — lossless.', 'Select Convert and compare the sizes in the result.'],
    check: 'Expect the PNG to be larger than the JPEG. Converting cannot restore detail that JPEG compression already removed, and the photo has no transparency to keep.',
  },
  'webp-to-jpg': {
    title: 'Save a WebP for an upload form',
    steps: ['Drop a WebP image of your own, ideally one with a transparent area.', 'Choose a Background colour and leave Quality at 85%.', 'Select Convert and check that the transparent area is filled with your colour.'],
    check: 'JPEG cannot store transparency, so it is always flattened onto the Background colour. An animated WebP is converted as a single frame.',
  },
  'webp-to-png': {
    title: 'Keep a logo transparent',
    steps: ['Drop a WebP logo of your own with a transparent background.', 'Keep Keep transparency ticked.', 'Select Convert and place the PNG over a coloured background to check the edges.'],
    check: 'PNG is lossless, so the file is often larger than the WebP. Untick Keep transparency only if you want a solid Background colour.',
  },
  'heic-to-jpg': {
    title: 'Convert an iPhone photo for Windows',
    steps: ['Drop a .heic photo of your own; a decoder of about three megabytes is fetched the first time.', 'Leave Quality at 85% and Max size at original.', 'Select Convert and open the JPEG to check colours and orientation.'],
    check: 'The decoder runs in this tab and the photo is not uploaded. A truncated file, or a video frame rather than a photograph, cannot be decoded and shows an error.',
  },
  'resize-image': {
    title: 'Resize photos to 1280 pixels wide',
    steps: ['Drop one or two photos of your own and choose Exact dimensions.', 'Enter 1280 for Width (px) and keep Lock the aspect ratio ticked.', 'Select Resize and check the new dimensions in the result.'],
    check: 'With the ratio locked, each image keeps its own proportions. Exact dimensions and Percentage of the original can enlarge an image, which adds no detail; Longest edge only shrinks.',
  },
  'crop-image': {
    title: 'Crop a square profile picture',
    steps: ['Drop a photo of your own and choose Square 1:1.', 'Drag the box over the face, or type X, Y, Width and Height under Exact bounds.', 'Keep PNG or choose JPEG, then select the Crop to button and check the result.'],
    check: 'One image is cropped at a time, and the crop box is at least 16 pixels on each side. The crop is not resized; use Resize Image afterwards for a fixed pixel size.',
  },
  'case-converter': {
    title: 'Fix a heading and make an identifier',
    steps: ['Paste "the cost of a good name" and choose Title Case.', 'Check that it reads "The Cost of a Good Name", with minor words kept lower case.', 'Choose snake_case for "customer order ref" and check that it reads customer_order_ref.'],
    check: 'Sentence case and Title Case lower-case the rest of each word, so names and acronyms such as BBC need correcting by hand. Programmer styles are applied line by line.',
  },
};
