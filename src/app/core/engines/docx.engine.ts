import type { DocBlock } from './doc-model';
import { htmlToDocument } from './html.engine';

/**
 * Word (.docx) reading.
 *
 * Two complementary paths: Mammoth reconstructs the visible document as
 * semantic HTML, and a direct read of the OOXML container gets at everything
 * Mammoth deliberately ignores — metadata, headers and footers, comments,
 * footnotes and the raw media.
 */

export interface DocxImage {
  readonly name: string;
  readonly mime: string;
  readonly bytes: number;
  readonly dataUrl: string;
  readonly width?: number;
  readonly height?: number;
}

export interface DocxMetadata {
  readonly core: Record<string, string>;
  readonly app: Record<string, string>;
  readonly custom: Record<string, string>;
}

export interface DocxContent {
  readonly html: string;
  readonly blocks: DocBlock[];
  readonly messages: readonly string[];
  readonly text: string;
}

/* ------------------------------------------------------------------
   Visible content, via Mammoth
   ------------------------------------------------------------------ */

/**
 * Mammoth is CommonJS, so a dynamic import hands back a namespace object whose
 * only member is `default`. Reading `mammoth.images` or `mammoth.convertToHtml`
 * straight off that namespace yields undefined, and the failure surfaces as a
 * confusing "cannot read properties of undefined" at the first property access
 * rather than at the import itself. Unwrapping here keeps both callers honest.
 */
async function loadMammoth() {
  return (await import('mammoth')).default;
}

export async function readDocx(file: Blob): Promise<DocxContent> {
  const mammoth = await loadMammoth();
  const arrayBuffer = await file.arrayBuffer();

  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      styleMap: [
        "p[style-name='Title'] => h1.title:fresh",
        "p[style-name='Subtitle'] => h2.subtitle:fresh",
        "p[style-name='Quote'] => blockquote:fresh",
        "p[style-name='Intense Quote'] => blockquote:fresh",
        "p[style-name='Code'] => pre:fresh",
        'b => strong',
        'i => em',
        'u => u',
        'strike => s',
      ],
      // Images are inlined as data URIs so nothing is ever fetched later.
      convertImage: mammoth.images.imgElement(async (image) => {
        const buffer = await image.read('base64');
        return { src: `data:${image.contentType};base64,${buffer}` };
      }),
    },
  );

  const html = result.value;
  const blocks = htmlToDocument(html);

  return {
    html,
    blocks,
    messages: result.messages.map((message) => message.message),
    text: blocks
      .map((block) => blockToText(block))
      .filter(Boolean)
      .join('\n\n'),
  };
}

function blockToText(block: DocBlock): string {
  switch (block.type) {
    case 'heading':
    case 'paragraph':
    case 'quote':
      return block.content.map((run) => run.text).join('');
    case 'list':
      return block.items.map((item) => item.content.map((run) => run.text).join('')).join('\n');
    case 'table':
      return [...(block.header ? [block.header] : []), ...block.rows]
        .map((row) => row.map((cell) => cell.map((run) => run.text).join('')).join('\t'))
        .join('\n');
    case 'code':
      return block.text;
    default:
      return '';
  }
}

/** Plain text only, which is much faster than a full HTML conversion. */
export async function extractDocxText(file: Blob): Promise<string> {
  const mammoth = await loadMammoth();
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return result.value;
}

/* ------------------------------------------------------------------
   Container-level access, via JSZip
   ------------------------------------------------------------------ */

async function openContainer(file: Blob): Promise<import('jszip')> {
  const JSZip = (await import('jszip')).default;
  try {
    return await JSZip.loadAsync(file);
  } catch {
    throw new Error('That file is not a valid .docx — the OOXML container could not be opened.');
  }
}

export async function extractDocxImages(file: Blob): Promise<DocxImage[]> {
  const zip = await openContainer(file);
  const images: DocxImage[] = [];

  const entries = Object.values(zip.files).filter(
    (entry) => !entry.dir && /^word\/media\//i.test(entry.name),
  );

  for (const entry of entries) {
    const base64 = await entry.async('base64');
    const mime = mimeForName(entry.name);
    const dataUrl = `data:${mime};base64,${base64}`;
    const size = await measure(dataUrl);
    images.push({
      name: entry.name.replace(/^word\/media\//i, ''),
      mime,
      // base64 inflates by 4/3, and pads with up to two '=' characters.
      bytes: Math.round((base64.length * 3) / 4) - (base64.match(/=+$/)?.[0].length ?? 0),
      dataUrl,
      ...size,
    });
  }

  return images.sort((a, b) => b.bytes - a.bytes);
}

function mimeForName(name: string): string {
  const extension = name.slice(name.lastIndexOf('.')).toLowerCase();
  switch (extension) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.bmp':
      return 'image/bmp';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    case '.emf':
    case '.wmf':
      return 'application/octet-stream';
    default:
      return 'application/octet-stream';
  }
}

function measure(dataUrl: string): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') return resolve({});
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({});
    image.src = dataUrl;
  });
}

const CORE_LABELS: Record<string, string> = {
  'dc:title': 'Title',
  'dc:subject': 'Subject',
  'dc:creator': 'Author',
  'cp:keywords': 'Keywords',
  'dc:description': 'Comments',
  'cp:lastModifiedBy': 'Last modified by',
  'cp:revision': 'Revision number',
  'dcterms:created': 'Created',
  'dcterms:modified': 'Modified',
  'cp:category': 'Category',
  'cp:contentStatus': 'Status',
  'cp:lastPrinted': 'Last printed',
};

const APP_LABELS: Record<string, string> = {
  Application: 'Application',
  AppVersion: 'Application version',
  Company: 'Company',
  Manager: 'Manager',
  Template: 'Template',
  TotalTime: 'Total editing time (minutes)',
  Pages: 'Pages',
  Words: 'Words',
  Characters: 'Characters',
  CharactersWithSpaces: 'Characters with spaces',
  Paragraphs: 'Paragraphs',
  Lines: 'Lines',
  DocSecurity: 'Document security flag',
};

export async function readDocxMetadata(file: Blob): Promise<DocxMetadata> {
  const zip = await openContainer(file);

  const core = await readXmlProperties(zip, 'docProps/core.xml', CORE_LABELS);
  const app = await readXmlProperties(zip, 'docProps/app.xml', APP_LABELS);
  const custom = await readCustomProperties(zip);

  return { core, app, custom };
}

async function readXmlProperties(
  zip: import('jszip'),
  path: string,
  labels: Record<string, string>,
): Promise<Record<string, string>> {
  const entry = zip.file(path);
  if (!entry) return {};

  const xml = await entry.async('text');
  const doc = parseXml(xml);
  if (!doc) return {};

  const out: Record<string, string> = {};
  for (const element of Array.from(doc.documentElement.children)) {
    const raw = element.textContent?.trim();
    if (!raw) continue;
    const label = labels[element.tagName] ?? labels[element.localName] ?? element.localName;
    out[label] = formatValue(label, raw);
  }
  return out;
}

async function readCustomProperties(zip: import('jszip')): Promise<Record<string, string>> {
  const entry = zip.file('docProps/custom.xml');
  if (!entry) return {};

  const doc = parseXml(await entry.async('text'));
  if (!doc) return {};

  const out: Record<string, string> = {};
  for (const property of Array.from(doc.getElementsByTagName('property'))) {
    const name = property.getAttribute('name');
    const value = property.firstElementChild?.textContent?.trim();
    if (name && value) out[name] = value;
  }
  return out;
}

function parseXml(xml: string): XMLDocument | null {
  if (typeof DOMParser === 'undefined') return null;
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  return doc.querySelector('parsererror') ? null : doc;
}

function formatValue(label: string, value: string): string {
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toLocaleString();
  }
  if (label === 'Total editing time (minutes)') {
    const minutes = Number(value);
    if (Number.isFinite(minutes) && minutes > 60) {
      return `${value} (${Math.floor(minutes / 60)}h ${minutes % 60}m)`;
    }
  }
  return value;
}

/**
 * Pulls text that Mammoth's body conversion leaves out: headers, footers,
 * footnotes, endnotes, comments and text boxes.
 */
export interface DocxExtraText {
  readonly headers: string[];
  readonly footers: string[];
  readonly footnotes: string[];
  readonly endnotes: string[];
  readonly comments: string[];
  readonly textBoxes: string[];
}

export async function extractDocxExtras(file: Blob): Promise<DocxExtraText> {
  const zip = await openContainer(file);

  const collect = async (pattern: RegExp): Promise<string[]> => {
    const out: string[] = [];
    for (const entry of Object.values(zip.files)) {
      if (entry.dir || !pattern.test(entry.name)) continue;
      const text = xmlToText(await entry.async('text'));
      if (text.trim()) out.push(text);
    }
    return out;
  };

  const documentXml = zip.file('word/document.xml');
  const textBoxes = documentXml ? extractTextBoxes(await documentXml.async('text')) : [];

  return {
    headers: await collect(/^word\/header\d*\.xml$/i),
    footers: await collect(/^word\/footer\d*\.xml$/i),
    footnotes: await collect(/^word\/footnotes\.xml$/i),
    endnotes: await collect(/^word\/endnotes\.xml$/i),
    comments: await collect(/^word\/comments\.xml$/i),
    textBoxes,
  };
}

/** Joins `w:t` runs, treating paragraph and break elements as line breaks. */
function xmlToText(xml: string): string {
  const doc = parseXml(xml);
  if (!doc) return '';

  const lines: string[] = [];
  for (const paragraph of Array.from(doc.getElementsByTagName('w:p'))) {
    const parts: string[] = [];
    for (const node of Array.from(paragraph.getElementsByTagName('w:t'))) {
      parts.push(node.textContent ?? '');
    }
    const line = parts.join('').trim();
    if (line) lines.push(line);
  }
  return lines.join('\n');
}

function extractTextBoxes(xml: string): string[] {
  const doc = parseXml(xml);
  if (!doc) return [];

  const out: string[] = [];
  for (const box of Array.from(doc.getElementsByTagName('w:txbxContent'))) {
    const text = Array.from(box.getElementsByTagName('w:t'))
      .map((node) => node.textContent ?? '')
      .join('')
      .trim();
    if (text) out.push(text);
  }
  return out;
}

/* ------------------------------------------------------------------
   Word counting
   ------------------------------------------------------------------ */

export interface TextStatistics {
  readonly words: number;
  readonly characters: number;
  readonly charactersNoSpaces: number;
  readonly sentences: number;
  readonly paragraphs: number;
  readonly lines: number;
  readonly uniqueWords: number;
  readonly averageWordLength: number;
  readonly averageSentenceLength: number;
  readonly readingMinutes: number;
  readonly speakingMinutes: number;
  readonly estimatedPages: number;
  readonly longestWord: string;
  readonly keywords: readonly { word: string; count: number; density: number }[];
}

/** Words that carry no topical signal, so they never head the density table. */
const STOP_WORDS = new Set(
  ('a about above after again against all am an and any are as at be because been before being ' +
    'below between both but by can cannot could did do does doing down during each few for from ' +
    'further had has have having he her here hers herself him himself his how i if in into is it ' +
    'its itself me more most my myself no nor not of off on once only or other ought our ours ' +
    'ourselves out over own same she should so some such than that the their theirs them ' +
    'themselves then there these they this those through to too under until up very was we were ' +
    'what when where which while who whom why with would you your yours yourself yourselves')
    .split(' '),
);

export function analyseText(text: string): TextStatistics {
  const normalised = text.replace(/\r\n?/g, '\n');
  const trimmed = normalised.trim();

  const wordMatches = trimmed.match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) ?? [];
  const words = wordMatches.length;

  const characters = normalised.length;
  const charactersNoSpaces = normalised.replace(/\s/g, '').length;

  // Abbreviations make naive sentence splitting over-count; requiring a
  // following space plus capital letter is a reasonable compromise.
  const sentences = trimmed
    ? (trimmed.match(/[.!?]+(?=\s+[A-ZÀ-ɏ"'(]|\s*$)/g) ?? []).length || (words ? 1 : 0)
    : 0;

  const paragraphs = trimmed ? trimmed.split(/\n\s*\n/).filter((p) => p.trim()).length : 0;
  const lines = trimmed ? normalised.split('\n').length : 0;

  const counts = new Map<string, number>();
  let longestWord = '';
  let totalLength = 0;

  for (const raw of wordMatches) {
    const word = raw.toLowerCase();
    totalLength += raw.length;
    if (raw.length > longestWord.length) longestWord = raw;
    if (STOP_WORDS.has(word) || word.length < 3) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  const keywords = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word, count]) => ({
      word,
      count,
      density: words ? (count / words) * 100 : 0,
    }));

  return {
    words,
    characters,
    charactersNoSpaces,
    sentences,
    paragraphs,
    lines,
    uniqueWords: new Set(wordMatches.map((word) => word.toLowerCase())).size,
    averageWordLength: words ? totalLength / words : 0,
    averageSentenceLength: sentences ? words / sentences : 0,
    // 238 wpm silent reading, 140 wpm aloud — both widely cited averages.
    readingMinutes: words / 238,
    speakingMinutes: words / 140,
    estimatedPages: words / 500,
    longestWord,
    keywords,
  };
}

/* ------------------------------------------------------------------
   Comparison
   ------------------------------------------------------------------ */

export type DiffOp = 'equal' | 'insert' | 'delete';

export interface DiffSegment {
  readonly op: DiffOp;
  readonly text: string;
}

export interface DiffLine {
  readonly op: DiffOp;
  readonly left?: string;
  readonly right?: string;
  readonly segments?: readonly DiffSegment[];
}

export interface DiffSummary {
  readonly lines: DiffLine[];
  readonly added: number;
  readonly removed: number;
  readonly unchanged: number;
  readonly similarity: number;
}

/**
 * Paragraph-level diff with a word-level refinement inside changed pairs.
 *
 * Uses a standard LCS table. Inputs are capped because the table is O(n·m) —
 * beyond a few thousand paragraphs the memory cost stops being reasonable in
 * a browser tab.
 */
export function diffTexts(left: string, right: string): DiffSummary {
  const a = splitParagraphs(left);
  const b = splitParagraphs(right);

  const lines = lcsDiff(a, b).map((entry) => {
    if (entry.op !== 'replace') {
      return {
        op: entry.op,
        left: entry.left,
        right: entry.right,
      } as DiffLine;
    }
    return {
      op: 'delete' as DiffOp,
      left: entry.left,
      right: entry.right,
      segments: wordDiff(entry.left ?? '', entry.right ?? ''),
    };
  });

  const added = lines.filter((line) => line.op === 'insert').length;
  const removed = lines.filter((line) => line.op === 'delete').length;
  const unchanged = lines.filter((line) => line.op === 'equal').length;
  const total = added + removed + unchanged;

  return {
    lines,
    added,
    removed,
    unchanged,
    similarity: total ? (unchanged / total) * 100 : 100,
  };
}

function splitParagraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 4000);
}

interface RawDiff {
  op: DiffOp | 'replace';
  left?: string;
  right?: string;
}

function lcsDiff(a: readonly string[], b: readonly string[]): RawDiff[] {
  const rows = a.length;
  const columns = b.length;

  // table[i][j] = length of the LCS of a[i:] and b[j:]
  const table: number[][] = Array.from({ length: rows + 1 }, () =>
    new Array<number>(columns + 1).fill(0),
  );

  for (let i = rows - 1; i >= 0; i--) {
    for (let j = columns - 1; j >= 0; j--) {
      table[i][j] =
        a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const out: RawDiff[] = [];
  let i = 0;
  let j = 0;

  while (i < rows && j < columns) {
    if (a[i] === b[j]) {
      out.push({ op: 'equal', left: a[i], right: b[j] });
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      // A deletion immediately followed by an insertion reads better as an
      // edit of one paragraph than as two unrelated changes.
      if (j < columns && table[i + 1][j + 1] >= table[i + 1][j] && similarEnough(a[i], b[j])) {
        out.push({ op: 'replace', left: a[i], right: b[j] });
        i++;
        j++;
      } else {
        out.push({ op: 'delete', left: a[i] });
        i++;
      }
    } else {
      out.push({ op: 'insert', right: b[j] });
      j++;
    }
  }

  while (i < rows) out.push({ op: 'delete', left: a[i++] });
  while (j < columns) out.push({ op: 'insert', right: b[j++] });

  return out;
}

/** Cheap similarity test used to pair up edited paragraphs. */
function similarEnough(a: string, b: string): boolean {
  if (!a || !b) return false;
  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  if (longer.length > shorter.length * 3) return false;

  const aWords = new Set(a.toLowerCase().split(/\s+/));
  const bWords = b.toLowerCase().split(/\s+/);
  const shared = bWords.filter((word) => aWords.has(word)).length;
  return shared / Math.max(bWords.length, 1) > 0.4;
}

function wordDiff(left: string, right: string): DiffSegment[] {
  const a = left.split(/(\s+)/);
  const b = right.split(/(\s+)/);
  const raw = lcsDiff(a, b);

  const segments: DiffSegment[] = [];
  for (const entry of raw) {
    const op: DiffOp = entry.op === 'replace' ? 'delete' : entry.op;
    const text = op === 'insert' ? (entry.right ?? '') : (entry.left ?? '');
    if (!text) continue;

    const previous = segments[segments.length - 1];
    if (previous?.op === op) {
      segments[segments.length - 1] = { op, text: previous.text + text };
    } else {
      segments.push({ op, text });
    }

    if (entry.op === 'replace' && entry.right) {
      segments.push({ op: 'insert', text: entry.right });
    }
  }
  return segments;
}
