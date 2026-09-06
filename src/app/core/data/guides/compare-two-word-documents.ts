import type { GuideDefinition } from '../../models/guide.model';

export const guide: GuideDefinition = {
  slug: 'how-to-compare-two-word-documents',
  title: 'How to compare two Word documents and see what changed',
  summary:
    'How document comparison works, why it disagrees with tracked changes, the edits a diff cannot see, and how to compare two contract drafts without sending either to a server.',
  answer:
    'Open both files in a comparison tool and it will show you the text that was added, removed and left alone. Comparison reads the finished documents, so it finds every difference regardless of whether anyone turned tracking on — but it works on words, which means moved paragraphs look like a deletion plus an insertion, and formatting-only changes may not show at all.',
  keywords: [
    'compare two word documents',
    'word document diff',
    'find changes between two documents',
    'compare contract versions',
    'track changes vs compare',
  ],
  tools: ['compare-docx', 'docx-viewer', 'word-count'],
  published: '2026-09-06',
  body: [
    {
      type: 'p',
      text: 'Two files called contract-final.docx and contract-final-v2.docx, no tracked changes, and nobody willing to say what moved. It is one of the most common document problems there is, and comparison solves it directly — provided you know what a comparison can and cannot see.',
    },

    { type: 'h2', text: 'Comparison and tracked changes are different things' },
    {
      type: 'p',
      text: 'They are easy to confuse because both end up showing insertions and deletions, but they work from opposite ends of the problem.',
    },
    {
      type: 'p',
      text: 'Tracked changes are a recording. Word writes each edit into the file as it happens, along with who made it and when. That is rich information, and it only exists if tracking was switched on before the editing started. Turn it on afterwards and everything already changed is invisible.',
    },
    {
      type: 'p',
      text: 'Comparison is a reconstruction. It reads two finished documents and works out what differs, with no dependence on anyone having remembered anything. It cannot tell you who made a change or in what order, but it will not miss one either.',
    },
    {
      type: 'note',
      title: 'Which to reach for',
      text: 'Tracking is better when you control the process and want attribution. Comparison is better when you have received a document back and simply need to know what is different — which is most of the time, and is the situation people actually find themselves in.',
    },

    { type: 'h2', text: 'How a document diff works' },
    {
      type: 'p',
      text: 'A comparison tool extracts the text of both documents in reading order, breaks it into units — usually words — and finds the longest sequences the two versions share. Everything between those matches is what changed: present only in the original means deleted, present only in the revision means inserted.',
    },
    {
      type: 'p',
      text: 'Working at the word level rather than the line or paragraph level matters. A paragraph where one number changed should highlight the number, not the paragraph, or a legal review turns into rereading the whole document with extra colour.',
    },
    {
      type: 'tool',
      toolId: 'compare-docx',
      text: 'Open two .docx files side by side and see every insertion and deletion marked in the text.',
    },

    { type: 'h2', text: 'What a diff cannot see' },
    {
      type: 'p',
      text: 'This is the part worth reading before relying on a comparison for anything important.',
    },
    { type: 'h3', text: 'Moved text looks like two separate edits' },
    {
      type: 'p',
      text: 'A clause moved from section 3 to section 9 has no special representation. It appears as a deletion in one place and an insertion in another, and it is on you to notice they are the same words. In a long document with several moves, this is where a review gets genuinely difficult.',
    },
    { type: 'h3', text: 'Formatting changes may not register' },
    {
      type: 'p',
      text: 'If a comparison works on text, then bold, italics, font size, colour, indentation, margins and page breaks are all invisible to it. The words are identical, so nothing is reported. That is usually what you want, and occasionally exactly what you needed to know — for instance when a heading has quietly stopped being a heading.',
    },
    { type: 'h3', text: 'Content outside the text flow' },
    {
      type: 'p',
      text: 'Headers, footers, footnotes, comments, text boxes and the contents of embedded objects sit outside the main body. Depending on how the text was extracted, changes there may not appear. Check page numbering, footers and any signature block by eye.',
    },
    {
      type: 'note',
      tone: 'warn',
      title: 'Tables are the common trap',
      text: 'Table content is compared as text, so a changed cell is caught. Structural changes — a column inserted, two rows merged, a table split in half — may be reported strangely or not at all, because the words can be identical while the structure is entirely different. Compare tables visually as well as textually.',
    },
    { type: 'h3', text: 'Images' },
    {
      type: 'p',
      text: 'A replaced image contains no text to compare. If a diagram or a signature graphic matters, check it directly — [opening both files in a viewer](/viewer/word-viewer) side by side takes a few seconds.',
    },

    { type: 'h2', text: 'Reading the result well' },
    {
      type: 'ol',
      items: [
        'Look for deletions before insertions. Removed obligations are far easier to miss than added ones, and cause more trouble.',
        'Treat every deletion-and-insertion pair as a possible move rather than two unrelated edits, especially in structured documents.',
        'Check the numbers specifically — dates, amounts, percentages, notice periods. A single-digit change is small on screen and large in effect.',
        'Watch for negation. “Shall” to “shall not” is two characters and reverses the meaning of a clause.',
        'Scan the unchanged sections briefly at the end. Knowing what did not move is part of the answer, and it is the part a highlighted diff trains you to skip.',
      ],
    },

    { type: 'h2', text: 'A quick sanity check before you start' },
    {
      type: 'p',
      text: 'If you are unsure whether two files differ meaningfully at all, [word counts](/word/word-count) give you a cheap first signal. Identical counts do not prove the documents are the same — words can be swapped one for one — but a difference of several hundred tells you the scale of what you are about to read.',
    },

    { type: 'h2', text: 'Why this one is worth doing locally' },
    {
      type: 'p',
      text: 'Comparison is almost always applied to the documents you would least like to upload: contracts under negotiation, offer letters, policies before publication, drafts of something not yet announced. And it needs two of them rather than one.',
    },
    {
      type: 'p',
      text: 'A browser-based comparison reads both files in memory on your own machine and shows you the differences. Neither version is transmitted, which means the more confidential the pair, the less reason there is to use anything else. That is the opposite of the usual trade-off, and it is worth taking advantage of.',
    },
  ],
};
