import type { GuideDefinition } from '../../models/guide.model';

export const guide: GuideDefinition = {
  slug: 'is-it-safe-to-use-online-pdf-converters',
  title: 'Is it safe to use online PDF converters?',
  summary:
    'Most online converters upload a copy of your document to a server you know nothing about. Here is what that means in practice, and how to tell which tools avoid it entirely.',
  answer:
    'It depends entirely on whether the tool uploads your file. Most do: your document is copied to a server, processed there, and stored for some period afterwards. For a holiday photo that is fine. For a contract, a payslip or medical records, you are handing a complete copy to a company you have not vetted.',
  keywords: [
    'is it safe to use online pdf converters',
    'are online pdf converters safe',
    'do online converters keep your files',
    'upload pdf privacy',
    'secure pdf converter',
  ],
  tools: ['merge-pdf', 'pdf-to-word', 'compress-pdf'],
  published: '2026-09-03',
  body: [
    {
      type: 'p',
      text: 'Nearly every free converter works the same way. You choose a file, your browser uploads it, a server does the work, and you download the result. The conversion is genuinely free. What you paid with was a complete copy of your document.',
    },
    {
      type: 'p',
      text: 'That is not a scandal in itself — it is simply how server-side software works. The question worth asking is what happens to the copy, and whether the document you converted was one you would have emailed to a stranger.',
    },

    { type: 'h2', text: 'What actually happens to an uploaded file' },
    {
      type: 'p',
      text: 'Once your file leaves your device, four things are true whether or not the service is well run:',
    },
    {
      type: 'ol',
      items: [
        'It exists on hardware you do not control, at least briefly, and usually on more than one machine once backups and caches are counted.',
        'It is readable by the operator. Encryption at rest protects against someone stealing the disk; it does not stop the company reading the file, because the company holds the key.',
        'It is subject to that company’s jurisdiction, which may not be yours, and to any legal request made there.',
        'Its deletion is a promise, not something you can verify. "Files are deleted after one hour" is a policy, and policies are followed by people and cron jobs that sometimes fail.',
      ],
    },
    {
      type: 'p',
      text: 'Reputable services do handle this responsibly. The point is not that they are dishonest — it is that you are relying on a promise you have no way to check, for a document that may not be yours to gamble with.',
    },

    { type: 'h2', text: 'When it genuinely does not matter' },
    {
      type: 'p',
      text: 'Plenty of documents carry no risk at all. A restaurant menu, a public form, a manual you downloaded from a manufacturer, a draft with nothing identifying in it — upload those anywhere you like. Convenience is a real benefit and the risk is close to zero.',
    },

    { type: 'h2', text: 'When you should not upload' },
    {
      type: 'p',
      text: 'The line is worth drawing deliberately, because most people never draw it at all. Do not upload documents that contain:',
    },
    {
      type: 'ul',
      items: [
        'Identity data — passports, driving licences, national ID numbers, birth certificates.',
        'Financial detail — bank statements, payslips, tax returns, invoices with account numbers on them.',
        'Medical records, of any kind, for anyone.',
        'Signed contracts, legal correspondence, or anything covered by a confidentiality clause.',
        'Work documents belonging to your employer or a client, where you are not the one entitled to decide where they get stored.',
      ],
    },
    {
      type: 'note',
      tone: 'warn',
      title: 'The one most people miss',
      text: 'If a document belongs to your employer or a client, uploading it may breach a policy or a contract regardless of how trustworthy the converter is. The question is not only whether the service is safe — it is whether you had the authority to send the file at all.',
    },

    { type: 'h2', text: 'How to tell whether a tool uploads your file' },
    {
      type: 'p',
      text: 'Marketing copy is not evidence. "Secure", "private" and "your files are safe with us" all describe how a server handles an upload, not whether one happened. Two checks settle it in under a minute.',
    },
    {
      type: 'h3',
      text: 'Check one: watch the network',
    },
    {
      type: 'p',
      text: 'Open your browser’s developer tools, switch to the Network tab, then choose your file. If you see a request carrying several megabytes upward, the file was uploaded. If nothing of the sort appears, it was not.',
    },
    {
      type: 'h3',
      text: 'Check two: disconnect',
    },
    {
      type: 'p',
      text: 'Load the page, turn off your Wi-Fi, then try the conversion. A tool that works entirely in your browser will finish normally. A tool that needs a server will stall or fail. This is the more convincing test, because it cannot be faked by a reassuring privacy policy.',
    },

    { type: 'h2', text: 'The alternative: tools that never upload at all' },
    {
      type: 'p',
      text: 'Browsers have quietly become capable enough that the upload is no longer necessary for most document work. A modern browser can unzip archives, parse the OpenXML inside a .docx, rasterise a PDF, encode images and run cryptography — all locally, at usable speed.',
    },
    {
      type: 'p',
      text: 'That means a converter can be written to read your file into memory in the tab and do the work there. Nothing is transmitted, so there is no copy to retain, no policy to trust and no jurisdiction to worry about. The privacy is a property of the architecture rather than a promise about conduct.',
    },
    {
      type: 'p',
      text: 'That is how [every tool on this site](/tools) works, and it is why they keep working with the network disconnected once the page has loaded. You do not have to take that on trust — run the two checks above on this site and see for yourself.',
    },
    {
      type: 'tool',
      toolId: 'merge-pdf',
      text: 'A good one to test with: choose two PDFs, disconnect, and merge them anyway.',
    },

    { type: 'h2', text: 'What browser-based tools cannot do' },
    {
      type: 'p',
      text: 'Local processing is not free of trade-offs, and any tool claiming otherwise is overselling. Three honest limits:',
    },
    {
      type: 'ul',
      items: [
        'Your device sets the ceiling. A very large file may fail on a phone and succeed on a laptop, because the work happens in your browser’s memory rather than on a server with room to spare.',
        'Scanned documents need OCR, which is heavy. A scan is a picture of text, and reading it requires software this kind of tool may not include.',
        'Anything genuinely requiring a server — sending an email, storing a file for later, collaborating with someone else — cannot be done locally by definition.',
      ],
    },

    { type: 'h2', text: 'The short answer' },
    {
      type: 'p',
      text: 'Online PDF converters are safe enough for documents you would not mind a stranger reading, and a genuine risk for everything else. The useful move is not to find a service with a better privacy policy — it is to use a tool that never receives the file, so the policy stops mattering.',
    },
    {
      type: 'p',
      text: 'If you want to see what that looks like in practice, the [full toolkit](/tools) runs entirely in this tab, and the [privacy page](/privacy) sets out exactly what is and is not stored.',
    },
  ],
};
