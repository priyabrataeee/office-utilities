import type { GuideDefinition } from '../../models/guide.model';

export const guide: GuideDefinition = {
  slug: 'how-to-split-a-pdf-by-chapter',
  title: 'How to split a PDF by chapter',
  summary:
    'Breaking a long PDF into sections — how to find the right page boundaries quickly, and when splitting is the wrong tool for what you actually want.',
  answer:
    'Find the page each chapter starts on using the bookmarks or the thumbnail rail, then split at those pages. Splitting produces one file per section; if you only want a few chapters, extracting those pages is cleaner than splitting and discarding the rest.',
  keywords: [
    'split pdf by chapter',
    'split pdf into sections',
    'break up large pdf',
    'divide pdf into parts',
    'split pdf at specific pages',
  ],
  tools: ['split-pdf', 'extract-pdf-pages', 'pdf-viewer', 'organize-pdf'],
  published: '2026-09-03',
  body: [
    {
      type: 'p',
      text: 'A 400-page report where each department only needs its own section. A scanned book you want as separate chapters. A contract where the annexes should be circulated separately. The operation is simple; getting the boundaries right is the part that takes the time.',
    },

    { type: 'h2', text: 'Find the boundaries first' },
    {
      type: 'p',
      text: 'Splitting is quick. Working out which page each chapter begins on is what people spend time on, and there are faster routes than scrolling.',
    },
    { type: 'h3', text: 'Use the bookmarks if there are any' },
    {
      type: 'p',
      text: 'A PDF produced from a properly styled Word document usually has bookmarks generated from its headings, and each one points at a page. That is your chapter list, already made. Open the document and read the page numbers off the outline.',
    },
    { type: 'h3', text: 'Use the thumbnail rail' },
    {
      type: 'p',
      text: 'Chapter openings look different from body pages — more white space, a large heading, often starting on a right-hand page. Scanning a grid of thumbnails finds them far faster than paging through.',
    },
    {
      type: 'tool',
      toolId: 'pdf-viewer',
      text: 'Thumbnail rail, full-text search and page navigation for finding boundaries.',
    },
    { type: 'h3', text: 'Search for the heading text' },
    {
      type: 'p',
      text: 'If the PDF has a text layer, searching for "Chapter" or a known section title jumps straight to each occurrence with its page number. Fastest of the three when it works.',
    },
    {
      type: 'note',
      title: 'Watch the page numbering',
      text: 'Printed page numbers rarely match PDF page numbers. Front matter means page 1 of the book is often page 9 of the file. Always work from the PDF page number the viewer shows, not the number printed on the page.',
    },

    { type: 'h2', text: 'Three ways to split' },
    { type: 'h3', text: 'At chosen page breaks' },
    {
      type: 'p',
      text: 'The one you want for chapters. Give it the pages where each new section begins, and you get one document per section.',
    },
    { type: 'h3', text: 'Into fixed-size chunks' },
    {
      type: 'p',
      text: 'Every 50 pages, say. Useful for getting a huge file under an upload limit, and useless for chapters, since content does not fall into equal parts.',
    },
    { type: 'h3', text: 'One file per page' },
    {
      type: 'p',
      text: 'Right for a stack of scanned single-page documents — invoices, receipts, certificates — that were scanned in one pass.',
    },
    {
      type: 'tool',
      toolId: 'split-pdf',
      text: 'Split at chosen breaks, into fixed chunks, or one file per page — with a preview of every result.',
    },

    { type: 'h2', text: 'When splitting is the wrong tool' },
    {
      type: 'p',
      text: 'If you want three chapters out of twelve, splitting produces twelve files so you can throw away nine. [Extracting pages](/pdf/extract-pdf-pages) gives you only what you asked for, and the original is untouched either way.',
    },
    {
      type: 'p',
      text: 'If the document is in the wrong order — a double-sided scan with all fronts then all backs — splitting will faithfully preserve the mess. Fix the order first with the [page organiser](/pdf/organize-pdf), then split.',
    },

    { type: 'h2', text: 'What happens to the document' },
    {
      type: 'ul',
      items: [
        'Text stays text. Pages are copied, not re-rendered, so nothing becomes blurry and everything stays selectable.',
        'Each part keeps only its own pages’ content, so the pieces are much smaller than the whole.',
        'Bookmarks pointing outside a part become meaningless in that part — expected, and rarely a problem.',
        'Internal links to other chapters cannot follow across files. If cross-references matter, splitting may be the wrong approach entirely.',
        'The original is never modified.',
      ],
    },

    { type: 'h2', text: 'Practical points' },
    { type: 'h3', text: 'Check before you download' },
    {
      type: 'p',
      text: 'Preview each resulting document and look at its first page. An off-by-one boundary — the last page of chapter two heading chapter three — is obvious in a preview and annoying to discover later.',
    },
    { type: 'h3', text: 'Take the ZIP' },
    {
      type: 'p',
      text: 'A split into fifteen parts means fifteen downloads. Taking them as a single archive is faster and keeps them together.',
    },
    { type: 'h3', text: 'Name them as you go' },
    {
      type: 'p',
      text: 'Files named part-1 through part-15 are unhelpful within a week. If you are circulating them, renaming to the chapter titles is worth the two minutes — [batch renaming](/file/batch-file-rename) handles it if there are many.',
    },

    { type: 'h2', text: 'A note on privacy' },
    {
      type: 'p',
      text: 'Splitting is a structural operation a browser can do entirely on its own, which matters because the documents people split — contracts, reports, statements — are often confidential. Load the page, disconnect, and split anyway: if it works, nothing was uploaded. There is more in [is it safe to use online PDF converters?](/guides/is-it-safe-to-use-online-pdf-converters).',
    },
  ],
};
