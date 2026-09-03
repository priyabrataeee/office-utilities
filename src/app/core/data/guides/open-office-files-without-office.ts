import type { GuideDefinition } from '../../models/guide.model';

export const guide: GuideDefinition = {
  slug: 'how-to-open-docx-xlsx-and-pptx-without-microsoft-office',
  title: 'How to open DOCX, XLSX and PPTX without Microsoft Office',
  summary:
    'You have been sent a Word, Excel or PowerPoint file and do not have Office. What your options are, what each one costs you, and which parts of a document survive in each.',
  answer:
    'You do not need Office to read these files. A browser-based viewer opens them immediately with no install and no account, and the formats are open standards that many programs can read. What differs between the options is fidelity, cost and whether the file leaves your device.',
  keywords: [
    'open docx without word',
    'open xlsx without excel',
    'open pptx without powerpoint',
    'view office files free',
    'read word document no office',
  ],
  tools: ['docx-viewer', 'xlsx-viewer', 'pptx-viewer', 'universal-viewer'],
  published: '2026-09-03',
  body: [
    {
      type: 'p',
      text: 'Someone sends a .docx and you do not have Word. The file is right there and completely inert. This is a solved problem, and the solutions differ mainly in what they ask of you first.',
    },

    { type: 'h2', text: 'These formats are open standards' },
    {
      type: 'p',
      text: 'A .docx, .xlsx or .pptx is a ZIP archive containing XML files. Rename one to .zip and you can open it — the structure inside is a published specification, not a secret. That is why so many programs can read them, and why a browser can too.',
    },
    {
      type: 'p',
      text: 'Older .doc, .xls and .ppt files are different: binary formats predating the standard, and much harder to handle. If you have one of those, converting it in a program that supports it is usually the only route.',
    },

    { type: 'h2', text: 'Your options, honestly compared' },
    { type: 'h3', text: 'A browser-based viewer' },
    {
      type: 'p',
      text: 'Nothing to install, no account, and — if the tool works locally — no upload. Best when you need to read a file now, and good enough for most reading and light inspection.',
    },
    {
      type: 'p',
      text: 'What you give up is editing and exact fidelity. Word’s layout engine is proprietary, so a heavily designed document is approximated rather than reproduced.',
    },
    {
      type: 'tool',
      toolId: 'universal-viewer',
      text: 'Drop any supported file and the right viewer is chosen for you.',
    },
    { type: 'h3', text: 'LibreOffice' },
    {
      type: 'p',
      text: 'Free, open source, installs on every desktop platform, and edits as well as reads. The best answer if you will be working with these files regularly. It is a substantial download and its rendering of complex Word layouts is close but not identical.',
    },
    { type: 'h3', text: 'Google Docs, Sheets and Slides' },
    {
      type: 'p',
      text: 'Free with a Google account, and genuinely capable. The trade-off is that the file is uploaded to Google and stored in your Drive, which makes it the wrong choice for anything confidential and unnecessary if you only want to read one document.',
    },
    { type: 'h3', text: 'Office on the web' },
    {
      type: 'p',
      text: 'Microsoft’s own free web versions give the highest fidelity, since it is their format. Requires a Microsoft account and uploads the file to OneDrive.',
    },

    { type: 'h2', text: 'Which to choose' },
    {
      type: 'ul',
      items: [
        'Reading one file, right now — a browser viewer. It is the fastest path and asks nothing of you.',
        'The document is confidential — a viewer that works locally, verified by loading the page and then disconnecting.',
        'You need to edit and will do this often — install LibreOffice.',
        'Exact fidelity matters, and the content is not sensitive — Office on the web.',
      ],
    },

    { type: 'h2', text: 'What survives in a browser viewer' },
    {
      type: 'p',
      text: 'Worth knowing before you rely on what you see.',
    },
    { type: 'h3', text: 'Word documents' },
    {
      type: 'p',
      text: 'Headings, lists, tables, inline images and basic styling come through. Precise page layout, floating elements and custom fonts are approximated. Fine for reading; not a proof for signing off a print job.',
    },
    { type: 'h3', text: 'Spreadsheets' },
    {
      type: 'p',
      text: 'Values, sheets and formulas display, including very large workbooks — a virtualised grid renders only what is on screen, so hundreds of thousands of rows scroll smoothly. Formulas are shown as written with their last saved result rather than recalculated, which is what you want for inspection.',
    },
    {
      type: 'tool',
      toolId: 'xlsx-viewer',
      text: 'Switch sheets, freeze the header, search cells and export any sheet to CSV or JSON.',
    },
    { type: 'h3', text: 'Presentations' },
    {
      type: 'p',
      text: 'Slides are rendered from the underlying OpenXML with text, shapes and images positioned as authored. Animations, transitions and embedded video are not reproduced — you see each slide in its final state.',
    },

    { type: 'h2', text: 'If the file will not open at all' },
    {
      type: 'ul',
      items: [
        'Check the real extension. A file named report.docx may actually be something else — the [signature checker](/file/file-signature-checker) reads the magic bytes and tells you what it really is.',
        'Check whether it is the older binary format. A .doc is not a .docx and needs converting first.',
        'Check whether it is password-protected, which requires the password before anything can read it.',
        'Check whether it downloaded completely. A truncated file fails in ways that look like corruption.',
      ],
    },

    { type: 'h2', text: 'Once you can read it' },
    {
      type: 'p',
      text: 'Reading is often not the end of the task. If you need the content elsewhere, [converting Word to PDF](/word/word-to-pdf) produces something anyone can open, and [extracting the text](/word/extract-text-from-word) reaches headers, footers and footnotes that copy and paste misses.',
    },
  ],
};
