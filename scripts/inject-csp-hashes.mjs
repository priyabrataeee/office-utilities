/**
 * Adds SHA-256 hashes for Angular's inline bootstrap scripts to each prerendered
 * page's Content-Security-Policy.
 *
 * Why this exists
 * ---------------
 * Hydration with event replay makes Angular emit two inline <script> blocks per
 * page: the `ng-event-dispatch-contract` runtime and a `__jsaction_bootstrap`
 * call. A strict `script-src 'self'` blocks both, and the failure is quiet — the
 * page still renders, but every interaction that happens before hydration
 * finishes is silently dropped instead of being replayed.
 *
 * Adding `'unsafe-inline'` would fix it by giving up the protection that makes a
 * privacy-first tool worth trusting. Hashing the exact script bodies keeps the
 * policy strict while allowing precisely these scripts and nothing else.
 *
 * The hashes are derived from the real build output on every run, so they cannot
 * drift when Angular's runtime changes or a page starts listening for a new
 * event. Each page gets only the hashes it actually uses.
 *
 * Note that hashes do not apply to inline *event handlers* (`onload="..."`).
 * That is why `inlineCritical` is disabled in angular.json: it emits exactly
 * such a handler to swap a stylesheet's media, and no hash can permit it.
 */

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(here, '..');
const browserDir = resolve(rootDir, 'dist/office-utility/browser');

/** Matches an inline <script> — one without a `src` attribute. */
const INLINE_SCRIPT = /<script(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/script>/g;
/** `application/json` and `application/ld+json` payloads are data, never run. */
const DATA_SCRIPT = /type\s*=\s*"application\/(ld\+)?json"/i;
const CSP_META = /(<meta\s+http-equiv="Content-Security-Policy"\s+content=")([^"]*)(")/i;
/** Captures the script-src directive so it can be rebuilt from scratch. */
const SCRIPT_SRC = /script-src ([^;"]*)/;

function htmlFilesIn(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return htmlFilesIn(full);
    return entry.isFile() && entry.name.endsWith('.html') ? [full] : [];
  });
}

const pages = htmlFilesIn(browserDir);

/*
 * A CSP containing any hash makes browsers ignore 'unsafe-inline' outright.
 * Ads need 'unsafe-inline' (AdSense's inline scripts differ per impression,
 * so no hash can cover them), which means injecting hashes here would
 * silently re-block the very scripts the policy was widened to allow.
 *
 * Delete 'unsafe-inline' from src/index.html and hashing resumes by itself.
 */
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
    // Hashed over the exact bytes between the tags: any trimming or
    // normalisation here would produce a hash the browser never matches.
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

  // Rebuild script-src from its hash-free base so re-running is idempotent.
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
