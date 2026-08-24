/**
 * File inspection: real format detection, metadata and container analysis.
 *
 * Extensions lie. Everything here works from the bytes themselves, which is
 * what makes the signature checker useful and the size analyser accurate.
 */

export interface FileSignature {
  readonly format: string;
  readonly mime: string;
  readonly extensions: readonly string[];
  /** Byte values; `null` matches any byte at that offset. */
  readonly magic: readonly (number | null)[];
  readonly offset?: number;
  readonly category: 'document' | 'image' | 'archive' | 'audio' | 'video' | 'executable' | 'other';
  /** Extra check for containers that share a magic number, e.g. ZIP-based. */
  readonly refine?: (bytes: Uint8Array) => string | null;
}

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];

/** Signature table, most specific first. */
export const SIGNATURES: readonly FileSignature[] = [
  {
    format: 'PDF document',
    mime: 'application/pdf',
    extensions: ['.pdf'],
    magic: [0x25, 0x50, 0x44, 0x46, 0x2d],
    category: 'document',
  },
  {
    format: 'ZIP archive',
    mime: 'application/zip',
    extensions: ['.zip'],
    magic: ZIP_MAGIC,
    category: 'archive',
    // OOXML and ODF are ZIPs; the first entry name tells them apart.
    refine: (bytes) => {
      const head = ascii(bytes, 0, Math.min(bytes.length, 4096));
      if (head.includes('word/')) return 'Word document (.docx)';
      if (head.includes('xl/')) return 'Excel workbook (.xlsx)';
      if (head.includes('ppt/')) return 'PowerPoint presentation (.pptx)';
      if (head.includes('mimetypeapplication/vnd.oasis.opendocument.text')) {
        return 'OpenDocument text (.odt)';
      }
      if (head.includes('mimetypeapplication/vnd.oasis.opendocument.spreadsheet')) {
        return 'OpenDocument spreadsheet (.ods)';
      }
      if (head.includes('META-INF/MANIFEST.MF')) return 'Java archive (.jar)';
      if (head.includes('AndroidManifest.xml')) return 'Android package (.apk)';
      if (head.includes('mimetypeapplication/epub+zip')) return 'EPUB book (.epub)';
      return null;
    },
  },
  {
    format: 'Legacy Office document',
    mime: 'application/x-cfb',
    extensions: ['.doc', '.xls', '.ppt', '.msg'],
    magic: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
    category: 'document',
  },
  {
    format: 'PNG image',
    mime: 'image/png',
    extensions: ['.png'],
    magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    category: 'image',
  },
  {
    format: 'JPEG image',
    mime: 'image/jpeg',
    extensions: ['.jpg', '.jpeg'],
    magic: [0xff, 0xd8, 0xff],
    category: 'image',
  },
  {
    format: 'GIF image',
    mime: 'image/gif',
    extensions: ['.gif'],
    magic: [0x47, 0x49, 0x46, 0x38],
    category: 'image',
  },
  {
    format: 'WebP image',
    mime: 'image/webp',
    extensions: ['.webp'],
    magic: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50],
    category: 'image',
  },
  {
    format: 'BMP image',
    mime: 'image/bmp',
    extensions: ['.bmp'],
    magic: [0x42, 0x4d],
    category: 'image',
  },
  {
    format: 'TIFF image',
    mime: 'image/tiff',
    extensions: ['.tif', '.tiff'],
    magic: [0x49, 0x49, 0x2a, 0x00],
    category: 'image',
  },
  {
    format: 'AVIF or HEIF image',
    mime: 'image/avif',
    extensions: ['.avif', '.heic'],
    magic: [null, null, null, null, 0x66, 0x74, 0x79, 0x70],
    category: 'image',
  },
  {
    format: 'ICO icon',
    mime: 'image/x-icon',
    extensions: ['.ico'],
    magic: [0x00, 0x00, 0x01, 0x00],
    category: 'image',
  },
  {
    format: 'GZIP archive',
    mime: 'application/gzip',
    extensions: ['.gz'],
    magic: [0x1f, 0x8b],
    category: 'archive',
  },
  {
    format: 'RAR archive',
    mime: 'application/vnd.rar',
    extensions: ['.rar'],
    magic: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07],
    category: 'archive',
  },
  {
    format: '7-Zip archive',
    mime: 'application/x-7z-compressed',
    extensions: ['.7z'],
    magic: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c],
    category: 'archive',
  },
  {
    format: 'MP3 audio',
    mime: 'audio/mpeg',
    extensions: ['.mp3'],
    magic: [0x49, 0x44, 0x33],
    category: 'audio',
  },
  {
    format: 'WAV audio',
    mime: 'audio/wav',
    extensions: ['.wav'],
    magic: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x41, 0x56, 0x45],
    category: 'audio',
  },
  {
    format: 'OGG media',
    mime: 'application/ogg',
    extensions: ['.ogg', '.oga', '.ogv'],
    magic: [0x4f, 0x67, 0x67, 0x53],
    category: 'audio',
  },
  {
    format: 'FLAC audio',
    mime: 'audio/flac',
    extensions: ['.flac'],
    magic: [0x66, 0x4c, 0x61, 0x43],
    category: 'audio',
  },
  {
    format: 'Matroska video',
    mime: 'video/x-matroska',
    extensions: ['.mkv', '.webm'],
    magic: [0x1a, 0x45, 0xdf, 0xa3],
    category: 'video',
  },
  {
    format: 'Windows executable',
    mime: 'application/vnd.microsoft.portable-executable',
    extensions: ['.exe', '.dll'],
    magic: [0x4d, 0x5a],
    category: 'executable',
  },
  {
    format: 'ELF executable',
    mime: 'application/x-elf',
    extensions: ['.so', '.elf'],
    magic: [0x7f, 0x45, 0x4c, 0x46],
    category: 'executable',
  },
  {
    format: 'Shell script',
    mime: 'text/x-shellscript',
    extensions: ['.sh'],
    magic: [0x23, 0x21],
    category: 'executable',
  },
  {
    format: 'RTF document',
    mime: 'application/rtf',
    extensions: ['.rtf'],
    magic: [0x7b, 0x5c, 0x72, 0x74, 0x66],
    category: 'document',
  },
  {
    format: 'SQLite database',
    mime: 'application/vnd.sqlite3',
    extensions: ['.sqlite', '.db'],
    magic: [0x53, 0x51, 0x4c, 0x69, 0x74, 0x65],
    category: 'other',
  },
  {
    format: 'WOFF2 font',
    mime: 'font/woff2',
    extensions: ['.woff2'],
    magic: [0x77, 0x4f, 0x46, 0x32],
    category: 'other',
  },
];

export interface DetectionResult {
  readonly format: string;
  readonly mime: string;
  readonly category: FileSignature['category'];
  readonly expectedExtensions: readonly string[];
  /** True when the extension does not match what the bytes say. */
  readonly mismatch: boolean;
  readonly declaredExtension: string;
  readonly declaredMime: string;
  /** First bytes, rendered as hex for display. */
  readonly hex: string;
  readonly ascii: string;
  readonly confidence: 'high' | 'medium' | 'none';
}

export async function detectFormat(file: File): Promise<DetectionResult> {
  const head = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
  const declaredExtension = extensionOf(file.name);

  let matched: FileSignature | null = null;
  let refined: string | null = null;

  for (const signature of SIGNATURES) {
    if (!matches(head, signature)) continue;
    matched = signature;
    refined = signature.refine?.(head) ?? null;
    break;
  }

  const textLike = !matched && looksTextual(head);

  const format = refined ?? matched?.format ?? (textLike ? 'Plain text' : 'Unrecognised binary');
  const expected = refined
    ? [refinedExtension(refined)]
    : (matched?.extensions ?? (textLike ? ['.txt', '.csv', '.json', '.xml', '.md'] : []));

  return {
    format,
    mime: matched?.mime ?? (textLike ? 'text/plain' : 'application/octet-stream'),
    category: matched?.category ?? (textLike ? 'document' : 'other'),
    expectedExtensions: expected,
    mismatch:
      expected.length > 0 && !!declaredExtension && !expected.includes(declaredExtension),
    declaredExtension,
    declaredMime: file.type || '(none reported)',
    hex: toHex(head.slice(0, 16)),
    ascii: toPrintableAscii(head.slice(0, 16)),
    confidence: matched ? 'high' : textLike ? 'medium' : 'none',
  };
}

function refinedExtension(format: string): string {
  const match = format.match(/\((\.[a-z0-9]+)\)/i);
  return match ? match[1] : '.zip';
}

function matches(bytes: Uint8Array, signature: FileSignature): boolean {
  const offset = signature.offset ?? 0;
  if (bytes.length < offset + signature.magic.length) return false;
  return signature.magic.every(
    (value, index) => value === null || bytes[offset + index] === value,
  );
}

/** Heuristic: mostly printable, no NULs in the first block. */
function looksTextual(bytes: Uint8Array): boolean {
  if (!bytes.length) return false;
  let printable = 0;
  for (const byte of bytes) {
    if (byte === 0) return false;
    if (byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte < 127) || byte >= 128) {
      printable++;
    }
  }
  return printable / bytes.length > 0.9;
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  let out = '';
  for (let i = start; i < end; i++) {
    const byte = bytes[i];
    out += byte >= 32 && byte < 127 ? String.fromCharCode(byte) : ' ';
  }
  return out;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join(' ');
}

function toPrintableAscii(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => (byte >= 32 && byte < 127 ? String.fromCharCode(byte) : '.'))
    .join('');
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot).toLowerCase() : '';
}

/* ------------------------------------------------------------------
   Format-specific metadata
   ------------------------------------------------------------------ */

export interface MetadataGroup {
  readonly title: string;
  readonly entries: readonly { key: string; value: string }[];
}

/** Reads whatever properties the file's own format exposes. */
export async function readFileMetadata(file: File): Promise<MetadataGroup[]> {
  const detection = await detectFormat(file);
  const groups: MetadataGroup[] = [
    {
      title: 'File',
      entries: [
        { key: 'Name', value: file.name },
        { key: 'Size', value: `${file.size.toLocaleString()} bytes` },
        { key: 'Type reported by browser', value: file.type || '(none)' },
        { key: 'Detected format', value: detection.format },
        { key: 'Last modified', value: new Date(file.lastModified).toLocaleString() },
      ],
    },
  ];

  try {
    if (detection.mime === 'application/pdf') {
      const { closePdf, describePdf, openPdf } = await import('./pdfjs.engine');
      const doc = await openPdf(await file.arrayBuffer());
      try {
        const info = await describePdf(doc);
        groups.push({
          title: 'PDF properties',
          entries: compact([
            ['Pages', String(info.pageCount)],
            ['Title', info.title],
            ['Author', info.author],
            ['Subject', info.subject],
            ['Keywords', info.keywords],
            ['Creator', info.creator],
            ['Producer', info.producer],
            ['Created', info.creationDate],
            ['Modified', info.modificationDate],
            ['PDF version', info.pdfVersion],
            ['Has text layer', info.hasTextLayer ? 'Yes' : 'No — likely a scan'],
            ['Encrypted', info.encrypted ? 'Yes' : 'No'],
          ]),
        });
      } finally {
        await closePdf(doc);
      }
    } else if (detection.category === 'image') {
      const { inspectImage } = await import('./image.engine');
      const info = await inspectImage(file);
      groups.push({
        title: 'Image properties',
        entries: [
          { key: 'Dimensions', value: `${info.width} × ${info.height} px` },
          { key: 'Megapixels', value: ((info.width * info.height) / 1e6).toFixed(2) },
          {
            key: 'Aspect ratio',
            value: aspectRatio(info.width, info.height),
          },
        ],
      });
    } else if (/\.docx$/i.test(file.name)) {
      const { readDocxMetadata } = await import('./docx.engine');
      const metadata = await readDocxMetadata(file);
      for (const [title, source] of [
        ['Document properties', metadata.core],
        ['Application properties', metadata.app],
        ['Custom properties', metadata.custom],
      ] as const) {
        const entries = Object.entries(source).map(([key, value]) => ({ key, value }));
        if (entries.length) groups.push({ title, entries });
      }
    } else if (/\.(xlsx|xlsm|xls)$/i.test(file.name)) {
      const { readWorkbook } = await import('./xlsx.engine');
      const workbook = await readWorkbook(file, { header: false });
      groups.push({
        title: 'Workbook properties',
        entries: [
          { key: 'Sheets', value: String(workbook.sheetNames.length) },
          { key: 'Sheet names', value: workbook.sheetNames.join(', ') },
          ...Object.entries(workbook.properties).map(([key, value]) => ({ key, value })),
        ],
      });
    } else if (/\.pptx$/i.test(file.name)) {
      const { readPresentation } = await import('./pptx.engine');
      const deck = await readPresentation(file);
      groups.push({
        title: 'Presentation properties',
        entries: [
          { key: 'Slides', value: String(deck.slides.length) },
          {
            key: 'Slide size',
            value: `${deck.width.toFixed(0)} × ${deck.height.toFixed(0)} pt`,
          },
          { key: 'Embedded media', value: String(deck.media.length) },
          ...Object.entries(deck.properties).map(([key, value]) => ({ key, value })),
        ],
      });
    }
  } catch {
    groups.push({
      title: 'Format properties',
      entries: [{ key: 'Note', value: 'This file could not be parsed for detailed properties.' }],
    });
  }

  return groups;
}

function compact(pairs: readonly [string, string | undefined][]): { key: string; value: string }[] {
  return pairs
    .filter((pair): pair is [string, string] => !!pair[1])
    .map(([key, value]) => ({ key, value }));
}

function aspectRatio(width: number, height: number): string {
  const divisor = gcd(width, height);
  return divisor > 0 ? `${width / divisor}:${height / divisor}` : '—';
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/* ------------------------------------------------------------------
   Container breakdown (what is taking up the space)
   ------------------------------------------------------------------ */

export interface ContainerPart {
  readonly name: string;
  readonly bytes: number;
  readonly compressed: number;
  readonly group: string;
}

export interface ContainerReport {
  readonly parts: readonly ContainerPart[];
  readonly totalUncompressed: number;
  readonly totalCompressed: number;
  readonly groups: readonly { name: string; bytes: number; share: number; count: number }[];
  readonly kind: 'zip' | 'pdf' | 'unsupported';
}

/** Breaks an OOXML/ZIP container, or a PDF, into its constituent parts. */
export async function analyseContainer(file: File): Promise<ContainerReport> {
  const detection = await detectFormat(file);

  if (detection.mime === 'application/pdf') return analysePdf(file);
  if (detection.mime !== 'application/zip') {
    return {
      parts: [],
      totalUncompressed: 0,
      totalCompressed: 0,
      groups: [],
      kind: 'unsupported',
    };
  }

  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(file);

  const parts: ContainerPart[] = [];
  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue;
    // JSZip exposes the sizes on an internal field; fall back to decompressing.
    const meta = (entry as unknown as {
      _data?: { uncompressedSize?: number; compressedSize?: number };
    })._data;

    const uncompressed = meta?.uncompressedSize ?? (await entry.async('uint8array')).length;
    const compressed = meta?.compressedSize ?? uncompressed;

    parts.push({
      name: entry.name,
      bytes: uncompressed,
      compressed,
      group: groupFor(entry.name),
    });
  }

  parts.sort((a, b) => b.bytes - a.bytes);
  return summarise(parts, 'zip');
}

async function analysePdf(file: File): Promise<ContainerReport> {
  const { closePdf, openPdf } = await import('./pdfjs.engine');
  const doc = await openPdf(await file.arrayBuffer());

  try {
    const parts: ContainerPart[] = [];
    const pageCount = doc.numPages;
    // PDF has no part table, so approximate by measuring each page's operators
    // and image resources — enough to show which pages carry the weight.
    for (let index = 1; index <= Math.min(pageCount, 200); index++) {
      const page = await doc.getPage(index);
      const operators = await page.getOperatorList();
      const images = operators.fnArray.filter((fn) => fn === 85 || fn === 86).length;
      const text = (await page.getTextContent()).items.length;
      page.cleanup();

      parts.push({
        name: `Page ${index}`,
        // A weighting, not a byte count — labelled as such in the UI.
        bytes: images * 40_000 + text * 40 + operators.fnArray.length * 8,
        compressed: 0,
        group: images > 0 ? 'Pages with images' : 'Text-only pages',
      });
    }

    parts.sort((a, b) => b.bytes - a.bytes);
    return summarise(parts, 'pdf');
  } finally {
    await closePdf(doc);
  }
}

function summarise(parts: ContainerPart[], kind: 'zip' | 'pdf'): ContainerReport {
  const totalUncompressed = parts.reduce((sum, part) => sum + part.bytes, 0);
  const totalCompressed = parts.reduce((sum, part) => sum + part.compressed, 0);

  const byGroup = new Map<string, { bytes: number; count: number }>();
  for (const part of parts) {
    const current = byGroup.get(part.group) ?? { bytes: 0, count: 0 };
    byGroup.set(part.group, { bytes: current.bytes + part.bytes, count: current.count + 1 });
  }

  return {
    parts,
    totalUncompressed,
    totalCompressed,
    kind,
    groups: [...byGroup.entries()]
      .map(([name, value]) => ({
        name,
        bytes: value.bytes,
        count: value.count,
        share: totalUncompressed ? (value.bytes / totalUncompressed) * 100 : 0,
      }))
      .sort((a, b) => b.bytes - a.bytes),
  };
}

function groupFor(path: string): string {
  if (/\/media\//i.test(path)) return 'Images & media';
  if (/\/embeddings\//i.test(path)) return 'Embedded objects';
  if (/fonts?\//i.test(path) || /\.(ttf|otf|woff2?|fntdata)$/i.test(path)) return 'Fonts';
  if (/\/theme\//i.test(path)) return 'Themes';
  if (/slideLayouts|slideMasters/i.test(path)) return 'Layouts & masters';
  if (/\/slides?\//i.test(path)) return 'Slides';
  if (/\/worksheets\//i.test(path)) return 'Worksheets';
  if (/sharedStrings/i.test(path)) return 'Shared strings';
  if (/docProps/i.test(path)) return 'Properties';
  if (/_rels/i.test(path) || /\.rels$/i.test(path)) return 'Relationships';
  if (/\.xml$/i.test(path)) return 'Markup';
  return 'Other';
}
