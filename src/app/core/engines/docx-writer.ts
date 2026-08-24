import type {
  BlockAlign,
  DocBlock,
  DocMeta,
  InlineRun,
  ListBlock,
  TableCell as ModelCell,
  PageOptions,
  TableBlock,
} from './doc-model';
import { DEFAULT_PAGE_OPTIONS, PAGE_SIZES } from './doc-model';
import type { FileChild, ParagraphChild } from 'docx';

/**
 * Writes the document model out as a real .docx.
 *
 * The output uses Word's built-in Heading, Quote and List Paragraph styles
 * rather than hard-coded formatting, so the result stays editable and picks up
 * whatever theme the recipient's Word is configured with.
 */

export interface DocxWriteOptions extends Partial<PageOptions> {
  readonly meta?: DocMeta;
}

const TWIPS_PER_POINT = 20;

export async function renderDocumentToDocx(
  blocks: readonly DocBlock[],
  options: DocxWriteOptions = {},
): Promise<Blob> {
  const docx = await import('docx');
  const resolved: PageOptions = { ...DEFAULT_PAGE_OPTIONS, ...options };
  const [pageWidth, pageHeight] = PAGE_SIZES[resolved.size];
  const landscape = resolved.orientation === 'landscape';

  const images = await loadImages(blocks);
  const children = blocks.flatMap((block) => convertBlock(docx, block, images, resolved));

  const document = new docx.Document({
    creator: options.meta?.creator ?? 'Office Utilities',
    title: options.meta?.title,
    subject: options.meta?.subject,
    description: options.meta?.subject,
    keywords: options.meta?.keywords?.join(', '),
    styles: {
      default: {
        document: {
          run: {
            font: fontName(resolved.font),
            size: resolved.fontSize * 2, // half-points
          },
          paragraph: { spacing: { line: Math.round(resolved.lineHeight * 240) } },
        },
      },
    },
    // Ordered lists reference this definition so Word renumbers them natively.
    numbering: {
      config: [
        {
          reference: 'ou-ordered',
          levels: [0, 1, 2, 3, 4].map((level) => ({
            level,
            format: docx.LevelFormat.DECIMAL,
            text: `%${level + 1}.`,
            alignment: docx.AlignmentType.LEFT,
            style: {
              paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } },
            },
          })),
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: pointsToTwips(landscape ? pageHeight : pageWidth),
              height: pointsToTwips(landscape ? pageWidth : pageHeight),
              orientation: landscape
                ? docx.PageOrientation.LANDSCAPE
                : docx.PageOrientation.PORTRAIT,
            },
            margin: {
              top: pointsToTwips(resolved.margin),
              bottom: pointsToTwips(resolved.margin),
              left: pointsToTwips(resolved.margin),
              right: pointsToTwips(resolved.margin),
            },
          },
        },
        headers: resolved.headerText
          ? {
              default: new docx.Header({
                children: [
                  new docx.Paragraph({
                    alignment: docx.AlignmentType.CENTER,
                    children: [new docx.TextRun({ text: resolved.headerText, size: 17 })],
                  }),
                ],
              }),
            }
          : undefined,
        footers:
          resolved.pageNumbers || resolved.footerText
            ? {
                default: new docx.Footer({
                  children: [
                    new docx.Paragraph({
                      alignment: docx.AlignmentType.CENTER,
                      children: [
                        ...(resolved.footerText
                          ? [new docx.TextRun({ text: `${resolved.footerText}   `, size: 17 })]
                          : []),
                        ...(resolved.pageNumbers
                          ? [
                              new docx.TextRun({ text: 'Page ', size: 17 }),
                              new docx.TextRun({ children: [docx.PageNumber.CURRENT], size: 17 }),
                              new docx.TextRun({ text: ' of ', size: 17 }),
                              new docx.TextRun({
                                children: [docx.PageNumber.TOTAL_PAGES],
                                size: 17,
                              }),
                            ]
                          : []),
                      ],
                    }),
                  ],
                }),
              }
            : undefined,
        children,
      },
    ],
  });

  const blob = await docx.Packer.toBlob(document);
  return blob;
}

function pointsToTwips(points: number): number {
  return Math.round(points * TWIPS_PER_POINT);
}

function fontName(family: PageOptions['font']): string {
  return family === 'serif' ? 'Georgia' : family === 'mono' ? 'Consolas' : 'Calibri';
}

type Docx = typeof import('docx');

function alignmentOf(docx: Docx, align: BlockAlign | undefined) {
  switch (align) {
    case 'center':
      return docx.AlignmentType.CENTER;
    case 'right':
      return docx.AlignmentType.RIGHT;
    case 'justify':
      return docx.AlignmentType.JUSTIFIED;
    default:
      return docx.AlignmentType.LEFT;
  }
}

function headingOf(docx: Docx, level: number) {
  return (
    [
      docx.HeadingLevel.HEADING_1,
      docx.HeadingLevel.HEADING_2,
      docx.HeadingLevel.HEADING_3,
      docx.HeadingLevel.HEADING_4,
      docx.HeadingLevel.HEADING_5,
      docx.HeadingLevel.HEADING_6,
    ][level - 1] ?? docx.HeadingLevel.HEADING_6
  );
}

function toRuns(docx: Docx, runs: readonly InlineRun[], baseSize: number): ParagraphChild[] {
  return runs.flatMap<ParagraphChild>((run) => {
    const textRun = new docx.TextRun({
      text: run.text,
      bold: run.bold,
      italics: run.italic,
      underline: run.underline ? {} : undefined,
      strike: run.strike,
      color: run.color?.replace('#', ''),
      font: run.code ? 'Consolas' : undefined,
      size: run.size ? run.size * 2 : baseSize * 2,
    });

    if (!run.href) return [textRun];
    return [
      new docx.ExternalHyperlink({
        link: run.href,
        children: [
          new docx.TextRun({
            text: run.text,
            style: 'Hyperlink',
            bold: run.bold,
            italics: run.italic,
            size: run.size ? run.size * 2 : baseSize * 2,
          }),
        ],
      }),
    ];
  });
}

function convertBlock(
  docx: Docx,
  block: DocBlock,
  images: Map<string, { bytes: Uint8Array; width: number; height: number; type: string }>,
  options: PageOptions,
): FileChild[] {
  const size = options.fontSize;

  switch (block.type) {
    case 'heading':
      return [
        new docx.Paragraph({
          heading: headingOf(docx, block.level),
          alignment: alignmentOf(docx, block.align),
          children: toRuns(docx, block.content, size + (7 - block.level)),
        }),
      ];

    case 'paragraph':
      return [
        new docx.Paragraph({
          alignment: alignmentOf(docx, block.align),
          spacing: {
            before: block.spaceBefore ? pointsToTwips(block.spaceBefore) : undefined,
            after: pointsToTwips(block.spaceAfter ?? 6),
          },
          indent: block.indent ? { left: pointsToTwips(block.indent) } : undefined,
          children: toRuns(docx, block.content, size),
        }),
      ];

    case 'list':
      return convertList(docx, block, size);

    case 'quote':
      return [
        new docx.Paragraph({
          style: 'Quote',
          indent: { left: pointsToTwips(18) },
          border: {
            left: { style: docx.BorderStyle.SINGLE, size: 12, color: 'C9CDD8', space: 8 },
          },
          children: toRuns(docx, block.content, size),
        }),
      ];

    case 'code':
      return block.text.split('\n').map(
        (line) =>
          new docx.Paragraph({
            spacing: { before: 0, after: 0 },
            shading: { fill: 'F4F5F8' },
            children: [new docx.TextRun({ text: line || ' ', font: 'Consolas', size: size * 1.8 })],
          }),
      );

    case 'table':
      return [convertTable(docx, block, size)];

    case 'image': {
      const entry = images.get(block.dataUrl);
      if (!entry) return [];
      const maxWidth = 460;
      const scale = Math.min(1, maxWidth / (block.width ?? entry.width));
      return [
        new docx.Paragraph({
          alignment: alignmentOf(docx, block.align),
          children: [
            new docx.ImageRun({
              type: entry.type === 'image/jpeg' ? 'jpg' : 'png',
              data: entry.bytes,
              transformation: {
                width: Math.round((block.width ?? entry.width) * scale),
                height: Math.round((block.height ?? entry.height) * scale),
              },
            }),
          ],
        }),
      ];
    }

    case 'divider':
      return [
        new docx.Paragraph({
          spacing: { before: 120, after: 120 },
          border: { bottom: { style: docx.BorderStyle.SINGLE, size: 6, color: 'D9DCE4' } },
          children: [],
        }),
      ];

    case 'pagebreak':
      return [new docx.Paragraph({ children: [new docx.PageBreak()] })];

    case 'spacer':
      return [
        new docx.Paragraph({
          spacing: { before: 0, after: pointsToTwips(block.height) },
          children: [],
        }),
      ];

    case 'columns': {
      // Word has no lightweight two-column primitive that survives editing, so
      // a borderless table keeps the visual structure and stays editable.
      const ratio = block.ratio ?? 0.5;
      return [
        new docx.Table({
          width: { size: 100, type: docx.WidthType.PERCENTAGE },
          borders: noBorders(docx),
          rows: [
            new docx.TableRow({
              children: [
                new docx.TableCell({
                  width: { size: Math.round(ratio * 100), type: docx.WidthType.PERCENTAGE },
                  borders: noBorders(docx),
                  children: block.left.flatMap((child) => convertBlock(docx, child, images, options)),
                }),
                new docx.TableCell({
                  width: { size: Math.round((1 - ratio) * 100), type: docx.WidthType.PERCENTAGE },
                  borders: noBorders(docx),
                  children: block.right.flatMap((child) => convertBlock(docx, child, images, options)),
                }),
              ],
            }),
          ],
        }),
      ];
    }

    default:
      return [];
  }
}

function noBorders(docx: Docx) {
  const none = { style: docx.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  return { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };
}

function convertList(docx: Docx, block: ListBlock, size: number): FileChild[] {
  return block.items.map(
    (item) =>
      new docx.Paragraph({
        numbering: block.ordered
          ? { reference: 'ou-ordered', level: Math.min(item.level ?? 0, 4) }
          : undefined,
        bullet: block.ordered ? undefined : { level: Math.min(item.level ?? 0, 4) },
        children: toRuns(docx, item.content, size),
      }),
  );
}

function convertTable(docx: Docx, block: TableBlock, size: number) {
  const columnCount = Math.max(block.header?.length ?? 0, ...block.rows.map((r) => r.length), 1);

  const buildRow = (cells: readonly ModelCell[], header: boolean) => {
    const padded = [...cells];
    while (padded.length < columnCount) padded.push([]);
    return new docx.TableRow({
      tableHeader: header,
      children: padded.map(
        (cell, index) =>
          new docx.TableCell({
            shading: header ? { fill: 'F1F2F6' } : undefined,
            width: block.widths?.[index]
              ? {
                  size: Math.round(
                    (block.widths[index] / block.widths.reduce((a, b) => a + b, 0)) * 100,
                  ),
                  type: docx.WidthType.PERCENTAGE,
                }
              : undefined,
            margins: { top: 60, bottom: 60, left: 90, right: 90 },
            children: [
              new docx.Paragraph({
                alignment: alignmentOf(docx, block.align?.[index]),
                spacing: { before: 0, after: 0 },
                children: toRuns(docx, cell, size * (block.compact ? 0.92 : 1)),
              }),
            ],
          }),
      ),
    });
  };

  return new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: [
      ...(block.header ? [buildRow(block.header, true)] : []),
      ...block.rows.map((row) => buildRow(row, false)),
    ],
  });
}

async function loadImages(
  blocks: readonly DocBlock[],
): Promise<Map<string, { bytes: Uint8Array; width: number; height: number; type: string }>> {
  const urls = new Set<string>();
  const collect = (list: readonly DocBlock[]): void => {
    for (const block of list) {
      if (block.type === 'image') urls.add(block.dataUrl);
      else if (block.type === 'columns') {
        collect(block.left);
        collect(block.right);
      }
    }
  };
  collect(blocks);

  const out = new Map<string, { bytes: Uint8Array; width: number; height: number; type: string }>();
  for (const dataUrl of urls) {
    try {
      let usable = dataUrl;
      if (!/^data:image\/(png|jpe?g)/i.test(dataUrl)) {
        const { convertDataUrl } = await import('./image.engine');
        usable = await convertDataUrl(dataUrl, 'image/png');
      }
      const response = await fetch(usable);
      const bytes = new Uint8Array(await response.arrayBuffer());
      const size = await measure(usable);
      out.set(dataUrl, {
        bytes,
        ...size,
        type: /^data:image\/jpe?g/i.test(usable) ? 'image/jpeg' : 'image/png',
      });
    } catch {
      /* skip images that cannot be decoded */
    }
  }
  return out;
}

function measure(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') return resolve({ width: 480, height: 320 });
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({ width: 480, height: 320 });
    image.src = dataUrl;
  });
}
