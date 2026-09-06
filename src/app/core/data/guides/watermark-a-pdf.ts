import type { GuideDefinition } from '../../models/guide.model';

export const guide: GuideDefinition = {
  slug: 'how-to-watermark-a-pdf-and-what-it-actually-stops',
  title: 'How to watermark a PDF (and what it actually stops)',
  summary:
    'How text and image watermarks are stored in a PDF, why some can be deleted in seconds, and an honest account of what a watermark deters rather than prevents.',
  answer:
    'A watermark is drawn into each page as ordinary page content, so it survives copying and printing. It is a deterrent and an attribution mark, not a protection: anyone determined enough can remove one, and a watermark applied as its own layer can often be deleted outright. Use it to discourage casual reuse and to label drafts, not to secure a document.',
  keywords: [
    'add watermark to pdf',
    'watermark pdf draft confidential',
    'remove watermark from pdf',
    'does a watermark protect a pdf',
    'pdf watermark not secure',
  ],
  tools: ['watermark-pdf', 'remove-watermark-pdf', 'protect-pdf'],
  published: '2026-09-06',
  body: [
    {
      type: 'p',
      text: 'Watermarks do real work. They mark a draft as a draft, put a name on a document that will be forwarded, and make a leaked page traceable. What they do not do is stop anyone, and the gap between those two things causes trouble when a watermark is treated as security.',
    },

    { type: 'h2', text: 'What a watermark actually is' },
    {
      type: 'p',
      text: 'A PDF page is a list of drawing instructions. Adding a watermark appends more instructions — place this text, at this angle, at this opacity — so the mark becomes part of the page in the same way the body text is part of the page.',
    },
    {
      type: 'p',
      text: 'That is why a watermark survives things people expect it to survive. Print the page and it prints. Screenshot it and it is in the screenshot. Convert the file to images and every image carries it. Nothing about it is an overlay applied by the reader software, which is the usual misconception.',
    },
    {
      type: 'p',
      text: 'It is also why a watermark is not protection. Instructions that were added can be found and removed. The page underneath was never altered — it was drawn over.',
    },

    { type: 'h2', text: 'Text or image' },
    { type: 'h3', text: 'Text watermarks' },
    {
      type: 'p',
      text: 'A word such as DRAFT or CONFIDENTIAL, usually set large, rotated, and drawn at low opacity. It adds almost nothing to the file size, stays sharp at any zoom because it is real text, and can be searched for — which cuts both ways, since a tool looking for a watermark to strip can search for it too.',
    },
    { type: 'h3', text: 'Image watermarks' },
    {
      type: 'p',
      text: 'A logo or a signature graphic. Better for branding, and rather harder to remove automatically because there is no text to match on. The cost is file size, and the need for a transparent PNG if it is to sit over content without a white box around it.',
    },
    {
      type: 'note',
      title: 'Opacity is the whole design problem',
      text: 'Too faint and it is invisible in print or on a phone. Too strong and it interferes with reading, which is what leads people to go looking for a way to remove it. Somewhere around 15 to 25 per cent grey works for most documents; check it on the page with the densest text rather than the title page.',
    },
    {
      type: 'tool',
      toolId: 'watermark-pdf',
      text: 'Add a text or image watermark across every page, with control over angle, size, opacity and position.',
    },

    { type: 'h2', text: 'What a watermark stops, honestly' },
    {
      type: 'p',
      text: 'It is worth being precise, because the answer is genuinely mixed.',
    },
    {
      type: 'ul',
      items: [
        'Casual reuse — yes. Someone who was going to drop your page into their own deck will not do it with your name across it. This is the case a watermark handles well, and it is the common one.',
        'Confusion about status — yes. A page marked DRAFT does not get quoted as final. This is arguably the most valuable thing a watermark does, and nobody thinks of it as security at all.',
        'Casual redistribution — partly. A watermark carrying a recipient’s name makes forwarding feel traceable. The deterrent is social, and it works on exactly the people who were not going to leak the document anyway.',
        'Determined removal — no. Tools to strip watermarks are freely available, including on this site. Assume anyone motivated will succeed.',
        'Copying the text — no. The words underneath remain selectable, copyable, and extractable. A watermark does not touch them.',
        'Screenshots and retyping — no. Nothing can prevent this, watermark or otherwise.',
      ],
    },
    {
      type: 'note',
      tone: 'warn',
      title: 'A watermark is not a substitute for encryption',
      text: 'If a document must not be read by the wrong person, a watermark contributes nothing at all — the content is fully readable underneath it. That is what a user password is for; see [how to password-protect a PDF](/guides/how-to-password-protect-a-pdf).',
    },

    { type: 'h2', text: 'Why some watermarks come off in seconds' },
    {
      type: 'p',
      text: 'There is a real difference in durability, and it depends on how the watermark was applied.',
    },
    {
      type: 'p',
      text: 'Some software adds a watermark as a separate annotation or optional content group — its own layer, tagged as such, which is convenient because the software can then toggle or update it. Anything that understands the format can also just delete that layer, and the page returns to its original state exactly.',
    },
    {
      type: 'p',
      text: 'A watermark merged into the page content itself is harder work. Removing it means editing the page’s drawing instructions, and separating the watermark from the content it overlaps is imprecise — which is why automated removal often leaves artefacts or takes some of the page with it.',
    },
    {
      type: 'p',
      text: 'Neither is secure. The difference is between seconds and minutes, and it is worth knowing which you are getting.',
    },

    { type: 'h2', text: 'The other direction' },
    {
      type: 'p',
      text: 'There are legitimate reasons to [remove a watermark](/pdf/remove-watermark-from-pdf): a draft that has been approved, a template mark left on a document you own, a sample you have since paid for. Results vary with how the mark was applied, and a merged watermark may not come away cleanly.',
    },
    {
      type: 'p',
      text: 'It should go without saying that being able to remove a mark is not permission to. Stripping an attribution from someone else’s work is a copyright matter regardless of how easy the removal was.',
    },

    { type: 'h2', text: 'Practical advice' },
    {
      type: 'ol',
      items: [
        'Use a watermark for what it is good at: marking status, and putting your name on work that will circulate.',
        'Personalise it when you are distributing to several recipients. A shared document is untraceable; one carrying a name is traceable enough to change behaviour.',
        'Keep the unwatermarked original. Removing a watermark later is lossy; opening the original is not.',
        'Encrypt if the content is genuinely sensitive, and treat the watermark as labelling rather than as any part of the protection.',
        'Check the metadata as well. A watermarked page with the author’s name still in the document properties has only been half prepared — see [removing metadata before sharing](/guides/how-to-remove-metadata-from-a-document-before-sharing).',
      ],
    },

    { type: 'h2', text: 'Where the watermarking happens' },
    {
      type: 'p',
      text: 'Watermarking is usually applied to documents that are about to be sent somewhere — drafts, contracts, priced proposals. Applying it on a server means uploading the unmarked original first, which puts the more sensitive version of the document on someone else’s machine to produce the less sensitive one.',
    },
    {
      type: 'p',
      text: 'Doing it in the browser avoids that inversion entirely. The original never travels, and the only file that exists anywhere else is the one you chose to send.',
    },
  ],
};
