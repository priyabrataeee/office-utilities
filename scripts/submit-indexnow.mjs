/**
 * Pushes the sitemap's URLs to IndexNow.
 *
 * IndexNow is a ping rather than a crawl request: participating engines — Bing,
 * Yandex, Seznam, Naver — are told a URL changed instead of waiting to rediscover
 * it. Google does not participate, so this does nothing for Google Search.
 *
 * Run it AFTER a deploy, never before: the engine fetches the key file from the
 * live site to verify ownership, so pinging a URL list that is not yet published
 * earns a 403 rather than a crawl.
 *
 *   npm run indexnow             submit every URL in the sitemap
 *   npm run indexnow -- --dry    print what would be sent and exit
 */

import { readFileSync, existsSync } from 'node:fs';

/** Must match the file name in public/ — asserted below rather than assumed. */
const KEY = '95c7861e7a6f7071744b0b13f9503c83';
const HOST = 'office-utilities.org';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const SITEMAP = 'dist/office-utility/browser/sitemap.xml';
const MAX_URLS = 10000;

const dry = process.argv.includes('--dry');

/* The key file is the whole of the ownership proof. A mismatch between it and
   the constant above fails as 403 at the API, which is a confusing way to find
   out about a typo. */
const keyFile = `public/${KEY}.txt`;
if (!existsSync(keyFile)) {
  console.error(`IndexNow: key file missing. Expected ${keyFile}`);
  process.exit(1);
}
const keyFileContents = readFileSync(keyFile, 'utf8').trim();
if (keyFileContents !== KEY) {
  console.error(`IndexNow: ${keyFile} contains "${keyFileContents}" but the key is "${KEY}".`);
  process.exit(1);
}

if (!existsSync(SITEMAP)) {
  console.error(`IndexNow: ${SITEMAP} not found — run \`npm run build\` first.`);
  process.exit(1);
}

const urlList = [...readFileSync(SITEMAP, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => m[1].trim())
  .filter((u) => u.startsWith(`https://${HOST}/`) || u === `https://${HOST}`);

if (!urlList.length) {
  console.error('IndexNow: no URLs found in the sitemap.');
  process.exit(1);
}
if (urlList.length > MAX_URLS) {
  console.error(`IndexNow: ${urlList.length} URLs exceeds the ${MAX_URLS} per-request limit.`);
  process.exit(1);
}

const payload = {
  host: HOST,
  key: KEY,
  keyLocation: `https://${HOST}/${KEY}.txt`,
  urlList,
};

if (dry) {
  console.log(`IndexNow (dry run): would submit ${urlList.length} URLs to ${ENDPOINT}`);
  console.log(`  keyLocation: ${payload.keyLocation}`);
  for (const u of urlList.slice(0, 5)) console.log(`  ${u}`);
  if (urlList.length > 5) console.log(`  … and ${urlList.length - 5} more`);
  process.exit(0);
}

const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(payload),
});

/* The documented codes, spelled out — "422" on its own is not a useful thing to
   read six months from now. */
const MEANING = {
  200: 'OK — URLs submitted.',
  202: 'Accepted — URLs received, key validation still pending.',
  400: 'Bad request — the payload was malformed.',
  403: 'Forbidden — the key file could not be verified. Is the site deployed?',
  422: 'Unprocessable — URLs do not match the host, or the key does not match the schema.',
  429: 'Too many requests — throttled as potential spam. Submit less often.',
};

console.log(`IndexNow: ${res.status} ${MEANING[res.status] ?? res.statusText}`);
console.log(`  submitted ${urlList.length} URLs as ${HOST}`);
process.exit(res.status === 200 || res.status === 202 ? 0 : 1);
