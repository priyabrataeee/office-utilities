import type { GuideDefinition } from '../../models/guide.model';

export const guide: GuideDefinition = {
  slug: 'how-to-convert-images-between-png-jpg-and-webp',
  title: 'How to convert images between PNG, JPG and WebP',
  summary:
    'Which image format to use and when, why converting a JPG twice makes it worse, what happens to transparency, and how to convert without uploading the picture anywhere.',
  answer:
    'Choose by content, not by habit: JPG for photographs, PNG for screenshots, text and anything needing transparency, WebP for both when the destination is the web. Converting between them is one step — but every save as JPG or WebP discards detail permanently, so always convert from the original rather than from a copy you already converted once.',
  keywords: [
    'convert png to webp',
    'convert jpg to png',
    'image format for web',
    'png vs jpg vs webp',
    'convert image without uploading',
  ],
  tools: ['image-converter', 'png-to-webp', 'jpg-to-png', 'svg-to-png'],
  published: '2026-09-06',
  body: [
    {
      type: 'p',
      text: 'Most image conversion goes wrong in one of two ways: the wrong format for the content, which makes the file needlessly large or visibly ugly, or repeated conversion, which degrades the picture a little more each time. Both are avoidable once you know which formats throw information away.',
    },

    { type: 'h2', text: 'Lossy and lossless, which is the whole distinction' },
    {
      type: 'p',
      text: 'A lossless format stores the image exactly. Save it, reopen it, save it again a hundred times and the pixels are identical. PNG is lossless, and so is WebP in its lossless mode.',
    },
    {
      type: 'p',
      text: 'A lossy format achieves much smaller files by discarding detail the eye is unlikely to miss. JPG is lossy, and WebP is lossy by default. The saving is real — often a photograph at a tenth the size — and so is the loss.',
    },
    {
      type: 'note',
      tone: 'warn',
      title: 'Loss accumulates and cannot be undone',
      text: 'Converting a JPG to PNG does not restore what the JPG discarded; it stores the already-degraded image losslessly. And each additional lossy save compounds the damage. Always convert from the highest-quality original you have, never from a file that has already been through the process.',
    },

    { type: 'h2', text: 'Choosing a format' },
    { type: 'h3', text: 'JPG for photographs' },
    {
      type: 'p',
      text: 'JPG was designed for continuous-tone images — photographs, and anything with soft gradients. Its compression assumes gradual colour change, which is exactly what a photograph is made of, and it produces small files with no visible harm at sensible quality settings.',
    },
    {
      type: 'p',
      text: 'It handles sharp edges badly. Text, screenshots, line art and logos develop a faint smearing around the edges, and JPG cannot store transparency at all — a transparent background becomes white, or occasionally black.',
    },
    { type: 'h3', text: 'PNG for screenshots, text and transparency' },
    {
      type: 'p',
      text: 'PNG is lossless and supports a full alpha channel, so edges stay crisp and transparency is preserved properly, including partial transparency around anti-aliased edges.',
    },
    {
      type: 'p',
      text: 'The cost is size. A PNG of a photograph is typically several times larger than a JPG of the same picture with no visible benefit, because lossless compression has very little repetition to exploit in a photograph.',
    },
    { type: 'h3', text: 'WebP for the web' },
    {
      type: 'p',
      text: 'WebP does both jobs. Lossy WebP is usually noticeably smaller than an equivalent JPG; lossless WebP is usually smaller than an equivalent PNG; and unlike JPG it supports transparency. Every current browser reads it.',
    },
    {
      type: 'p',
      text: 'Its weakness is outside the browser. Older software, some print workflows and a number of desktop applications still do not open WebP, so it is the right choice for a web page and the wrong choice for a file you are emailing to someone who has to open it.',
    },
    {
      type: 'tool',
      toolId: 'image-converter',
      text: 'Convert between formats with control over quality, and see the resulting file size before you save.',
    },

    { type: 'h2', text: 'The conversions people actually need' },
    {
      type: 'ul',
      items: [
        'Screenshot too large to send — [PNG to WebP](/convert/png-to-webp) usually cuts it substantially with no visible change, provided the recipient can open WebP.',
        'JPG that needs a transparent background — [JPG to PNG](/convert/jpg-to-png) gives you a format that supports transparency, but it cannot create any. The white background is part of the picture and has to be removed by editing.',
        'Logo that comes out blurry — the source is probably a JPG. Find the vector original and [convert the SVG to PNG](/convert/svg-to-png) at the size you need instead.',
        'Photographs bloating a document — convert to JPG at around 80 per cent quality before inserting them, not after.',
      ],
    },

    { type: 'h2', text: 'Vectors are a different kind of thing' },
    {
      type: 'p',
      text: 'An SVG is not a grid of pixels but a set of drawing instructions, which is why it stays perfectly sharp at any size. Converting one to PNG or JPG fixes it at a single resolution, and enlarging the result afterwards will not recover the sharpness.',
    },
    {
      type: 'p',
      text: 'So export at the size you will actually use, or larger — twice the display size is a reasonable default for high-density screens. And keep the SVG, because it is the only version you can go back to.',
    },

    { type: 'h2', text: 'Quality settings that are worth using' },
    {
      type: 'p',
      text: 'Quality on a lossy format is a slider with badly diminishing returns at both ends.',
    },
    {
      type: 'ol',
      items: [
        'Around 80 to 85 per cent is the usual sweet spot for photographs. The file is a fraction of the size and the difference is difficult to see.',
        'Above 95 per cent, the file grows quickly and the visible improvement is close to nothing.',
        'Below 60 per cent, blocking and halos start to appear in flat areas and around edges.',
        'Judge on the real image at real size. A quality setting that looks fine on a thumbnail may not survive being viewed full screen.',
      ],
    },

    { type: 'h2', text: 'Images carry metadata too' },
    {
      type: 'p',
      text: 'Photographs from a phone or camera usually contain EXIF data: the date, the camera model, the settings, and often the GPS coordinates where the picture was taken. That travels with the file when it is shared.',
    },
    {
      type: 'p',
      text: 'Conversion frequently drops this, which is convenient but not something to rely on without checking. If it matters, [inspect the file](/file/file-metadata-viewer) before and after — and see [removing metadata before sharing](/guides/how-to-remove-metadata-from-a-document-before-sharing) for the general case.',
    },

    { type: 'h2', text: 'Converting without uploading' },
    {
      type: 'p',
      text: 'Every browser already contains a complete image codec, because displaying images is what browsers do. Decoding a picture and re-encoding it in another format needs nothing a server can provide, which makes an upload pure overhead — you wait for the file to travel in both directions to get a result your own machine could have produced immediately.',
    },
    {
      type: 'p',
      text: 'It also means the photograph, its metadata and its location stay on your device. For pictures of people, of documents, or of anywhere you happened to be standing, that is worth more than the seconds saved.',
    },
  ],
};
