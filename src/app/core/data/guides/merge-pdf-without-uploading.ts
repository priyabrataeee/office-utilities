import type { GuideDefinition } from '../../models/guide.model';

export const guide: GuideDefinition = {
  slug: 'how-to-merge-pdfs-without-uploading',
  title: 'How to merge PDFs without uploading them anywhere',
  summary:
    'Combine several PDFs into one without sending them to a server — what changes in the merged file, what does not, and how to check the tool you are using really works locally.',
  answer:
    'Use a merger that runs in your browser rather than on a server. Choose your files, order them, and the merged PDF is assembled in the tab and saved straight to your device — no upload, no queue, and it works with the network switched off.',
  keywords: [
    'merge pdf without uploading',
    'combine pdf offline',
    'merge pdf locally',
    'join pdf files privately',
    'merge pdf no upload',
  ],
  tools: ['merge-pdf', 'organize-pdf', 'split-pdf'],
  published: '2026-09-03',
  body: [
    {
      type: 'p',
      text: 'Merging PDFs is the single most common thing people do to a PDF, and almost every free tool that does it starts by uploading your documents. That is usually unnecessary. Assembling several PDFs into one is well within what a browser can do on its own.',
    },

    { type: 'h2', text: 'How to do it' },
    {
      type: 'ol',
      items: [
        'Open a merge tool that runs client-side and choose the PDFs you want to combine.',
        'Put them in the order you want. Order is decided by you, not by the order your file manager happened to list them in — this is where most mistakes happen.',
        'Merge, then check the result before you delete anything. A quick scroll through the page boundaries catches a wrong order immediately.',
      ],
    },
    {
      type: 'tool',
      toolId: 'merge-pdf',
      text: 'Add as many files as you like, drag them into order, and download one document.',
    },

    { type: 'h2', text: 'What survives the merge, and what does not' },
    {
      type: 'p',
      text: 'A merge is a structural operation: pages are copied from each source document into a new one. Done properly, that means the page content itself is untouched.',
    },
    {
      type: 'ul',
      items: [
        'Text stays selectable and searchable. Pages are not rasterised into images, so nothing gets blurry and file size stays proportionate.',
        'Fonts, images and vector artwork are carried across as they were.',
        'Page sizes are preserved individually. A merged document can legitimately contain both A4 and Letter pages — that is the source material, not a fault.',
        'Bookmarks from each source file are kept where the tool supports it, which matters for long reports.',
      ],
    },
    {
      type: 'note',
      title: 'Links may need a look',
      text: 'Internal links that point to a specific page number can end up aimed at the wrong page once documents are combined, because the page numbering changes. External links to websites are unaffected.',
    },

    { type: 'h2', text: 'Why do it locally' },
    {
      type: 'p',
      text: 'The documents people merge are rarely trivial. Combining a set of invoices, assembling a contract with its annexes, putting a scanned ID next to an application form — these are exactly the files worth not uploading.',
    },
    {
      type: 'p',
      text: 'A browser-based merger removes the question entirely. Your files are read into memory in the tab, the new document is assembled there, and the result is saved by your browser. Nothing is transmitted, so there is no retention policy to rely on. There is more on how to verify that in [is it safe to use online PDF converters?](/guides/is-it-safe-to-use-online-pdf-converters).',
    },

    { type: 'h2', text: 'Checking it really is local' },
    {
      type: 'p',
      text: 'Load the page, disconnect from the network, then merge. If it completes, no server was involved. This is worth doing once with any tool you plan to trust with real documents — it is a stronger signal than anything written on the page.',
    },

    { type: 'h2', text: 'Common problems' },
    { type: 'h3', text: 'The pages came out in the wrong order' },
    {
      type: 'p',
      text: 'Files are usually added in selection order, which is not always what you saw on screen. Reorder before merging rather than fixing it afterwards — though if you have already merged, [reordering pages](/pdf/reorder-pdf-pages) is straightforward.',
    },
    { type: 'h3', text: 'The merged file is very large' },
    {
      type: 'p',
      text: 'A merge adds sizes together; it does not compress. If the result is too big to email, [compressing it](/pdf/compress-pdf) afterwards is the fix. Scanned pages are almost always the reason, because each page is a full-resolution photograph.',
    },
    { type: 'h3', text: 'A password-protected file will not merge' },
    {
      type: 'p',
      text: 'An encrypted PDF has to be decrypted before its pages can be copied. Supply the password if you have it, or [unlock the document](/pdf/unlock-pdf) first — for files you are entitled to open.',
    },
    { type: 'h3', text: 'It failed on a very large document' },
    {
      type: 'p',
      text: 'Local processing is bounded by the memory your browser has. Merging several hundred megabytes can exhaust it on a phone. Merging in two stages, or on a laptop, usually resolves it.',
    },

    { type: 'h2', text: 'Related things you may actually want' },
    {
      type: 'p',
      text: 'Merging is often not quite the operation people need. If you want to pull a few pages out rather than join whole files, [extracting pages](/pdf/extract-pdf-pages) is cleaner. If you want to rearrange, rotate and delete in one pass, the [page organiser](/pdf/organize-pdf) handles all three with undo.',
    },
  ],
};
