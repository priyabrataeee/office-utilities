import { extensionOf } from '../../core/utils/file.util';

/** Which sub-viewer should open a file. */
export type ViewerKind =
  | 'pdf'
  | 'docx'
  | 'sheet'
  | 'pptx'
  | 'markdown'
  | 'json'
  | 'xml'
  | 'html'
  | 'text'
  | 'image'
  | 'unsupported';

const BY_EXTENSION: Record<string, ViewerKind> = {
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.xlsx': 'sheet',
  '.xls': 'sheet',
  '.xlsm': 'sheet',
  '.ods': 'sheet',
  '.csv': 'sheet',
  '.tsv': 'sheet',
  '.pptx': 'pptx',
  '.md': 'markdown',
  '.markdown': 'markdown',
  '.mdx': 'markdown',
  '.json': 'json',
  '.jsonl': 'json',
  '.geojson': 'json',
  '.xml': 'xml',
  '.rss': 'xml',
  '.xsd': 'xml',
  '.svg': 'image',
  '.html': 'html',
  '.htm': 'html',
  '.png': 'image',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.gif': 'image',
  '.webp': 'image',
  '.avif': 'image',
  '.bmp': 'image',
  '.txt': 'text',
  '.log': 'text',
  '.ini': 'text',
  '.conf': 'text',
  '.env': 'text',
  '.yml': 'text',
  '.yaml': 'text',
};

export function detectViewerKind(file: File): ViewerKind {
  const byExtension = BY_EXTENSION[extensionOf(file.name)];
  if (byExtension) return byExtension;

  // Fall back to the MIME type the browser reported.
  const type = file.type.toLowerCase();
  if (type === 'application/pdf') return 'pdf';
  if (type.startsWith('image/')) return 'image';
  if (type === 'application/json') return 'json';
  if (type.includes('xml')) return 'xml';
  if (type === 'text/html') return 'html';
  if (type.startsWith('text/')) return 'text';
  if (type.includes('spreadsheet') || type.includes('excel')) return 'sheet';
  if (type.includes('wordprocessing')) return 'docx';
  if (type.includes('presentation')) return 'pptx';

  return 'unsupported';
}

export const ALL_VIEWER_EXTENSIONS: readonly string[] = Object.keys(BY_EXTENSION);

/** Extensions each explicit viewer route should accept. */
export function acceptsFor(kind: ViewerKind | 'auto'): string[] {
  if (kind === 'auto') return [...ALL_VIEWER_EXTENSIONS];
  return Object.entries(BY_EXTENSION)
    .filter(([, value]) => value === kind)
    .map(([extension]) => extension);
}
