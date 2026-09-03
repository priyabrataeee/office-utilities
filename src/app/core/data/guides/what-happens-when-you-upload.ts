import type { GuideDefinition } from '../../models/guide.model';

export const guide: GuideDefinition = {
  slug: 'what-happens-when-you-upload-a-file-to-a-converter',
  title: 'What actually happens when you upload a file to a converter',
  summary:
    'A step-by-step account of where your document goes after you press the button, why "deleted after one hour" is harder than it sounds, and which claims you can verify yourself.',
  answer:
    'Your file is copied over the network to a server, written to disk, processed, and left in place until a cleanup job removes it. Along the way it usually passes through a CDN and gets captured in logs and backups, which is why deletion is more complicated than a single delete call.',
  keywords: [
    'what happens when you upload a file',
    'do converters store your files',
    'are uploaded files deleted',
    'file upload privacy',
    'online converter data retention',
  ],
  tools: ['pdf-to-word', 'excel-to-csv', 'image-converter'],
  published: '2026-09-03',
  body: [
    {
      type: 'p',
      text: 'Every online converter has a privacy page, and they mostly say the same reassuring thing. Far fewer describe the actual path a file takes. That path is worth understanding, because it explains why some of the reassurances are easy to give and hard to keep.',
    },

    { type: 'h2', text: 'The journey, step by step' },
    { type: 'h3', text: '1. The file leaves your device' },
    {
      type: 'p',
      text: 'Your browser reads the document and sends it as an HTTP request. Over HTTPS this is encrypted in transit, which protects it from anyone watching the network — but not from the destination, which is the whole point of sending it there.',
    },
    { type: 'h3', text: '2. It usually passes through a CDN' },
    {
      type: 'p',
      text: 'Most services sit behind a content delivery network for speed and protection. Your upload therefore transits a third party the service chose, which may terminate the encryption and may operate in a different country from the company you thought you were dealing with.',
    },
    { type: 'h3', text: '3. It is written to disk' },
    {
      type: 'p',
      text: 'Processing needs a real file. It is written to storage — often shared storage, so it can be picked up by whichever worker machine is free. At this moment your document exists as an ordinary file on a computer you have never seen.',
    },
    { type: 'h3', text: '4. It is processed, producing a second copy' },
    {
      type: 'p',
      text: 'The conversion writes an output file. There are now at least two copies of your content on their infrastructure, and the output is typically kept longer, because you have to be able to download it.',
    },
    { type: 'h3', text: '5. It waits for cleanup' },
    {
      type: 'p',
      text: 'Deletion is almost never immediate. A scheduled job removes files older than some threshold. Between conversion and cleanup, both copies sit there — and if the job fails, they sit there longer, quietly, because nothing alerts on files that were supposed to disappear.',
    },

    { type: 'h2', text: 'Why "deleted after one hour" is harder than it sounds' },
    {
      type: 'p',
      text: 'Assume total good faith. The company means it. Deletion is still genuinely difficult, because a file is rarely in only one place:',
    },
    {
      type: 'ul',
      items: [
        'Backups. Storage is backed up, and a nightly snapshot taken before cleanup contains your file for as long as that backup is retained — often weeks.',
        'Logs. Filenames, sizes and timestamps end up in application logs. The content may be gone while a record that you converted "2026-tax-return.pdf" persists.',
        'Caches. A CDN may have cached the download so a retry is fast, on machines the service does not directly manage.',
        'Replication. Redundant storage keeps copies across locations; deletion has to propagate to all of them.',
      ],
    },
    {
      type: 'p',
      text: 'None of this is sinister. It is what running reliable infrastructure looks like. But it means "your file is deleted after an hour" describes an intention about primary storage, not a guarantee that no copy exists anywhere.',
    },

    { type: 'h2', text: 'What you can actually verify' },
    {
      type: 'p',
      text: 'You cannot audit a company’s cleanup jobs. You can determine whether an upload happened at all, and that single fact settles every question above.',
    },
    {
      type: 'ol',
      items: [
        'Open developer tools, go to the Network tab, and choose a file. A large outbound request means it was uploaded.',
        'Or simply disconnect from the network after the page loads and try the conversion. If it works, nothing was sent.',
      ],
    },
    {
      type: 'note',
      title: 'Why the offline test is the strong one',
      text: 'A network trace can be misread, and a privacy policy can be aspirational. A tool that completes a conversion with the network switched off cannot have used a server. It is the only check that proves the architecture rather than the intent.',
    },

    { type: 'h2', text: 'The architecture that avoids all of it' },
    {
      type: 'p',
      text: 'If the file never leaves your device, none of steps one to five occur. There is no transit, no CDN, no disk, no second copy and no cleanup job — not because the operator is careful, but because there is nothing to be careful with.',
    },
    {
      type: 'p',
      text: 'Browsers can now do this work directly: reading ZIP containers, parsing document formats, rasterising PDFs and encoding images all run locally at usable speed. That is how [the tools here](/tools) are built, and why they keep working offline.',
    },
    {
      type: 'tool',
      toolId: 'pdf-to-word',
      text: 'Try it with the network disconnected — the conversion still finishes.',
    },

    { type: 'h2', text: 'Being fair about the trade-off' },
    {
      type: 'p',
      text: 'Server-side processing is not a scam, and it buys real things: heavier operations like OCR, consistent results regardless of your device, and files that persist so you can come back for them. If you need those, a server is the right answer.',
    },
    {
      type: 'p',
      text: 'The mistake is uploading by default — handing over a payslip or a signed contract because uploading is what the first search result happened to do. For most everyday document work, the upload buys you nothing you would have missed.',
    },
  ],
};
