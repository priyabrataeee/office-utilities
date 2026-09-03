import type { GuideDefinition } from '../../models/guide.model';

export const guide: GuideDefinition = {
  slug: 'how-to-convert-word-to-pdf-and-keep-your-fonts',
  title: 'How to convert Word to PDF and keep your fonts',
  summary:
    'Why a converted document reflows or changes typeface, how font embedding actually works, and what to do when the PDF does not match what you saw in Word.',
  answer:
    'A PDF looks wrong when the converter did not have your font and substituted a different one, which changes character widths and reflows the text. Using widely available fonts, or converting somewhere that has yours, keeps the layout intact.',
  keywords: [
    'convert word to pdf keep formatting',
    'word to pdf font changed',
    'pdf fonts different from word',
    'word to pdf layout shifted',
    'embed fonts in pdf',
  ],
  tools: ['docx-to-pdf', 'docx-viewer', 'docx-creator'],
  published: '2026-09-03',
  body: [
    {
      type: 'p',
      text: 'You convert a Word document to PDF and something has moved. A heading wraps onto two lines, a table has slipped onto the next page, the typeface looks subtly wrong. The content is intact but the document no longer looks like the one you approved.',
    },
    {
      type: 'p',
      text: 'This is almost always fonts.',
    },

    { type: 'h2', text: 'Why a missing font changes the layout' },
    {
      type: 'p',
      text: 'A .docx does not contain its fonts. It names them. The file says "this text is Calibri" and relies on whatever opens it having Calibri available.',
    },
    {
      type: 'p',
      text: 'When the converter does not have that font, it substitutes the closest thing it does have. Substitutes have different character widths, so the same sentence occupies a different amount of space — and everything after it shifts. One slightly wider font is enough to push a heading onto a second line and a table onto the next page.',
    },
    {
      type: 'note',
      title: 'Why PDFs do not have this problem',
      text: 'A PDF embeds the fonts it uses, or a subset of them. That is the whole point of the format: it carries what it needs so it renders identically everywhere. The fragility is in the .docx, not the PDF.',
    },

    { type: 'h2', text: 'Fonts that are reliably available' },
    {
      type: 'p',
      text: 'If a document will be converted or opened elsewhere, staying close to widely installed families avoids the problem entirely:',
    },
    {
      type: 'ul',
      items: [
        'Arial, Times New Roman and Courier New — present essentially everywhere.',
        'Calibri and Cambria — Microsoft defaults, present wherever Office is, absent on many Linux systems and some conversion services.',
        'Georgia, Verdana, Trebuchet MS and Tahoma — long-standing web-safe families.',
        'Anything you installed yourself, or a corporate brand font, is the least portable choice of all.',
      ],
    },
    {
      type: 'p',
      text: 'The frustrating case is a document that looks perfect on the machine it was written on and reflows anywhere else, because the author had a font nobody else does.',
    },

    { type: 'h2', text: 'Getting a faithful conversion' },
    { type: 'h3', text: 'Convert where the fonts are' },
    {
      type: 'p',
      text: 'The most reliable conversion happens on a machine that has the fonts the document names — usually the one you wrote it on. Word’s own Save as PDF or Export uses your installed fonts and embeds them, which is why it is hard to beat for a heavily designed document.',
    },
    { type: 'h3', text: 'Simplify before converting' },
    {
      type: 'p',
      text: 'If you know the document is heading elsewhere, switching to a common font before conversion costs nothing and removes the failure mode. It is far quicker than diagnosing why page four broke.',
    },
    { type: 'h3', text: 'Use real styles rather than manual formatting' },
    {
      type: 'p',
      text: 'Text made large and bold by hand is just text. A Heading 1 style carries meaning that survives conversion, drives the PDF’s bookmarks and outline, and is what assistive technology reads. This is worth doing regardless of fonts.',
    },
    {
      type: 'tool',
      toolId: 'docx-to-pdf',
      text: 'Converts in your browser, with control over page size, margins and typeface.',
    },

    { type: 'h2', text: 'What browser-based conversion can and cannot do' },
    {
      type: 'p',
      text: 'Converting in the browser has a clear advantage — the document is never uploaded — and one honest limitation worth stating plainly.',
    },
    {
      type: 'p',
      text: 'Generated PDFs here use the standard PDF font set, which covers Latin script. Documents in Devanagari, Arabic, Chinese, Japanese, Korean, Cyrillic, Greek or Thai will have characters substituted, and the tool reports how many when it happens rather than silently producing a broken file.',
    },
    {
      type: 'note',
      tone: 'warn',
      title: 'If your document is not in Latin script',
      text: 'Use Word’s own export, or LibreOffice, which embed the fonts on your machine. This is a real limitation of the standard PDF font set, not something a setting can work around.',
    },
    {
      type: 'p',
      text: 'For English and most European languages — reports, letters, CVs, invoices — the conversion is faithful and the privacy benefit is genuine.',
    },

    { type: 'h2', text: 'Other things that shift, and why' },
    { type: 'h3', text: 'Tables break across pages differently' },
    {
      type: 'p',
      text: 'Word decides page breaks as it lays out; a converter does the same with slightly different rules. Setting "Repeat header row" and disallowing rows to split across pages makes the outcome far more predictable.',
    },
    { type: 'h3', text: 'Images move' },
    {
      type: 'p',
      text: 'Floating images anchored to a paragraph move when that paragraph moves. If placement matters, anchoring in line with text is much more stable, though less flexible.',
    },
    { type: 'h3', text: 'The PDF has no bookmarks' },
    {
      type: 'p',
      text: 'PDF bookmarks are generated from Word heading styles. A document formatted by hand has no headings to convert, so the PDF gets no outline. Another reason to use real styles.',
    },

    { type: 'h2', text: 'Checking the result' },
    {
      type: 'ol',
      items: [
        'Compare page counts. A different total means something reflowed.',
        'Check the last page — reflow accumulates, so damage shows up at the end.',
        'Look at every table boundary and every heading near a page break.',
        'Select a paragraph to confirm the text is text rather than an image.',
      ],
    },
  ],
};
