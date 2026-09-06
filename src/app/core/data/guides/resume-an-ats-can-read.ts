import type { GuideDefinition } from '../../models/guide.model';

export const guide: GuideDefinition = {
  slug: 'how-to-write-a-resume-an-ats-can-read',
  title: 'How to write a résumé an ATS can actually read',
  summary:
    'What an applicant tracking system extracts from a CV, why columns and text boxes disappear, and a two-minute test that shows you exactly what the machine sees.',
  answer:
    'An applicant tracking system extracts the plain text of your CV and reads that, not the layout. Anything that is not part of the normal text flow — two-column layouts, text boxes, headers and footers, details inside an image — may not survive extraction. You can check yours in two minutes: convert your own PDF to text and read what comes out.',
  keywords: [
    'ats friendly resume',
    'resume format applicant tracking system',
    'why is my cv rejected',
    'ats resume test',
    'cv pdf or word',
  ],
  tools: ['resume-builder', 'pdf-to-text', 'docx-to-pdf', 'cover-letter-generator'],
  published: '2026-09-06',
  body: [
    {
      type: 'p',
      text: 'Most applications are read by software before a person sees them, and the advice about it is unusually poor — full of claims about magic keywords and secret formatting rules. The underlying mechanism is simpler than that, and once you know it, the rules follow on their own.',
    },

    { type: 'h2', text: 'What an ATS actually does' },
    {
      type: 'p',
      text: 'An applicant tracking system is a database of applications. When your CV arrives, it runs text extraction on the file, tries to identify sections such as experience, education and skills, and stores the result as fields a recruiter can search.',
    },
    {
      type: 'p',
      text: 'That is the whole trick. Extraction produces a stream of text, and everything after that operates on the stream. Your careful layout has no role — it exists only in the visual rendering, and the visual rendering is not what gets stored.',
    },
    {
      type: 'p',
      text: 'So the question is not “will an ATS like my design”. It is “what text comes out of my file, and in what order”.',
    },

    { type: 'h2', text: 'The test that settles it' },
    {
      type: 'p',
      text: 'You do not have to guess. Take your finished CV and [convert it to plain text](/pdf/pdf-to-text). What appears is approximately what the machine has to work with.',
    },
    {
      type: 'p',
      text: 'Read it as though you had never seen the document. Are the job titles present? Are the dates attached to the right roles? Does your name appear at the top, or has it vanished because it lived in a header? Is the text in a sensible order, or has a two-column layout interleaved your skills with your employment history line by line?',
    },
    {
      type: 'p',
      text: 'Every common ATS problem is visible in that output, and no article can tell you as much about your own CV as two minutes of reading it can.',
    },
    {
      type: 'note',
      title: 'Extraction quality varies, so treat it as a good approximation',
      text: 'Different systems use different extraction libraries and will not produce byte-identical results. But they face the same constraints, and text that comes out garbled in one is at risk in all of them. Something that extracts cleanly is a reasonable bet everywhere.',
    },

    { type: 'h2', text: 'What breaks extraction' },
    { type: 'h3', text: 'Multiple columns' },
    {
      type: 'p',
      text: 'The most damaging and most popular mistake. A PDF stores text with positions, not with a notion of columns. Extraction generally reads across the page, so a sidebar next to your work history produces alternating fragments of both, and the result is genuinely unreadable.',
    },
    {
      type: 'p',
      text: 'A single-column CV extracts in the order it is written. It also reads perfectly well to humans, which is the more important point.',
    },
    { type: 'h3', text: 'Text boxes and graphics' },
    {
      type: 'p',
      text: 'Text inside a shape, a box or a diagram sits outside the main flow and is frequently skipped. A skills section built as a row of coloured pills, or a contact block inside a graphic, can disappear entirely while looking perfectly present on screen.',
    },
    { type: 'h3', text: 'Headers and footers' },
    {
      type: 'p',
      text: 'Contact details in the page header are the classic version of this. They look right, and they are often dropped or attached to the wrong part of the document. Put your name, email and phone number in the ordinary body text at the top of page one.',
    },
    { type: 'h3', text: 'Anything that is an image' },
    {
      type: 'p',
      text: 'A CV exported as a picture, or a designed template where the text is baked into a graphic, contains no extractable text at all. Without optical character recognition — which most systems do not apply — it is a blank application.',
    },
    {
      type: 'note',
      tone: 'warn',
      title: 'Tables are a genuine risk',
      text: 'A table looks like a tidy way to lay out dates against roles, and it extracts unpredictably: sometimes row by row, sometimes column by column, sometimes with the cells run together. If your dates end up separated from the jobs they belong to, a recruiter searching for candidates with three years in a role will not find you. Use plain paragraphs with the dates on the same line as the title.',
    },

    { type: 'h2', text: 'PDF or Word' },
    {
      type: 'p',
      text: 'Send a PDF unless the posting asks for something else, in which case send exactly what it asks for. A PDF renders identically everywhere, and modern systems parse it perfectly well; the advice against PDFs is a decade out of date.',
    },
    {
      type: 'p',
      text: 'The one requirement is that it must be a real PDF containing real text — one [exported from your word processor](/word/word-to-pdf), not printed and scanned, and not assembled from images. If a PDF you were given fails the text test above, that is why.',
    },

    { type: 'h2', text: 'About keywords' },
    {
      type: 'p',
      text: 'Recruiters search the stored text, so the words in your CV do matter. This is much less mysterious than it is made to sound.',
    },
    {
      type: 'ul',
      items: [
        'Use the terms the job description uses. If it says “stakeholder management” and you wrote “working with clients”, a search for the former will not match you.',
        'Spell out an abbreviation once alongside its expansion, so both forms are searchable.',
        'Put the terms in the sentences describing what you did. A detached list of keywords is obvious to the human who reads it next, and a CV that clears the filter but reads badly has failed at the step that counts.',
        'Do not hide keywords in white text or at a tiny size. It is trivially detected, extraction finds it precisely because it ignores appearance, and it ends the application.',
      ],
    },

    { type: 'h2', text: 'A format that works' },
    {
      type: 'ol',
      items: [
        'Single column, top to bottom.',
        'Name and contact details as ordinary text at the top of the first page — never in the header.',
        'Conventional section headings: Experience, Education, Skills. Unusual names for them make automatic section detection fail, and cleverness buys nothing here.',
        'One role per entry, with the job title, employer and dates on the same line or the line directly below.',
        'A standard font, no text boxes, no tables, no icons standing in for words.',
        'Export to PDF, then run the text test before sending it anywhere.',
      ],
    },
    {
      type: 'tool',
      toolId: 'resume-builder',
      text: 'Build a single-column CV that extracts cleanly, and export it as a PDF.',
    },

    { type: 'h2', text: 'One thing to check before you send it' },
    {
      type: 'p',
      text: 'A PDF exported from a word processor carries document properties, and those often include the author name from whoever owns the software licence and the original file name. If your CV started as a template from a colleague, their name may still be in it, and if the file is named after the last company you applied to, the recruiter can see that too.',
    },
    {
      type: 'p',
      text: 'Name the file properly — your own name and the word CV — and see [removing metadata before sharing](/guides/how-to-remove-metadata-from-a-document-before-sharing) for the rest.',
    },
    {
      type: 'p',
      text: 'There is also a reason not to build a CV on a site that keeps it. A CV is a complete personal record — full name, address, phone number, employment history — and job seekers hand it over routinely while looking for work. A builder that runs in your browser produces the same document without the copy on someone else’s server, which for this particular document is worth having.',
    },
  ],
};
