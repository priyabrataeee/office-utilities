import type { GuideDefinition } from '../../models/guide.model';

export const guide: GuideDefinition = {
  slug: 'why-your-powerpoint-is-too-big-to-email',
  title: 'Why your PowerPoint is too big to email — and how to fix it',
  summary:
    'A deck of twenty slides should not be 80 MB. Find out exactly which images are responsible, and shrink the file without touching the design.',
  answer:
    'It is almost always images stored at far higher resolution than the slide displays them at, plus media left behind on deleted slides. Find which files account for the size, replace or remove those, and a deck typically drops by most of its weight.',
  keywords: [
    'powerpoint file too large',
    'reduce powerpoint file size',
    'compress pptx',
    'pptx too big to email',
    'why is my powerpoint so big',
  ],
  tools: ['file-size-analyzer', 'pptx-extract-images', 'slide-selector', 'pptx-to-pdf'],
  published: '2026-09-03',
  body: [
    {
      type: 'p',
      text: 'Twenty slides, mostly text, and the file is 80 MB. Email rejects it, the shared drive complains, and nothing on screen looks like it should weigh that much.',
    },
    {
      type: 'p',
      text: 'Slides are cheap. The text in a whole deck is a few kilobytes. Something else is taking the space, and it is worth finding out precisely what rather than guessing.',
    },

    { type: 'h2', text: 'Find the actual culprit first' },
    {
      type: 'p',
      text: 'A .pptx is a ZIP archive. Its parts can be listed and measured, which turns "the file is too big" into "this one photograph is 34 MB". That changes the fix from a blind compression pass into a targeted one.',
    },
    {
      type: 'tool',
      toolId: 'file-size-analyzer',
      text: 'Breaks a PPTX, DOCX, XLSX, PDF or ZIP into its parts, sized in proportion.',
    },
    {
      type: 'p',
      text: 'In nearly every oversized deck, a handful of images account for almost all of it.',
    },

    { type: 'h2', text: 'Why images are so much larger than they look' },
    { type: 'h3', text: 'Resolution has nothing to do with display size' },
    {
      type: 'p',
      text: 'Drag a 6000-pixel-wide photograph from a phone onto a slide and shrink it to fill a quarter of the screen. PowerPoint stores all 6000 pixels. The slide displays perhaps 800 of them. The other 5200 are carried in the file forever, doing nothing.',
    },
    { type: 'h3', text: 'Cropping usually hides rather than removes' },
    {
      type: 'p',
      text: 'Cropping normally keeps the whole original so the crop stays adjustable. A tightly cropped detail from a huge photograph can still be storing the huge photograph — which is both a size problem and, occasionally, a confidentiality one.',
    },
    { type: 'h3', text: 'Deleted slides leave their media behind' },
    {
      type: 'p',
      text: 'Media referenced by a deleted slide, or living on an unused slide master, often stays in the archive. Decks that have been edited over years accumulate this quietly.',
    },
    {
      type: 'tool',
      toolId: 'pptx-extract-images',
      text: 'Lists every image stored in the deck with the slides it appears on — including ones no slide uses.',
    },
    { type: 'h3', text: 'PNG screenshots of photographs' },
    {
      type: 'p',
      text: 'PNG is lossless, which is right for screenshots of interfaces and text. For a photograph it is entirely the wrong format and can be ten times the size of an equivalent JPEG. A screenshot that happens to contain a photograph gets the worst of both.',
    },

    { type: 'h2', text: 'Fixing it' },
    { type: 'h3', text: 'Use PowerPoint’s own compression' },
    {
      type: 'p',
      text: 'Select a picture, then Picture Format → Compress Pictures. Untick "Apply only to this picture", choose a sensible resolution, and tick "Delete cropped areas of pictures". That last option is the one that recovers the most, and it is the one people miss.',
    },
    {
      type: 'p',
      text: '150 ppi is ample for a deck that will be presented or emailed. 220 ppi if it will be printed.',
    },
    { type: 'h3', text: 'Resize the worst offenders before inserting them' },
    {
      type: 'p',
      text: 'For a deck you are still building, resizing images to roughly the size they will display — and converting photographs to JPEG or WebP — prevents the problem rather than repairing it. [Batch image conversion](/convert/image-converter) handles a folder in one pass.',
    },
    { type: 'h3', text: 'Send fewer slides' },
    {
      type: 'p',
      text: 'If the recipient needs six slides out of forty, sending six is better in every way. [Selecting slides](/powerpoint/slide-selector) produces a trimmed deck that still carries the layouts and media those slides depend on, so it opens as a proper presentation rather than a broken one.',
    },
    { type: 'h3', text: 'Send a PDF instead' },
    {
      type: 'p',
      text: 'If the recipient only needs to read it, [converting to PDF](/powerpoint/powerpoint-to-pdf) is usually far smaller and removes any question about whether their version of PowerPoint renders your fonts. They lose the ability to edit, which is often the point.',
    },

    { type: 'h2', text: 'The email limit is smaller than it says' },
    {
      type: 'note',
      title: 'Attachments grow in transit',
      text: 'Email encodes attachments in base64, which inflates them by about a third. A 20 MB file can arrive at roughly 27 MB and be rejected by a 25 MB limit. Aim for 15 MB if you want to be safe.',
    },

    { type: 'h2', text: 'A working order' },
    {
      type: 'ol',
      items: [
        'Analyse the file and identify which parts account for the size.',
        'Compress pictures across the whole deck, with cropped areas deleted.',
        'Remove slides the recipient does not need.',
        'Re-check the size. Most decks are done by here.',
        'If it is still too large, send a PDF or a link instead.',
      ],
    },
    {
      type: 'p',
      text: 'Keep the original until you have checked the compressed version on a large screen. Image compression is irreversible, and a photograph that looked fine in a thumbnail can be visibly degraded when projected.',
    },
  ],
};
