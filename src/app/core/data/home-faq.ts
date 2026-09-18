/**
 * Homepage FAQ.
 *
 * These are the questions someone asks before trusting a document site, and
 * they are the shape an AI search system can lift directly. The same array
 * feeds the visible block and the FAQPage structured data — marking up an
 * answer a reader cannot see is against Google's structured data rules, so
 * there is deliberately only one source for both.
 */
export const HOME_FAQ: readonly { readonly q: string; readonly a: string }[] = [
  {
    q: 'Are my files uploaded anywhere?',
    a: 'No. Every tool runs inside your browser: the file is read into memory on your own device, processed there, and handed back as a download. You can confirm it by opening your browser\u2019s network panel while you work, or by disconnecting from the internet after the page has loaded — the tools keep working.',
  },
  {
    q: 'Do I need an account?',
    a: 'No. There is no sign-up, no email address and no login. Nothing is stored between visits except a few display preferences in your own browser, which you can clear at any time.',
  },
  {
    q: 'Is it really free?',
    a: 'Yes. Every one of the tools is free with no limits on how many files you convert. The site is paid for by advertising and by donations, not by charging for the tools or selling data.',
  },
  {
    q: 'What file types are supported?',
    a: 'PDF, Word (.docx), Excel (.xlsx, .xls, .csv), PowerPoint (.pptx), images, Markdown, HTML, JSON, XML and plain text. Drop a file on the home page and the right tool is suggested for it.',
  },
  {
    q: 'What are the limitations?',
    a: 'Because the work happens on your device, very large files are bounded by the memory your browser allows. There is no OCR, so a scanned PDF has no text to extract. PDF to Word infers structure rather than reproducing a layout exactly, and complex Word or PowerPoint layouts can reflow.',
  },
];
