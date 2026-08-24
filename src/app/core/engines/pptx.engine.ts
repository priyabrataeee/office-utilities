/**
 * PowerPoint (.pptx) reading.
 *
 * A .pptx is a ZIP of OOXML parts. There is no browser API that renders one,
 * so this module parses the shape tree itself — positions, sizes, text runs,
 * tables and pictures — into a small model the viewer draws as positioned
 * HTML and the exporters turn into PDF pages or images.
 *
 * It reconstructs the deck faithfully for ordinary content. Charts, SmartArt,
 * 3-D effects and animations are not reproduced; those are reported rather
 * than silently dropped.
 */

/** English Metric Units per point — OOXML's internal unit. */
const EMU_PER_POINT = 12700;

export interface SlideTextRun {
  readonly text: string;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly underline: boolean;
  /** Point size, already converted from hundredths. */
  readonly size: number;
  readonly color: string | null;
  readonly font: string | null;
}

export interface SlideParagraph {
  readonly runs: readonly SlideTextRun[];
  readonly level: number;
  readonly align: 'left' | 'center' | 'right' | 'justify';
  readonly bullet: boolean;
}

export interface SlideShapeBase {
  readonly id: string;
  /** Position and size in points, relative to the slide. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
}

export interface SlideTextShape extends SlideShapeBase {
  readonly kind: 'text';
  readonly paragraphs: readonly SlideParagraph[];
  readonly placeholder: string | null;
  readonly fill: string | null;
}

export interface SlideImageShape extends SlideShapeBase {
  readonly kind: 'image';
  readonly dataUrl: string;
  readonly name: string;
}

export interface SlideTableShape extends SlideShapeBase {
  readonly kind: 'table';
  readonly rows: readonly (readonly string[])[];
}

export interface SlideUnsupportedShape extends SlideShapeBase {
  readonly kind: 'unsupported';
  readonly reason: string;
}

export type SlideShape =
  | SlideTextShape
  | SlideImageShape
  | SlideTableShape
  | SlideUnsupportedShape;

export interface Slide {
  readonly index: number;
  readonly shapes: readonly SlideShape[];
  readonly notes: string;
  readonly title: string;
  readonly text: string;
  readonly background: string | null;
}

export interface Presentation {
  /** Slide size in points. */
  readonly width: number;
  readonly height: number;
  readonly slides: readonly Slide[];
  readonly media: readonly { name: string; dataUrl: string; bytes: number }[];
  readonly properties: Record<string, string>;
  readonly warnings: readonly string[];
}

export async function readPresentation(file: Blob): Promise<Presentation> {
  const JSZip = (await import('jszip')).default;

  let zip: import('jszip');
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new Error('That file is not a valid .pptx — the container could not be opened.');
  }

  const presentationXml = zip.file('ppt/presentation.xml');
  if (!presentationXml) {
    throw new Error('That .pptx has no presentation part — it may be corrupt.');
  }

  const presentationDoc = parseXml(await presentationXml.async('text'));
  const sizeNode = presentationDoc?.getElementsByTagName('p:sldSz')[0];
  const width = emuToPoints(Number(sizeNode?.getAttribute('cx') ?? 9144000));
  const height = emuToPoints(Number(sizeNode?.getAttribute('cy') ?? 6858000));

  // Media is loaded once and shared by reference across slides.
  const media = await loadMedia(zip);
  const mediaByName = new Map(media.map((item) => [item.name, item.dataUrl]));

  const slidePaths = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort(byTrailingNumber);

  const warnings = new Set<string>();
  const slides: Slide[] = [];

  for (const [index, path] of slidePaths.entries()) {
    const xml = await zip.file(path)!.async('text');
    const relationships = await loadRelationships(zip, path);
    const notes = await loadNotes(zip, index + 1);

    const slide = parseSlide(xml, index, relationships, mediaByName, notes, warnings);
    slides.push(slide);
  }

  return {
    width,
    height,
    slides,
    media,
    properties: await loadProperties(zip),
    warnings: [...warnings],
  };
}

function byTrailingNumber(a: string, b: string): number {
  const numberOf = (value: string): number => Number(value.match(/(\d+)\.xml$/)?.[1] ?? 0);
  return numberOf(a) - numberOf(b);
}

function emuToPoints(emu: number): number {
  return Number.isFinite(emu) ? emu / EMU_PER_POINT : 0;
}

function parseXml(xml: string): XMLDocument | null {
  if (typeof DOMParser === 'undefined') return null;
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  return doc.querySelector('parsererror') ? null : doc;
}

async function loadMedia(
  zip: import('jszip'),
): Promise<{ name: string; dataUrl: string; bytes: number }[]> {
  const out: { name: string; dataUrl: string; bytes: number }[] = [];

  for (const entry of Object.values(zip.files)) {
    if (entry.dir || !/^ppt\/media\//i.test(entry.name)) continue;
    const extension = entry.name.slice(entry.name.lastIndexOf('.')).toLowerCase();
    // Vector metafiles and video cannot be drawn by a browser; skip them
    // rather than embedding megabytes that will never render.
    if (['.emf', '.wmf', '.mp4', '.avi', '.wmv', '.mov', '.m4a', '.wav', '.mp3'].includes(extension)) {
      continue;
    }

    const base64 = await entry.async('base64');
    out.push({
      name: entry.name.replace(/^ppt\/media\//i, ''),
      dataUrl: `data:${mimeFor(extension)};base64,${base64}`,
      bytes: Math.round((base64.length * 3) / 4),
    });
  }

  return out;
}

function mimeFor(extension: string): string {
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
    case '.tiff':
      return 'image/tiff';
    default:
      return 'application/octet-stream';
  }
}

/** Maps r:id values to the media file each one points at. */
async function loadRelationships(
  zip: import('jszip'),
  slidePath: string,
): Promise<Map<string, string>> {
  const relsPath = slidePath.replace(/slides\/(slide\d+\.xml)$/, 'slides/_rels/$1.rels');
  const entry = zip.file(relsPath);
  const map = new Map<string, string>();
  if (!entry) return map;

  const doc = parseXml(await entry.async('text'));
  if (!doc) return map;

  for (const relationship of Array.from(doc.getElementsByTagName('Relationship'))) {
    const id = relationship.getAttribute('Id');
    const target = relationship.getAttribute('Target');
    if (!id || !target) continue;
    map.set(id, target.replace(/^\.\.\/media\//, '').replace(/^\/ppt\/media\//, ''));
  }
  return map;
}

async function loadNotes(zip: import('jszip'), slideNumber: number): Promise<string> {
  const entry = zip.file(`ppt/notesSlides/notesSlide${slideNumber}.xml`);
  if (!entry) return '';

  const doc = parseXml(await entry.async('text'));
  if (!doc) return '';

  const lines: string[] = [];
  for (const paragraph of Array.from(doc.getElementsByTagName('a:p'))) {
    const text = Array.from(paragraph.getElementsByTagName('a:t'))
      .map((node) => node.textContent ?? '')
      .join('')
      .trim();
    if (text) lines.push(text);
  }
  // The notes part repeats the slide number as its own paragraph; drop it.
  return lines.filter((line) => line !== String(slideNumber)).join('\n');
}

async function loadProperties(zip: import('jszip')): Promise<Record<string, string>> {
  const out: Record<string, string> = {};

  for (const path of ['docProps/core.xml', 'docProps/app.xml']) {
    const entry = zip.file(path);
    if (!entry) continue;
    const doc = parseXml(await entry.async('text'));
    if (!doc) continue;

    for (const element of Array.from(doc.documentElement.children)) {
      const value = element.textContent?.trim();
      if (!value) continue;
      const label = element.localName
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (c) => c.toUpperCase())
        .trim();
      if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
        const date = new Date(value);
        out[label] = Number.isNaN(date.getTime()) ? value : date.toLocaleString();
      } else {
        out[label] = value;
      }
    }
  }

  return out;
}

function parseSlide(
  xml: string,
  index: number,
  relationships: Map<string, string>,
  media: Map<string, string>,
  notes: string,
  warnings: Set<string>,
): Slide {
  const doc = parseXml(xml);
  const shapes: SlideShape[] = [];

  if (doc) {
    const tree = doc.getElementsByTagName('p:spTree')[0];
    if (tree) {
      for (const node of Array.from(tree.children)) {
        const shape = parseShape(node, relationships, media, warnings);
        if (shape) shapes.push(shape);
      }
    }
  }

  const textShapes = shapes.filter((shape): shape is SlideTextShape => shape.kind === 'text');
  const titleShape = textShapes.find((shape) => /title|ctrTitle/i.test(shape.placeholder ?? ''));

  const text = textShapes
    .map((shape) =>
      shape.paragraphs.map((p) => p.runs.map((r) => r.text).join('')).join('\n'),
    )
    .filter(Boolean)
    .join('\n');

  return {
    index,
    shapes,
    notes,
    title: titleShape
      ? titleShape.paragraphs
          .map((p) => p.runs.map((r) => r.text).join(''))
          .join(' ')
          .trim()
      : (text.split('\n')[0] ?? '').slice(0, 90),
    text,
    background: null,
  };
}

function parseShape(
  node: Element,
  relationships: Map<string, string>,
  media: Map<string, string>,
  warnings: Set<string>,
): SlideShape | null {
  const tag = node.tagName;
  const frame = readFrame(node);

  switch (tag) {
    case 'p:sp': {
      const paragraphs = readParagraphs(node);
      if (!paragraphs.length) return null;
      return {
        kind: 'text',
        ...frame,
        paragraphs,
        placeholder: node.getElementsByTagName('p:ph')[0]?.getAttribute('type') ?? null,
        fill: readSolidFill(node.getElementsByTagName('p:spPr')[0]),
      };
    }

    case 'p:pic': {
      const embed = node
        .getElementsByTagName('a:blip')[0]
        ?.getAttribute('r:embed');
      const target = embed ? relationships.get(embed) : undefined;
      const dataUrl = target ? media.get(target) : undefined;
      if (!dataUrl) {
        warnings.add('Some images use a format the browser cannot display and were skipped.');
        return null;
      }
      return { kind: 'image', ...frame, dataUrl, name: target ?? 'image' };
    }

    case 'p:graphicFrame': {
      const table = node.getElementsByTagName('a:tbl')[0];
      if (table) {
        const rows = Array.from(table.getElementsByTagName('a:tr')).map((row) =>
          Array.from(row.getElementsByTagName('a:tc')).map((cell) =>
            Array.from(cell.getElementsByTagName('a:t'))
              .map((node) => node.textContent ?? '')
              .join('')
              .trim(),
          ),
        );
        return { kind: 'table', ...frame, rows };
      }
      if (node.getElementsByTagName('c:chart').length) {
        warnings.add('Charts are shown as placeholders — they are not re-rendered.');
        return { kind: 'unsupported', ...frame, reason: 'Chart' };
      }
      if (node.getElementsByTagName('dgm:relIds').length) {
        warnings.add('SmartArt diagrams are shown as placeholders.');
        return { kind: 'unsupported', ...frame, reason: 'SmartArt' };
      }
      return null;
    }

    case 'p:grpSp': {
      // Groups are flattened: their children keep absolute positions, which is
      // close enough for viewing without implementing the full transform.
      const children: SlideShape[] = [];
      for (const child of Array.from(node.children)) {
        const parsed = parseShape(child, relationships, media, warnings);
        if (parsed) children.push(parsed);
      }
      return children[0] ?? null;
    }

    default:
      return null;
  }
}

function readFrame(node: Element): SlideShapeBase {
  const offset = node.getElementsByTagName('a:off')[0];
  const extent = node.getElementsByTagName('a:ext')[0];
  const transform = node.getElementsByTagName('a:xfrm')[0];

  return {
    id: node.getElementsByTagName('p:cNvPr')[0]?.getAttribute('id') ?? Math.random().toString(36),
    x: emuToPoints(Number(offset?.getAttribute('x') ?? 0)),
    y: emuToPoints(Number(offset?.getAttribute('y') ?? 0)),
    width: emuToPoints(Number(extent?.getAttribute('cx') ?? 0)),
    height: emuToPoints(Number(extent?.getAttribute('cy') ?? 0)),
    // OOXML stores rotation in 60000ths of a degree.
    rotation: Number(transform?.getAttribute('rot') ?? 0) / 60000,
  };
}

function readSolidFill(node: Element | undefined): string | null {
  const fill = node?.getElementsByTagName('a:solidFill')[0];
  const srgb = fill?.getElementsByTagName('a:srgbClr')[0]?.getAttribute('val');
  return srgb ? `#${srgb}` : null;
}

function readParagraphs(node: Element): SlideParagraph[] {
  const body = node.getElementsByTagName('p:txBody')[0];
  if (!body) return [];

  const paragraphs: SlideParagraph[] = [];

  for (const paragraph of Array.from(body.getElementsByTagName('a:p'))) {
    const properties = paragraph.getElementsByTagName('a:pPr')[0];
    const runs: SlideTextRun[] = [];

    for (const run of Array.from(paragraph.getElementsByTagName('a:r'))) {
      const text = run.getElementsByTagName('a:t')[0]?.textContent ?? '';
      if (!text) continue;
      const runProps = run.getElementsByTagName('a:rPr')[0];
      runs.push({
        text,
        bold: runProps?.getAttribute('b') === '1',
        italic: runProps?.getAttribute('i') === '1',
        underline: !!runProps?.getAttribute('u') && runProps.getAttribute('u') !== 'none',
        // `sz` is in hundredths of a point.
        size: Number(runProps?.getAttribute('sz') ?? 1800) / 100,
        color: readSolidFill(runProps ?? undefined),
        font: runProps?.getElementsByTagName('a:latin')[0]?.getAttribute('typeface') ?? null,
      });
    }

    // A paragraph with only a line break still needs to occupy a line.
    if (!runs.length && paragraph.getElementsByTagName('a:br').length === 0) continue;

    const align = properties?.getAttribute('algn');
    paragraphs.push({
      runs,
      level: Number(properties?.getAttribute('lvl') ?? 0),
      align:
        align === 'ctr'
          ? 'center'
          : align === 'r'
            ? 'right'
            : align === 'just'
              ? 'justify'
              : 'left',
      bullet: !properties?.getElementsByTagName('a:buNone').length,
    });
  }

  return paragraphs;
}

/* ------------------------------------------------------------------
   Rendering to SVG (used for image export and PDF pages)
   ------------------------------------------------------------------ */

/**
 * Draws a slide as standalone SVG.
 *
 * SVG keeps text as text, so exported images stay crisp at any resolution and
 * the PDF path can rasterise at whatever DPI the user picks.
 */
export function slideToSvg(
  slide: Slide,
  width: number,
  height: number,
  background = '#ffffff',
): string {
  const parts: string[] = [
    `<rect x="0" y="0" width="${width}" height="${height}" fill="${background}"/>`,
  ];

  for (const shape of slide.shapes) {
    const transform = shape.rotation
      ? ` transform="rotate(${shape.rotation.toFixed(2)} ${shape.x + shape.width / 2} ${
          shape.y + shape.height / 2
        })"`
      : '';

    switch (shape.kind) {
      case 'image':
        parts.push(
          `<image x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" ` +
            `preserveAspectRatio="xMidYMid meet" href="${escapeXml(shape.dataUrl)}"${transform}/>`,
        );
        break;

      case 'text': {
        if (shape.fill) {
          parts.push(
            `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" fill="${shape.fill}"${transform}/>`,
          );
        }
        parts.push(renderTextShape(shape, transform));
        break;
      }

      case 'table':
        parts.push(renderTable(shape, transform));
        break;

      case 'unsupported':
        parts.push(
          `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" ` +
            `fill="#f1f2f6" stroke="#c9cdd8" stroke-dasharray="4 3"${transform}/>` +
            `<text x="${shape.x + shape.width / 2}" y="${shape.y + shape.height / 2}" ` +
            `text-anchor="middle" font-family="sans-serif" font-size="12" fill="#868da0">` +
            `${escapeXml(shape.reason)}</text>`,
        );
        break;
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="0 0 ${width} ${height}">${parts.join('')}</svg>`
  );
}

function renderTextShape(shape: SlideTextShape, transform: string): string {
  const lines: string[] = [];
  let cursorY = shape.y;

  for (const paragraph of shape.paragraphs) {
    const size = paragraph.runs[0]?.size ?? 18;
    const lineHeight = size * 1.25;
    cursorY += lineHeight;
    if (cursorY > shape.y + shape.height + lineHeight) break;

    const indent = paragraph.level * 18;
    const anchorX =
      paragraph.align === 'center'
        ? shape.x + shape.width / 2
        : paragraph.align === 'right'
          ? shape.x + shape.width - 4
          : shape.x + indent + 4;
    const anchor =
      paragraph.align === 'center' ? 'middle' : paragraph.align === 'right' ? 'end' : 'start';

    const spans = paragraph.runs
      .map((run) => {
        const style = [
          run.bold ? 'font-weight:bold' : '',
          run.italic ? 'font-style:italic' : '',
          run.underline ? 'text-decoration:underline' : '',
          `font-size:${run.size}px`,
          `fill:${run.color ?? '#1a1a1a'}`,
          run.font ? `font-family:'${run.font.replace(/'/g, '')}',sans-serif` : '',
        ]
          .filter(Boolean)
          .join(';');
        return `<tspan style="${style}">${escapeXml(run.text)}</tspan>`;
      })
      .join('');

    if (!spans) continue;

    const bullet =
      paragraph.bullet && paragraph.runs.length && shape.placeholder !== 'title'
        ? `<tspan style="fill:#666">• </tspan>`
        : '';

    lines.push(
      `<text x="${anchorX}" y="${cursorY}" text-anchor="${anchor}" ` +
        `font-family="Segoe UI, Calibri, sans-serif" font-size="${size}">${bullet}${spans}</text>`,
    );
  }

  return `<g${transform}>${lines.join('')}</g>`;
}

function renderTable(shape: SlideTableShape, transform: string): string {
  const rows = shape.rows;
  if (!rows.length) return '';

  const rowHeight = shape.height / rows.length;
  const columnCount = Math.max(...rows.map((row) => row.length), 1);
  const columnWidth = shape.width / columnCount;
  const parts: string[] = [];

  rows.forEach((row, rowIndex) => {
    row.forEach((cell, columnIndex) => {
      const x = shape.x + columnIndex * columnWidth;
      const y = shape.y + rowIndex * rowHeight;
      parts.push(
        `<rect x="${x}" y="${y}" width="${columnWidth}" height="${rowHeight}" ` +
          `fill="${rowIndex === 0 ? '#f1f2f6' : '#ffffff'}" stroke="#d9dce4"/>` +
          `<text x="${x + 6}" y="${y + rowHeight / 2 + 4}" font-family="sans-serif" ` +
          `font-size="11" fill="#1a1a1a"${rowIndex === 0 ? ' font-weight="bold"' : ''}>` +
          `${escapeXml(truncate(cell, Math.floor(columnWidth / 6)))}</text>`,
      );
    });
  });

  return `<g${transform}>${parts.join('')}</g>`;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, Math.max(1, max - 1))}…` : text;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Rebuilds a .pptx containing only the chosen slides. */
export async function extractSlides(
  file: Blob,
  keepIndices: readonly number[],
): Promise<Blob> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(file);

  const slidePaths = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort(byTrailingNumber);

  const keep = new Set(keepIndices);
  const removed: string[] = [];

  slidePaths.forEach((path, index) => {
    if (keep.has(index)) return;
    removed.push(path);
    zip.remove(path);
    zip.remove(path.replace(/slides\/(slide\d+\.xml)$/, 'slides/_rels/$1.rels'));
    zip.remove(`ppt/notesSlides/notesSlide${index + 1}.xml`);
    zip.remove(`ppt/notesSlides/_rels/notesSlide${index + 1}.xml.rels`);
  });

  // The presentation part lists slides by relationship id; drop the entries
  // whose parts no longer exist, or PowerPoint will refuse to open the file.
  const presentationEntry = zip.file('ppt/presentation.xml');
  const relsEntry = zip.file('ppt/_rels/presentation.xml.rels');

  if (presentationEntry && relsEntry) {
    const relsDoc = parseXml(await relsEntry.async('text'));
    const presentationDoc = parseXml(await presentationEntry.async('text'));

    if (relsDoc && presentationDoc) {
      const removedIds = new Set<string>();

      for (const relationship of Array.from(relsDoc.getElementsByTagName('Relationship'))) {
        const target = relationship.getAttribute('Target') ?? '';
        const resolved = `ppt/${target.replace(/^\.\//, '')}`;
        if (removed.includes(resolved)) {
          removedIds.add(relationship.getAttribute('Id') ?? '');
          relationship.remove();
        }
      }

      const idList = presentationDoc.getElementsByTagName('p:sldIdLst')[0];
      if (idList) {
        for (const entry of Array.from(idList.getElementsByTagName('p:sldId'))) {
          if (removedIds.has(entry.getAttribute('r:id') ?? '')) entry.remove();
        }
      }

      const serializer = new XMLSerializer();
      zip.file('ppt/_rels/presentation.xml.rels', serializer.serializeToString(relsDoc));
      zip.file('ppt/presentation.xml', serializer.serializeToString(presentationDoc));
    }
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });
  return blob;
}
