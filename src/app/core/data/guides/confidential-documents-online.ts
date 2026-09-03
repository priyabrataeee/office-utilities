import type { GuideDefinition } from '../../models/guide.model';

export const guide: GuideDefinition = {
  slug: 'how-to-work-with-confidential-documents-online',
  title: 'How to work with confidential documents safely online',
  summary:
    'A practical routine for handling contracts, payslips and client files with online tools — what to check before you start, what to strip before you share, and where the real leaks happen.',
  answer:
    'Use tools that process the file in your browser rather than on a server, strip metadata before sharing, and be aware that the obligation is usually contractual as well as personal — a client document may not be yours to upload at all.',
  keywords: [
    'edit confidential pdf safely',
    'handle sensitive documents online',
    'secure document conversion',
    'client confidentiality documents',
    'redact and share documents safely',
  ],
  tools: ['docx-metadata', 'protect-pdf', 'file-metadata', 'pdf-to-word'],
  published: '2026-09-03',
  body: [
    {
      type: 'p',
      text: 'Most advice about confidential documents stops at "be careful". That is not a procedure. What follows is one — the checks worth making before you open a sensitive file in any online tool, and the two places confidentiality usually leaks that have nothing to do with converters.',
    },

    { type: 'h2', text: 'First: is it yours to upload?' },
    {
      type: 'p',
      text: 'This question comes before any technical consideration, and it is the one most often skipped. A document belonging to your employer or a client may be covered by a confidentiality clause, a data processing agreement, or a policy that names which services are approved.',
    },
    {
      type: 'p',
      text: 'If so, uploading it can be a breach regardless of how reputable the service is. The service being secure is not the same as you being permitted to send it there.',
    },
    {
      type: 'note',
      tone: 'warn',
      title: 'The practical test',
      text: 'If you would need to ask permission before emailing the document to someone outside your organisation, you need permission before uploading it to a converter. Both are transfers to a third party.',
    },

    { type: 'h2', text: 'Second: does the tool need the file at all?' },
    {
      type: 'p',
      text: 'For most document work — converting, merging, splitting, extracting text, changing an image format — a modern browser can do the job without a server. When that is true, the confidentiality question dissolves, because no transfer occurs.',
    },
    {
      type: 'p',
      text: 'Verify rather than assume. Load the page, disconnect from the network, then run the operation. If it completes, the file never left your device. There is a fuller explanation in [what actually happens when you upload a file](/guides/what-happens-when-you-upload-a-file-to-a-converter).',
    },
    {
      type: 'tool',
      toolId: 'pdf-to-word',
      text: 'Runs entirely in the tab — try it offline to confirm.',
    },

    { type: 'h2', text: 'Third: strip what you did not mean to send' },
    {
      type: 'p',
      text: 'Documents carry more than their visible content, and this is where confidentiality most often leaks — not through a converter, but through the file you deliberately sent.',
    },
    { type: 'h3', text: 'Metadata' },
    {
      type: 'p',
      text: 'A Word document records its author, who last modified it, the company name, the revision number and how long it was edited for. A proposal sent to a client can quietly reveal that it was drafted from another client’s template, and by whom.',
    },
    {
      type: 'p',
      text: 'Check it before sending with the [Word metadata viewer](/word/word-metadata-viewer), or the [file metadata viewer](/file/file-metadata-viewer) for other formats.',
    },
    { type: 'h3', text: 'Tracked changes and comments' },
    {
      type: 'p',
      text: 'Comments and accepted changes remain in the file even when the view is set to show the final version. A recipient can switch that view. Anything said in a margin comment should be assumed readable.',
    },
    { type: 'h3', text: 'Content that is hidden rather than removed' },
    {
      type: 'p',
      text: 'Text covered by a black rectangle is still text. Drawing a box over a paragraph in a PDF hides it visually and leaves it fully selectable underneath — a mistake that has embarrassed governments and law firms repeatedly. Deleting the content is the only reliable redaction.',
    },
    { type: 'h3', text: 'Cropped images' },
    {
      type: 'p',
      text: 'Cropping in Word or PowerPoint usually hides part of a picture rather than discarding it. The original can often be recovered — which is worth knowing if you cropped something out for a reason. [Extracting the images](/word/extract-images-from-word) shows what is really stored.',
    },

    { type: 'h2', text: 'Fourth: control the copy you send' },
    {
      type: 'p',
      text: 'Once a document leaves your hands you have no further say, so decide deliberately what form it leaves in.',
    },
    {
      type: 'ul',
      items: [
        'Send PDF rather than the editable original when the recipient only needs to read it. It carries less recoverable history.',
        'Send only the pages that are relevant — [extracting pages](/pdf/extract-pdf-pages) is quicker than explaining later why the rest was included.',
        'Password-protect it when the channel is not under your control, and send the password separately.',
      ],
    },
    {
      type: 'tool',
      toolId: 'protect-pdf',
      text: 'Encrypt with a user password, and control whether printing and copying are allowed.',
    },
    {
      type: 'note',
      title: 'What a PDF password is and is not',
      text: 'It applies the encryption defined by the PDF specification, which keeps honest readers out and is only as strong as the password you choose. It is not a guarantee against a determined attacker, and it does not stop someone you sent it to from forwarding it.',
    },

    { type: 'h2', text: 'Where the real leaks happen' },
    {
      type: 'p',
      text: 'In practice, confidential documents rarely escape through a converter. They escape through ordinary carelessness:',
    },
    {
      type: 'ul',
      items: [
        'The wrong attachment on the right email, or the right attachment on the wrong email.',
        'A shared drive link set to "anyone with the link" and then pasted into a chat.',
        'Metadata nobody looked at, revealing an author or a source template.',
        'A redaction drawn on top of text instead of removing it.',
        'A file left in Downloads on a shared or personal machine long after it was needed.',
      ],
    },
    {
      type: 'p',
      text: 'A browser-based toolkit removes one category of risk cleanly and completely. The rest is procedure, and worth the two minutes it takes.',
    },

    { type: 'h2', text: 'A short routine' },
    {
      type: 'ol',
      items: [
        'Confirm you are entitled to process the document outside your organisation.',
        'Use a tool that works offline, and test that claim once before trusting it.',
        'Check metadata, comments and cropped images before sharing.',
        'Send the minimum: the right format, the right pages, nothing else.',
        'Delete working copies when you are finished with them.',
      ],
    },
  ],
};
