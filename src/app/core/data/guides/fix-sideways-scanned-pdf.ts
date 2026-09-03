import type { GuideDefinition } from '../../models/guide.model';

export const guide: GuideDefinition = {
  slug: 'how-to-fix-a-sideways-scanned-pdf',
  title: 'How to fix a sideways or upside-down scanned PDF',
  summary:
    'Rotating pages so the fix sticks in every reader and when printed — including why some documents look right on screen and come out wrong on paper.',
  answer:
    'Rotate the pages and save the result, so the rotation is written into the file itself. A reader’s own rotate button only changes your view and is not saved, which is why a document can look correct on screen and still print sideways.',
  keywords: [
    'rotate scanned pdf',
    'fix sideways pdf',
    'pdf upside down',
    'rotate pdf pages permanently',
    'pdf prints sideways',
  ],
  tools: ['rotate-pdf', 'organize-pdf', 'pdf-viewer'],
  published: '2026-09-03',
  body: [
    {
      type: 'p',
      text: 'A batch of pages went through the feeder the wrong way, or a book was scanned in landscape. Now half the document needs your head tilted, and rotating it in your PDF reader does not seem to stick.',
    },

    { type: 'h2', text: 'Why the reader’s rotate button does not save' },
    {
      type: 'p',
      text: 'Most readers offer a rotate control that changes how the page is displayed to you. It is a view setting, held in the application, not a change to the document. Close the file and it is gone; send it to someone else and they see the original orientation.',
    },
    {
      type: 'p',
      text: 'A PDF page carries its own rotation attribute, and that is what needs changing. Written into the file, it is honoured by every reader and by the printer.',
    },
    {
      type: 'note',
      title: 'The classic symptom',
      text: 'The document looks fine on your screen and prints sideways. That means you rotated the view at some point and the file itself was never changed.',
    },

    { type: 'h2', text: 'Fixing it properly' },
    {
      type: 'p',
      text: 'Rotate the pages that need it and save a new document. Because rotation is a page attribute rather than a re-rendering, nothing is degraded: text stays sharp and selectable, images are untouched, and the file size barely moves.',
    },
    {
      type: 'tool',
      toolId: 'rotate-pdf',
      text: 'Rotate selected pages or the whole document, written into the PDF itself.',
    },

    { type: 'h2', text: 'When only some pages are wrong' },
    {
      type: 'p',
      text: 'Scanners produce this constantly — a few sheets fed in the wrong orientation, or landscape tables in an otherwise portrait report. Rotating everything would fix those pages and break the rest.',
    },
    {
      type: 'p',
      text: 'Select the affected pages individually. For a document with several different problems at once — some pages rotated, some out of order, a few blank ones to remove — the [page organiser](/pdf/organize-pdf) handles all of it in a single editing session with undo, which is far less tedious than three separate passes.',
    },
    {
      type: 'tool',
      toolId: 'organize-pdf',
      text: 'Reorder, rotate, duplicate and delete pages as thumbnails, with full undo.',
    },

    { type: 'h2', text: 'Which way to rotate' },
    {
      type: 'p',
      text: 'Easy to get backwards, and easy to check: if the top of the text points to the right edge of the screen, rotate anticlockwise. If it points to the left edge, rotate clockwise. Upside down needs 180 degrees either way.',
    },
    {
      type: 'p',
      text: 'Work from thumbnails rather than one page at a time. Seeing the whole document at once makes the pattern obvious — usually every second page, or one run of them.',
    },

    { type: 'h2', text: 'Related scanning problems' },
    { type: 'h3', text: 'Pages in the wrong order' },
    {
      type: 'p',
      text: 'Double-sided scanning on a single-sided feeder gives you all the fronts, then all the backs. The pages need interleaving, not rotating — [reordering](/pdf/reorder-pdf-pages) does it, and reversing the whole document in one click is often the first step.',
    },
    { type: 'h3', text: 'Slightly skewed rather than rotated' },
    {
      type: 'p',
      text: 'A page a few degrees off is a different problem. Page rotation only works in ninety-degree steps, so straightening a slight skew means deskewing the image, which scanning software usually offers. Rescanning is often faster than fixing it.',
    },
    { type: 'h3', text: 'Blank pages between every sheet' },
    {
      type: 'p',
      text: 'The back of single-sided originals, captured by a duplex scanner. [Deleting those pages](/pdf/delete-pages-from-pdf) by range is quicker than clicking each one.',
    },
    { type: 'h3', text: 'The file is enormous' },
    {
      type: 'p',
      text: 'Every scanned page is a full-resolution photograph, so scans are large by nature. Rotating does not change that — see [compressing a PDF without making the text blurry](/guides/how-to-compress-a-pdf-without-making-text-blurry) for the right way to shrink one.',
    },

    { type: 'h2', text: 'You still cannot search it' },
    {
      type: 'p',
      text: 'Rotating fixes orientation, not readability. A scan is an image of text with no text layer, so it remains unsearchable and its content cannot be copied or converted. Making it searchable requires OCR, which is a different technology and not included here.',
    },
    {
      type: 'p',
      text: 'The test is simple: try to select a sentence. If nothing highlights, there is no text in the file, however clear it looks.',
    },

    { type: 'h2', text: 'Check before you discard the original' },
    {
      type: 'ol',
      items: [
        'Scroll the whole document — a fix applied to the wrong range is easy to miss.',
        'Print one page, or use print preview. This is where view-only rotation reveals itself.',
        'Confirm the page count is unchanged.',
      ],
    },
  ],
};
