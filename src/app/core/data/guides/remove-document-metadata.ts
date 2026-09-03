import type { GuideDefinition } from '../../models/guide.model';

export const guide: GuideDefinition = {
  slug: 'how-to-remove-metadata-from-a-document-before-sharing',
  title: 'How to remove metadata from a document before sharing it',
  summary:
    'Documents carry author names, company details, edit history and cropped-away image data. Here is what is hidden in a file, how to see it, and how to remove it before you send.',
  answer:
    'Check what the file records before you send it: author, last modified by, company, revision count and editing time are all stored in a .docx, and cropped images often retain the parts you removed. Inspect it first, then strip what you did not intend to share.',
  keywords: [
    'remove metadata from word document',
    'document properties before sharing',
    'hidden data in documents',
    'strip author name from docx',
    'document metadata privacy',
  ],
  tools: ['docx-metadata', 'file-metadata', 'docx-extract-images'],
  published: '2026-09-03',
  body: [
    {
      type: 'p',
      text: 'A document carries more than its visible content. Some of it is useful. Some of it is a record of things you would not choose to tell the recipient — who really wrote it, which client’s template it started from, and how long it actually took.',
    },

    { type: 'h2', text: 'What a .docx records about you' },
    {
      type: 'p',
      text: 'The OpenXML format stores a set of properties alongside the text:',
    },
    {
      type: 'ul',
      items: [
        'Author — taken from whoever created the file, which may be a colleague rather than you.',
        'Last modified by — the most recent editor, often revealing that a document was passed around.',
        'Company — pulled from the Office installation, which is awkward when sending from a personal machine or after changing employer.',
        'Revision number and total editing time — a proposal marked as revision 47 with four minutes of editing tells a story you may not want told.',
        'Template — the file the document was created from, sometimes named after another client.',
        'Custom properties added by whatever system generated or processed the file.',
      ],
    },
    {
      type: 'p',
      text: 'None of this appears when the document is read. All of it travels with the file.',
    },
    {
      type: 'tool',
      toolId: 'docx-metadata',
      text: 'Reads every core, application and custom property stored in a .docx.',
    },

    { type: 'h2', text: 'Hidden content that is not metadata' },
    { type: 'h3', text: 'Cropped images' },
    {
      type: 'p',
      text: 'Cropping a picture in Word or PowerPoint usually hides part of it rather than deleting it. The full image remains embedded, and the cropped-away region can be recovered by anyone who opens the file. If you cropped someone out of a photograph, or trimmed a screenshot to hide part of the screen, that content is still there.',
    },
    {
      type: 'p',
      text: '[Extracting the images](/word/extract-images-from-word) shows what is genuinely stored, at original quality — which is the only way to be sure a crop removed anything.',
    },
    { type: 'h3', text: 'Comments and tracked changes' },
    {
      type: 'p',
      text: 'Setting the view to show the final version hides revision marks; it does not remove them. The recipient can switch that view back. Anything written in a margin comment should be assumed readable.',
    },
    { type: 'h3', text: 'Text hidden behind a shape' },
    {
      type: 'p',
      text: 'Covering text with a white or black rectangle hides it visually and leaves it fully selectable underneath. This has caused repeated public embarrassment for organisations that should know better. Deleting the content is the only redaction that works.',
    },

    { type: 'h2', text: 'How to remove it' },
    { type: 'h3', text: 'In Word' },
    {
      type: 'p',
      text: 'File → Info → Check for Issues → Inspect Document runs the Document Inspector, which finds and removes properties, comments, tracked changes, hidden text and cropped image data. It is thorough, and it is the right tool when you have Word available.',
    },
    { type: 'h3', text: 'By converting the file' },
    {
      type: 'p',
      text: 'Converting to another format usually drops the properties, because a converter writes a new file rather than editing the original. [Converting to PDF](/word/word-to-pdf) is the common choice when the recipient only needs to read the document — it produces a new file with a fresh set of properties.',
    },
    {
      type: 'note',
      title: 'PDFs have metadata too',
      text: 'A PDF carries title, author, producer and creation date of its own, and a converter may copy some of it across. Converting reduces the exposure; it does not automatically eliminate it. Check the result rather than assuming.',
    },
    { type: 'h3', text: 'By retyping into a clean file' },
    {
      type: 'p',
      text: 'Blunt but reliable for a short document: create a new file, paste the content as plain text, and reapply formatting. Nothing carries over because nothing was inherited.',
    },

    { type: 'h2', text: 'What about other formats?' },
    {
      type: 'p',
      text: 'Every format keeps something. Photographs carry EXIF data including the camera, the settings and often the GPS coordinates where the picture was taken. Spreadsheets carry the same core properties as documents. PDFs record the software that produced them.',
    },
    {
      type: 'p',
      text: 'The [file metadata viewer](/file/file-metadata-viewer) reads what the browser and the file itself can report for any format, which is the quickest way to check something before sending it.',
    },
    {
      type: 'tool',
      toolId: 'file-metadata',
      text: 'Name, type, exact size, dates and format-specific properties for any file.',
    },

    { type: 'h2', text: 'A routine before sending' },
    {
      type: 'ol',
      items: [
        'Inspect the properties. Look specifically at author, last modified by and company.',
        'Check for comments and tracked changes, with the view set to show all markup.',
        'Extract the images if any were cropped, and confirm nothing you removed is still stored.',
        'Prefer PDF when the recipient only needs to read it.',
        'Open the final file fresh and look at it as the recipient will.',
      ],
    },
    {
      type: 'p',
      text: 'Two minutes, and it catches the mistakes that are impossible to take back once the email has gone. There is more on handling sensitive files in [working with confidential documents safely online](/guides/how-to-work-with-confidential-documents-online).',
    },
  ],
};
