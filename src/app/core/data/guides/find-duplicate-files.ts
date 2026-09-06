import type { GuideDefinition } from '../../models/guide.model';

export const guide: GuideDefinition = {
  slug: 'how-to-find-duplicate-files-on-your-computer',
  title: 'How to find duplicate files without a cloud scanner',
  summary:
    'Why matching on name and size is not enough, how a file hash proves two files are identical, which copy to keep, and how to check a folder without a program that indexes your disk.',
  answer:
    'Compare file hashes, not names. Two files with the same name and size can differ, and two identical files often have different names — a hash reads the actual bytes and produces a short fingerprint, so matching fingerprints means matching content. Anything else is a guess.',
  keywords: [
    'find duplicate files',
    'duplicate file finder',
    'compare files by hash',
    'checksum two files identical',
    'delete duplicate photos safely',
  ],
  tools: ['duplicate-file-detector', 'file-hash-generator', 'file-metadata'],
  published: '2026-09-06',
  body: [
    {
      type: 'p',
      text: 'Duplicates accumulate without anyone deciding to make them: a download clicked twice, a folder copied “just in case”, photos imported from a phone that had already been imported. The files are easy to find and easy to get wrong, and getting it wrong means deleting the only copy of something.',
    },

    { type: 'h2', text: 'Why name and size are not enough' },
    {
      type: 'p',
      text: 'The obvious approach is to look for files sharing a name and a size. It is fast, and it is wrong in both directions.',
    },
    {
      type: 'p',
      text: 'It reports duplicates that are not duplicates. Two different photographs from the same camera can share a file name and land within bytes of each other in size. Two exports of a report on different days are the same name and near enough the same length, and one of them is out of date.',
    },
    {
      type: 'p',
      text: 'It also misses real duplicates. The same file saved as invoice.pdf, invoice(1).pdf and Scan_20260114.pdf is three names for identical content, and nothing about the names says so.',
    },

    { type: 'h2', text: 'What a hash does' },
    {
      type: 'p',
      text: 'A hash function reads every byte of a file and produces a short fixed-length string — a fingerprint. Change a single byte anywhere and the fingerprint changes completely.',
    },
    {
      type: 'p',
      text: 'That gives you the property you actually want. Two files with the same SHA-256 hash are, for every practical purpose, the same file: same bytes, whatever they are named, wherever they sit, whatever the timestamps say. Different hashes mean genuinely different content, even if everything else about them matches.',
    },
    {
      type: 'note',
      title: 'A hash is not a summary you can read',
      text: 'It tells you whether two files are identical and nothing else. It cannot tell you which is newer, which is better, or what the difference is. That is precisely why it is trustworthy — there is no interpretation involved.',
    },
    {
      type: 'tool',
      toolId: 'duplicate-file-detector',
      text: 'Select a set of files and see which are byte-for-byte identical, grouped together.',
    },

    { type: 'h2', text: 'Checking one specific pair' },
    {
      type: 'p',
      text: 'Sometimes the question is narrower: is this download the same as the one I already have? Generate a [hash for each file](/file/file-hash-generator) and compare the two strings. Identical means identical; anything else means not.',
    },
    {
      type: 'p',
      text: 'The same technique verifies a download against a checksum published by whoever distributed it. A match confirms the file arrived complete and unaltered, which is worth doing for installers and disk images regardless of duplicates.',
    },

    { type: 'h2', text: 'Which copy to keep' },
    {
      type: 'p',
      text: 'If the contents are identical, the file itself gives you no reason to prefer one. Decide on location and context instead.',
    },
    {
      type: 'ul',
      items: [
        'Keep the one in the folder where it belongs, and delete the copy in Downloads or on the desktop. Location is the only thing that differs, so location should decide.',
        'Keep the one with the more descriptive name. Between Scan_20260114.pdf and 2026 tax return.pdf, only one will make sense in two years.',
        'Prefer the older file when timestamps differ but content does not. The newer one is usually the copy.',
        'Be careful with anything referenced by something else. A duplicate image inside a project folder may be linked from a document, and deleting it breaks the link even though an identical file exists elsewhere.',
      ],
    },
    {
      type: 'p',
      text: 'Where the dates matter to the decision, [file metadata](/file/file-metadata-viewer) shows created and modified times alongside the size.',
    },

    { type: 'h2', text: 'What identical does not mean' },
    {
      type: 'p',
      text: 'Byte-for-byte identical is a strict test, and its strictness cuts both ways.',
    },
    {
      type: 'ul',
      items: [
        'Two exports of the same photograph at different quality settings are different files. Both are kept, and one is probably redundant — but a hash cannot tell you that.',
        'A document saved twice by the same word processor may differ, because some formats record a timestamp or an editing session identifier inside the file.',
        'A file and its compressed version are entirely different, obviously, but people are sometimes surprised that renaming a file does not change its hash at all. The name is not part of the content.',
      ],
    },
    {
      type: 'note',
      tone: 'warn',
      title: 'Copy before you delete',
      text: 'Deleting duplicates is one of the few operations that is both routine and irreversible. Move candidates to a holding folder, work for a week, then empty it. Two copies of a file is a minor inconvenience; nought copies is a real problem.',
    },

    { type: 'h2', text: 'The trouble with cloud duplicate finders' },
    {
      type: 'p',
      text: 'To find duplicates across your files, a tool must read your files. A service that does this on a server must first receive them — which means uploading the entire set being checked, including whatever is in it, in order to be told that two of them are the same.',
    },
    {
      type: 'p',
      text: 'That is an unusually poor trade. The result is a small list of matches; the cost is a full copy of a folder that probably contains documents, photographs and correspondence, transferred to somebody else’s storage to produce it.',
    },
    {
      type: 'p',
      text: 'Hashing needs no server at all. Your browser can read a file and compute its fingerprint locally, at whatever speed your machine manages, and compare fingerprints without any file leaving the device. The comparison is exact, and nothing is sent anywhere — see [what actually happens when you upload a file](/guides/what-happens-when-you-upload-a-file-to-a-converter) for why that distinction is worth insisting on.',
    },
  ],
};
