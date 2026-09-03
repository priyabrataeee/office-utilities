import type { GuideDefinition } from '../../models/guide.model';

export const guide: GuideDefinition = {
  slug: 'how-to-extract-text-from-a-pdf',
  title: 'How to extract text from a PDF',
  summary:
    'Getting clean, usable text out of a PDF — why copy and paste produces a mess, why columns come out interleaved, and what to do when there is no text in the file at all.',
  answer:
    'Use a tool that reads the PDF text layer and rejoins lines that the layout wrapped. Copy and paste fails because a PDF stores text as positioned fragments, so pasted output arrives broken at every visual line end.',
  keywords: [
    'extract text from pdf',
    'copy text from pdf',
    'pdf to text',
    'get text out of pdf',
    'pdf text extraction',
  ],
  tools: ['pdf-to-text', 'pdf-to-word', 'pdf-viewer'],
  published: '2026-09-03',
  body: [
    {
      type: 'p',
      text: 'Selecting a few paragraphs in a PDF and pasting them elsewhere produces text broken at the end of every visual line, with hyphens stranded mid-word and headers and page numbers scattered through it. For more than a paragraph or two, it is unusable.',
    },

    { type: 'h2', text: 'Why copy and paste produces a mess' },
    {
      type: 'p',
      text: 'A PDF does not store paragraphs. It stores instructions to draw text at coordinates — often one fragment per word, sometimes per character, in whatever order suited the generator. The visual line breaks you see are a consequence of where things were placed, not markers in the content.',
    },
    {
      type: 'p',
      text: 'When you copy, you get those fragments in roughly positional order with a line break at each visual line end. The paragraph structure was never in the file to be copied.',
    },

    { type: 'h2', text: 'What a proper extraction does' },
    {
      type: 'p',
      text: 'A dedicated tool reads the same text layer but reconstructs from it, which is where the difference lies:',
    },
    {
      type: 'ul',
      items: [
        'Rejoins wrapped lines into paragraphs, using line spacing and indentation to work out where a paragraph really ends.',
        'Reinstates spaces between words, which PDFs frequently omit because each word was positioned separately rather than separated by a space character.',
        'Removes running headers and footers repeated on most pages — the page furniture that otherwise appears every page or so in your output.',
        'Keeps reading order for single-column documents.',
      ],
    },
    {
      type: 'tool',
      toolId: 'pdf-to-text',
      text: 'Extracts clean plain text, with line rejoining and header removal switchable.',
    },

    { type: 'h2', text: 'When there is no text to extract' },
    {
      type: 'p',
      text: 'Open the PDF and try to select a sentence. If nothing highlights, the file contains no text — it is a scan, a photograph of a page.',
    },
    {
      type: 'p',
      text: 'No extraction tool can help, because there is nothing to read. Getting text out requires optical character recognition, which examines the image and recognises letter shapes. That is a genuinely different technology, and not every tool includes it — this one does not.',
    },
    {
      type: 'note',
      tone: 'warn',
      title: 'How to recognise a scan quickly',
      text: 'Text cannot be selected, the file is unusually large for its page count, and zooming in makes the letters soft rather than sharp. Any one of those is a strong signal; all three is certain.',
    },

    { type: 'h2', text: 'Why columns come out interleaved' },
    {
      type: 'p',
      text: 'Two-column documents — academic papers, newsletters, some reports — often extract as alternating fragments from each column. This is not a bug so much as an unanswerable question.',
    },
    {
      type: 'p',
      text: 'The file records glyphs at coordinates. Reading left to right across the page is a perfectly reasonable interpretation; so is reading down one column then the other. Nothing in the file says which is correct, so extraction picks one and sometimes picks wrong.',
    },
    {
      type: 'p',
      text: 'The practical workaround is to extract a page at a time and reassemble, or to select one column at a time in a viewer where you can see what you are selecting.',
    },

    { type: 'h2', text: 'Choosing the right output' },
    {
      type: 'p',
      text: 'What you plan to do with the text should decide the format.',
    },
    {
      type: 'ul',
      items: [
        'Plain text — for quoting, searching, feeding into another tool, or reading without formatting. The most reliable option, because there is nothing to go wrong.',
        'Word — when you need an editable formatted document. Structure is inferred rather than read, so expect to tidy; there is more in [converting PDF to Word without losing formatting](/guides/how-to-convert-pdf-to-word-without-losing-formatting).',
        'Images — when you want the page as it looks rather than what it says. [Rasterising pages](/pdf/pdf-to-images) is the right tool for that.',
      ],
    },
    {
      type: 'p',
      text: 'If you only need the words, take plain text. Converting to Word to get at the text and then stripping the formatting is a longer route to a worse result.',
    },

    { type: 'h2', text: 'Practical tips' },
    { type: 'h3', text: 'Extract only the pages you need' },
    {
      type: 'p',
      text: 'For a few pages out of a long report, [extract those pages](/pdf/extract-pdf-pages) first. Less output means less to clean up.',
    },
    { type: 'h3', text: 'Watch for hyphenation' },
    {
      type: 'p',
      text: 'Justified text often breaks words across lines. Rejoining lines can leave a hyphen mid-word — worth a find-and-replace pass if the document was typeset that way.',
    },
    { type: 'h3', text: 'Check the beginning and the end' },
    {
      type: 'p',
      text: 'Extraction problems cluster at page boundaries and around headers. If the first and last paragraphs of a few pages read correctly, the middle almost certainly did too.',
    },

    { type: 'h2', text: 'A note on where this runs' },
    {
      type: 'p',
      text: 'Text extraction is a natural fit for the browser: the PDF is parsed in the tab and the text never leaves your device. That matters more than it sounds, because the documents people extract from — contracts, statements, reports — are often the ones worth not uploading. See [is it safe to use online PDF converters?](/guides/is-it-safe-to-use-online-pdf-converters) for how to verify a tool actually works that way.',
    },
  ],
};
