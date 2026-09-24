import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(here, '..');
const browserDir = resolve(rootDir, 'dist/office-utility/browser');

const INLINE_SCRIPT = /<script(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/script>/g;
const DATA_SCRIPT = /type\s*=\s*"application\/(ld\+)?json"/i;
const CSP_META = /(<meta\s+http-equiv="Content-Security-Policy"\s+content=")([^"]*)(")/i;
const SCRIPT_SRC = /script-src ([^;"]*)/;

function htmlFilesIn(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return htmlFilesIn(full);
    return entry.isFile() && entry.name.endsWith('.html') ? [full] : [];
  });
}

const pages = htmlFilesIn(browserDir);

if (pages.length && /script-src[^;"]*'unsafe-inline'/.test(readFileSync(pages[0], 'utf8'))) {
  console.log("CSP hash injection skipped: script-src carries 'unsafe-inline' (ads enabled).");
  process.exit(0);
}
const distinct = new Set();
let patched = 0;
let skipped = 0;

for (const page of pages) {
  const html = readFileSync(page, 'utf8');

  const hashes = [];
  for (const [, attributes, body] of html.matchAll(INLINE_SCRIPT)) {
    if (DATA_SCRIPT.test(attributes)) continue;
    const hash = `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`;
    if (!hashes.includes(hash)) hashes.push(hash);
    distinct.add(hash);
  }

  if (hashes.length === 0) {
    skipped++;
    continue;
  }

  const meta = html.match(CSP_META);
  if (!meta) {
    console.error(`No CSP meta tag in ${relative(rootDir, page)} — cannot allow its inline scripts.`);
    process.exitCode = 1;
    continue;
  }

  const base = meta[2].match(SCRIPT_SRC);
  if (!base) {
    console.error(`No script-src directive in ${relative(rootDir, page)}.`);
    process.exitCode = 1;
    continue;
  }
  const sources = base[1].split(/\s+/).filter((s) => s && !s.startsWith("'sha256-"));
  const rebuilt = `script-src ${[...sources, ...hashes].join(' ')}`;
  const policy = meta[2].replace(SCRIPT_SRC, rebuilt);

  writeFileSync(page, html.replace(CSP_META, `$1${policy}$3`));
  patched++;
}

console.log(`CSP hashes injected into ${patched} page(s); ${skipped} had no inline scripts.`);
console.log(`${distinct.size} distinct inline script(s) allowed across the site.`);
