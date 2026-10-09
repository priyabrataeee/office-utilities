import { mkdir, writeFile } from 'node:fs/promises';
import { PDFDocument, PDFName, PDFString } from '@cantoo/pdf-lib';
import { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell } from 'docx';
import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';

const destination = new URL('../public/samples/', import.meta.url);
await mkdir(destination, { recursive: true });
const doc = new Document({ sections: [{ children: [
  new Paragraph({ text: 'Workshop meeting brief', heading: HeadingLevel.HEADING_1 }),
  new Paragraph('Fictional example. Jordan and Casey are planning a browser document workshop.'),
  new Paragraph({ text: 'Confirm the room booking.', bullet: { level: 0 } }),
  new Paragraph({ text: 'Prepare the sample documents.', bullet: { level: 0 } }),
  new Table({ rows: [['Owner', 'Action'], ['Jordan', 'Confirm room'], ['Casey', 'Prepare samples']].map((row) =>
    new TableRow({ children: row.map((text) => new TableCell({ children: [new Paragraph(text)] })) })) }),
] }] });
await writeFile(new URL('meeting-brief.docx', destination), await Packer.toBuffer(doc));
const workbook = XLSX.utils.book_new();
const sheet = XLSX.utils.aoa_to_sheet([
  ['Order ID', 'Excel date', 'ISO date text'],
  ['00123', 46090, '2026-03-09'],
  ['00124', 46268, '2026-09-03'],
]);
sheet.B2.z = 'dd/mm/yyyy';
sheet.B3.z = 'dd/mm/yyyy';
XLSX.utils.book_append_sheet(workbook, sheet, 'Orders');
await writeFile(new URL('date-export.xlsx', destination), XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
const pdf = await PDFDocument.create();
const first = pdf.addPage([595, 842]);
first.drawText('Overview: fictional workshop brief', { x: 45, y: 780, size: 17 });
const second = pdf.addPage([612, 792]);
second.drawText('Action: Jordan confirms the room.', { x: 45, y: 730, size: 17 });
const outlineRoot = pdf.context.obj({ Type: 'Outlines' });
const outlineRootRef = pdf.context.register(outlineRoot);
const bookmark = pdf.context.obj({ Title: PDFString.of('Overview'), Parent: outlineRootRef, Dest: [first.ref, 'Fit'] });
const bookmarkRef = pdf.context.register(bookmark);
outlineRoot.set(PDFName.of('First'), bookmarkRef);
outlineRoot.set(PDFName.of('Last'), bookmarkRef);
outlineRoot.set(PDFName.of('Count'), pdf.context.obj(1));
pdf.catalog.set(PDFName.of('Outlines'), outlineRootRef);
await writeFile(new URL('bookmarked-brief.pdf', destination), await pdf.save());
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'Office Utilities';
const slide = pptx.addSlide();
slide.addText('Fictional workshop', { x: 1, y: 1, w: 10, h: 1, fontSize: 28 });
slide.addText('Inspect the archive entries before choosing what to reduce.', { x: 1, y: 2, w: 10, h: 1, fontSize: 18 });
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#4055aa"/><circle cx="320" cy="180" r="100" fill="#f5cb5c"/></svg>';
slide.addImage({ data: `image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`, x: 1, y: 3.2, w: 4, h: 2.25 });
const slide2 = pptx.addSlide();
slide2.addText('Action: Jordan confirms the room.', { x: 1, y: 1, w: 10, h: 1, fontSize: 24 });
await writeFile(new URL('presentation-example.pptx', destination), await pptx.write({ outputType: 'nodebuffer' }));
console.log('Generated four fictional sample documents.');
