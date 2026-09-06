import type { GuideDefinition } from '../../models/guide.model';

export const guide: GuideDefinition = {
  slug: 'how-to-convert-markdown-to-word-pdf-or-html',
  title: 'How to convert Markdown to Word, PDF or HTML',
  summary:
    'What survives the conversion from Markdown and what does not, why tables and code blocks are the two things to check, and how to produce a .docx for someone who does not want a text file.',
  answer:
    'Markdown is plain text with a structure, so conversion maps that structure onto the target format: headings become real headings, lists become real lists. Standard Markdown converts cleanly. The parts that break are the extensions — tables, footnotes, diagrams and front matter are not part of the original specification, and support for them varies by converter.',
  keywords: [
    'convert markdown to word',
    'markdown to docx',
    'markdown to pdf',
    'markdown to html',
    'markdown converter',
  ],
  tools: ['markdown-to-docx', 'markdown-to-pdf', 'markdown-to-html', 'markdown-viewer'],
  published: '2026-09-06',
  body: [
    {
      type: 'p',
      text: 'Markdown is a good place to write and a poor place to deliver. Notes, documentation and drafts live happily as .md files until somebody asks for the document, at which point it has to become something they can open. That conversion is usually clean, and where it is not, the reasons are predictable.',
    },

    { type: 'h2', text: 'Why the conversion works at all' },
    {
      type: 'p',
      text: 'Markdown is not simply text that looks tidy. A line beginning with a hash is a heading, a line beginning with a dash is a list item, and a converter parses those into a structured document before writing anything out.',
    },
    {
      type: 'p',
      text: 'This is what makes the output genuinely useful rather than a wall of monospaced text. A heading in the converted .docx is a real Word heading, which means it appears in the navigation pane and in a generated table of contents. A list is a real list, and it renumbers itself when edited.',
    },
    {
      type: 'p',
      text: 'Pasting Markdown into Word gives you none of that. It gives you the source, with the hashes and asterisks intact.',
    },

    { type: 'h2', text: 'Choosing the target format' },
    { type: 'h3', text: 'Word, for documents other people will edit' },
    {
      type: 'p',
      text: 'A [.docx](/convert/markdown-to-word) is the right answer when the document is going to a colleague who will comment on it, track changes in it, or drop it into a template with the company styles. It carries structure, which is what makes it editable rather than merely openable.',
    },
    { type: 'h3', text: 'PDF, for documents that are finished' },
    {
      type: 'p',
      text: '[PDF](/convert/markdown-to-pdf) fixes the layout. Use it when the document is done and should look identical for everyone — a specification being circulated, a report being filed, anything that should not be casually altered.',
    },
    { type: 'h3', text: 'HTML, for the web and for email' },
    {
      type: 'p',
      text: '[HTML](/convert/markdown-to-html) is the closest relative of the three; Markdown was designed as a shorthand for it, and the mapping is nearly one to one. It is also the most reliable way to get formatted text into an email client or a content system that expects markup.',
    },

    { type: 'h2', text: 'What converts cleanly' },
    {
      type: 'p',
      text: 'Everything in the original Markdown specification, which is most of what people write.',
    },
    {
      type: 'ul',
      items: [
        'Headings at every level, mapped to the target format’s own heading styles.',
        'Paragraphs, including the blank-line rule that separates them.',
        'Bulleted and numbered lists, nested to any depth.',
        'Bold, italic and inline code.',
        'Links, which stay clickable in all three formats.',
        'Block quotes.',
        'Horizontal rules.',
        'Code blocks, though how they are styled varies considerably.',
      ],
    },
    {
      type: 'tool',
      toolId: 'markdown-to-docx',
      text: 'Turn a Markdown file into a .docx with real Word headings, lists and links.',
    },

    { type: 'h2', text: 'What to check afterwards' },
    { type: 'h3', text: 'Tables' },
    {
      type: 'p',
      text: 'Pipe tables are an extension rather than part of the original Markdown, and they are the single most common thing to arrive wrong. Column alignment markers are frequently dropped, and a converter that does not support the syntax at all will emit the pipes as literal text. If your document contains tables, look at them first.',
    },
    { type: 'h3', text: 'Code blocks' },
    {
      type: 'p',
      text: 'The code survives; the syntax highlighting usually does not. HTML output can keep colour, a .docx generally reduces to a monospaced block, and long lines may wrap in a way that changes what the code appears to say. For anything where indentation carries meaning, check the result rather than assuming.',
    },
    { type: 'h3', text: 'Images' },
    {
      type: 'p',
      text: 'Markdown references images by path rather than embedding them. A converter has to resolve that path and pull the file in, and a relative path pointing at a folder it cannot see produces a broken reference. Keep images alongside the .md file, and check they arrived.',
    },
    {
      type: 'note',
      tone: 'warn',
      title: 'Front matter and diagram blocks',
      text: 'A YAML block at the top of the file — title, date, tags — is a static-site convention, not Markdown. Some converters strip it, some print it as text at the top of your document. Fenced diagram blocks are the same: text that a documentation site renders as a picture, and a converter almost certainly renders as the text it is.',
    },

    { type: 'h2', text: 'Round trips lose things' },
    {
      type: 'p',
      text: 'Converting Markdown to Word and back to Markdown does not return the file you started with. Markdown has one way to express a heading and Word has many, so the return journey has to make choices about what a given piece of formatting was meant to be.',
    },
    {
      type: 'p',
      text: 'Keep the .md file as the source and treat every conversion as an export. Editing the .docx and converting back means the two versions have diverged, and the Markdown one is now wrong.',
    },
    {
      type: 'p',
      text: 'The other direction has the same character: [Word to Markdown](/word/word-to-markdown) is a genuine simplification, and formatting with no Markdown equivalent is discarded rather than approximated.',
    },

    { type: 'h2', text: 'Check the source before converting' },
    {
      type: 'p',
      text: 'Most conversion surprises are already visible in the Markdown itself — a list that does not nest because the indentation is inconsistent, a table missing its separator row, a code fence that was never closed and has swallowed the rest of the document.',
    },
    {
      type: 'p',
      text: 'Opening the file in a [Markdown viewer](/viewer/markdown-viewer) first shows you the structure the parser sees. If it is wrong there, no converter is going to improve it.',
    },

    { type: 'h2', text: 'Where the conversion happens' },
    {
      type: 'p',
      text: 'Parsing Markdown and writing a .docx are both ordinary text operations, and a browser is entirely capable of doing them. There is no compute here that requires a server, which makes an upload a round trip that buys nothing.',
    },
    {
      type: 'p',
      text: 'It also matters more than it might seem. Markdown is what people keep meeting notes, internal documentation, drafts and personal writing in — the working material rather than the published output. Converting it locally means the finished document is the only copy that ever leaves the machine.',
    },
  ],
};
