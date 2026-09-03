import type { GuideDefinition } from '../../models/guide.model';

export const guide: GuideDefinition = {
  slug: 'how-to-compress-a-pdf-without-making-text-blurry',
  title: 'How to compress a PDF without making the text blurry',
  summary:
    'Blurry text after compression means the whole page was turned into an image. Here is what is actually making your PDF large, and how to shrink it while keeping text sharp.',
  answer:
    'Text goes blurry when a compressor rasterises pages into images. Text itself takes almost no space — images do. Compress the images and leave the text as text, and the file shrinks dramatically while staying sharp and searchable.',
  keywords: [
    'compress pdf without losing quality',
    'pdf compression blurry text',
    'reduce pdf file size sharp text',
    'shrink pdf for email',
    'pdf too large to email',
  ],
  tools: ['compress-pdf', 'file-size-analyzer', 'pdf-to-images'],
  published: '2026-09-03',
  body: [
    {
      type: 'p',
      text: 'You compress a PDF, the file gets satisfyingly smaller, and the text now looks slightly soft — fuzzy at the edges, worse when you zoom, and no longer selectable. That is not aggressive compression. It is a different operation than the one you wanted.',
    },

    { type: 'h2', text: 'What made the text blurry' },
    {
      type: 'p',
      text: 'A PDF can hold text two ways. As text — glyph references and coordinates, which render sharp at any zoom and can be selected and searched. Or as pixels, if the page is a picture of text.',
    },
    {
      type: 'p',
      text: 'Some compressors take the blunt approach: render every page to an image, compress the images hard, and rebuild the PDF from those. The size drop is enormous and the result is a stack of photographs. Text is no longer text, so it blurs, cannot be selected, cannot be searched, and cannot be read by a screen reader.',
    },
    {
      type: 'note',
      title: 'Quick test',
      text: 'Try to select a sentence in the compressed file. If nothing highlights, the pages were rasterised. That is irreversible — you need to go back to the original.',
    },

    { type: 'h2', text: 'What is actually making your PDF large' },
    {
      type: 'p',
      text: 'Text is remarkably cheap. A hundred pages of prose is a few hundred kilobytes. When a PDF is large, it is almost always one of these:',
    },
    {
      type: 'ul',
      items: [
        'Scanned pages — each one a full-resolution photograph, often 2–5 MB apiece.',
        'Embedded photographs at far higher resolution than the page needs. A 4000-pixel-wide image placed in a 600-pixel-wide slot still stores all 4000 pixels.',
        'Embedded fonts, especially whole CJK families, which can run to several megabytes.',
        'Leftovers — earlier revisions, deleted objects and unused resources that were never cleaned up.',
      ],
    },
    {
      type: 'p',
      text: 'Guessing is unnecessary. Break the file into its parts and look — the [file size analyzer](/file/file-size-analyzer) lists which images, fonts and streams account for the size, so you can see whether you have an image problem or a font problem before choosing an approach.',
    },
    {
      type: 'tool',
      toolId: 'file-size-analyzer',
      text: 'Shows every part of a PDF, DOCX, XLSX, PPTX or ZIP sized in proportion.',
    },

    { type: 'h2', text: 'Compressing properly' },
    { type: 'h3', text: 'Downsample the images, keep the text' },
    {
      type: 'p',
      text: 'This is the approach that preserves quality: reduce embedded images to a sensible resolution and re-encode them, while leaving text objects untouched. Text stays vector-sharp and selectable, and the file often drops by most of its size, because the images were nearly all of it.',
    },
    {
      type: 'p',
      text: 'For a document that will only be read on screen, 150 DPI is plenty. For printing, 300 DPI. Above that you are storing detail nobody will ever see.',
    },
    {
      type: 'tool',
      toolId: 'compress-pdf',
      text: 'Compresses toward a target size while leaving text as text.',
    },
    { type: 'h3', text: 'Remove what is not needed' },
    {
      type: 'p',
      text: 'If half the document is appendices the recipient does not want, [extracting the pages that matter](/pdf/extract-pdf-pages) beats any compression setting. The smallest version of a page is the one you did not include.',
    },

    { type: 'h2', text: 'The scanned-document case' },
    {
      type: 'p',
      text: 'If your PDF is a scan, there is no text to protect — every page is already an image. Compression here is purely a quality decision, and you can be much more aggressive than you would dare with a text document.',
    },
    {
      type: 'p',
      text: 'Two things help more than the compression ratio. Scanning in greyscale rather than colour typically cuts size by half or more for ordinary documents. And scanning at 200–300 DPI rather than 600 makes an enormous difference with no visible loss on printed text.',
    },

    { type: 'h2', text: 'When you cannot get it small enough' },
    {
      type: 'p',
      text: 'Email limits are usually 20–25 MB, and attachments are base64-encoded in transit, which inflates them by about a third. A 20 MB file can therefore fail a 25 MB limit.',
    },
    {
      type: 'ul',
      items: [
        'Split the document and send it in parts — [splitting a PDF](/pdf/split-pdf) at chapter boundaries is usually more useful to the recipient anyway.',
        'Send only the relevant pages.',
        'Share a link rather than an attachment, if the content permits it.',
      ],
    },

    { type: 'h2', text: 'What to check afterwards' },
    {
      type: 'ol',
      items: [
        'Select a sentence. If it highlights, your text is still text.',
        'Zoom to 400% and look at an edge. Sharp means vector; soft means rasterised.',
        'Check any photograph at full size — this is where over-compression shows first, as blotchy patches.',
        'Confirm the page count matches the original.',
      ],
    },
    {
      type: 'p',
      text: 'Keep the original until you have done all four. Compression is lossy, and there is no way back from a rasterised page.',
    },
  ],
};
