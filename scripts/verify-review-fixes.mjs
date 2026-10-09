import assert from 'node:assert/strict';
import { readFile, readdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { PDFDocument, PDFName } from '@cantoo/pdf-lib';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

const root = resolve(import.meta.dirname, '..');
const output = join(root, 'dist/office-utility/browser');
const sample = (name) => readFile(join(root, 'public/samples', name));
const source = await PDFDocument.load(await sample('bookmarked-brief.pdf'));
assert(source.catalog.has(PDFName.of('Outlines')));
const scratch = await mkdtemp(join(tmpdir(), 'office-review-'));
try {
  const policyPath = join(scratch, 'ad-policy.mjs');
  await build({ entryPoints: [join(root, 'src/app/core/data/ad-policy.ts')], outfile: policyPath, bundle: true, platform: 'node', format: 'esm' });
  const { isAdEligiblePath } = await import(pathToFileURL(policyPath).href);
  for (const path of ['/', '/pdf/merge-pdf', '/pdf/merge-pdf/?test=1', '/guides/why-your-powerpoint-is-too-big-to-email']) assert(isAdEligiblePath(path));
  for (const path of ['/recent', '/favorites?x=1', '/tools', '/privacy', '/contact', '/404', '/pdf/not-a-tool', '/guides/missing', '//evil.example']) assert(!isAdEligiblePath(path));
  console.log('Ad route policy: eligible content allowed; personal, navigation and unknown routes excluded.');
  const bundled = join(scratch, 'pdf-engine.mjs');
  await build({ entryPoints: [join(root, 'src/app/core/engines/pdf.engine.ts')], outfile: bundled, bundle: true, platform: 'node', format: 'esm', packages: 'external' });
  const code = await readFile(bundled, 'utf8');
  const { writeFile } = await import('node:fs/promises');
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const pdfPackage = pathToFileURL(require.resolve('@cantoo/pdf-lib')).href;
  await writeFile(bundled, code.replaceAll('import("@cantoo/pdf-lib")', `import(${JSON.stringify(pdfPackage)})`));
  const engine = await import(pathToFileURL(bundled).href);
  const file = new Blob([await sample('bookmarked-brief.pdf')]);
  const merged = await engine.mergePdfs([{ file, name: 'first' }, { file, name: 'second' }]);
  const result = await PDFDocument.load(await merged.arrayBuffer());
  assert.equal(result.getPageCount(), 4);
  assert.equal(result.catalog.has(PDFName.of('Outlines')), false);
  assert.deepEqual(result.getPages().map((page) => [page.getWidth(), page.getHeight()]), [[595, 842], [612, 792], [595, 842], [612, 792]]);
  console.log('Merge verified: four pages, original dimensions, bookmarks not transferred.');
} finally {
  await rm(scratch, { recursive: true, force: true });
}
const workbook = XLSX.read(await sample('date-export.xlsx'), { type: 'buffer' });
const sheet = workbook.Sheets.Orders;
assert.equal(sheet.A2.v, '00123');
for (const row of [2, 3]) {
  const parsed = XLSX.SSF.parse_date_code(sheet[`B${row}`].v);
  const iso = `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  assert.equal(iso, sheet[`C${row}`].v);
}
const csv = XLSX.utils.sheet_to_csv(sheet);
assert(csv.includes('00123,09/03/2026,2026-03-09'));
assert(csv.includes('00124,03/09/2026,2026-09-03'));
const docx = await JSZip.loadAsync(await sample('meeting-brief.docx'));
const docxml = await docx.file('word/document.xml').async('string');
assert(docxml.includes('Jordan') && docxml.includes('<w:tbl>'));
const pptx = await JSZip.loadAsync(await sample('presentation-example.pptx'));
assert(pptx.file('ppt/slides/slide1.xml') && pptx.file('ppt/slides/slide2.xml'));
assert(Object.keys(pptx.files).some((name) => name.startsWith('ppt/media/') && !pptx.files[name].dir));
console.log('Sample DOCX structure, spreadsheet date round-trip and PPTX media verified.');
async function filesAt(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? filesAt(join(directory, entry.name)) : join(directory, entry.name)))).flat();
}
const pages = (await filesAt(output)).filter((path) => path.endsWith('.html'));
for (const path of pages) {
  const html = await readFile(path, 'utf8');
  assert(!/<script[^>]+src="[^\"]*adsbygoogle\.js/.test(html), `Ad loader in review build: ${path}`);
  for (const match of html.matchAll(/href="(\/samples\/[^\"]+)"/g)) {
    await readFile(join(output, match[1]));
  }
}
const errorPage = await readFile(join(output, '404.html'), 'utf8');
assert(errorPage.includes('noindex, follow') && errorPage.includes('This page could not be found'));
assert(!errorPage.includes('adsbygoogle') && !errorPage.includes('<app-root'));
const sitemap = await readFile(join(output, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
assert.equal(urls.length, new Set(urls).size);
for (const url of urls) {
  const path = new URL(url).pathname;
  assert(!['/favorites', '/recent', '/404.html'].includes(path));
  const candidates = path === '/' ? ['index.html'] : [path.slice(1) + '/index.html', path.slice(1) + '.html'];
  let html;
  for (const candidate of candidates) { try { html = await readFile(join(output, candidate), 'utf8'); break; } catch {} }
  assert(html, `Missing prerendered sitemap URL: ${url}`);
  assert(!/<meta name="robots" content="noindex/.test(html), `Noindex in sitemap: ${url}`);
}
console.log(`Verified ${pages.length} HTML files and ${urls.length} sitemap URLs; review build has no static ad loader.`);
