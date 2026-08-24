/**
 * Emits a sitemap.xml and a robots.txt into the built output.
 *
 * Both are derived from the same catalog the app uses, so adding a tool
 * automatically enrols it in SEO — nothing extra to remember.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(here, '..');
const outputDir = resolve(rootDir, 'dist/office-utility/browser');

// Prefer the deploy-time override so sitemap and app agree on the origin.
const site = (
  process.env['OU_SITE_ORIGIN'] ||
  extract(readFileSync(resolve(rootDir, 'src/app/core/site.config.ts'), 'utf8'), /'(https?:\/\/[^']+)'/)
)?.replace(/\/+$/, '');
if (!site) throw new Error('Could not resolve the site origin');

const catalogSource = readFileSync(
  resolve(rootDir, 'src/app/core/data/tool-catalog.ts'),
  'utf8',
);
const categorySlugs = [...catalogSource.matchAll(/slug:\s*'([^']+)'/g)].map((match) => match[1]);
const [categorySlugList, toolSlugList] = split(categorySlugs, 9);

const toolPaths = extractToolPaths(catalogSource);
const staticPaths = ['/', '/tools', '/categories', '/about', '/privacy'];
const categoryPaths = categorySlugList.map((slug) => `/${slug}`);
const allPaths = [...new Set([...staticPaths, ...categoryPaths, ...toolPaths])];

const today = new Date().toISOString().slice(0, 10);

const sitemapUrls = allPaths.map((path) => `  <url>
    <loc>${site}${path === '/' ? '' : path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${path === '/' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${path === '/' ? '1.0' : path.split('/').length === 2 ? '0.8' : '0.7'}</priority>
  </url>`);

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.join('\n')}
</urlset>
`;

const robots = `# ${site} — everything runs in your browser
User-agent: *
Allow: /
Disallow: /favorites
Disallow: /recent

Sitemap: ${site}/sitemap.xml
`;

mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, 'sitemap.xml'), sitemap);
writeFileSync(join(outputDir, 'robots.txt'), robots);

// GitHub Pages has no wildcard redirect; a copy of the app shell at 404.html
// is the standard workaround, and it hurts nothing on hosts that do have
// wildcard redirects.
try {
  const shell = readFileSync(join(outputDir, 'index.html'), 'utf8');
  writeFileSync(join(outputDir, '404.html'), shell);
} catch {
  /* running before the browser bundle exists is fine — sitemap still writes */
}

console.log(`Wrote ${allPaths.length} URLs to sitemap.xml (${site})`);

// --- helpers ---------------------------------------------------------

function extract(source, pattern) {
  const match = source.match(pattern);
  return match ? match[1] : null;
}

/** Splits the first `count` slugs (categories) from the rest (tools). */
function split(list, count) {
  return [list.slice(0, count), list.slice(count)];
}

/**
 * The tool catalog stores category and tool slugs separately, so a full URL
 * needs both. We rebuild the mapping by walking the source in order.
 */
function extractToolPaths(source) {
  const categoryBySlug = new Map();
  const categoryRe = /id:\s*'([a-z]+)',\s*slug:\s*'([^']+)'/g;
  let match;
  while ((match = categoryRe.exec(source)) !== null) {
    categoryBySlug.set(match[1], match[2]);
    if (categoryBySlug.size >= 9) break;
  }

  const tools = [];
  const toolRe = /category:\s*'([^']+)',[\s\S]*?slug:\s*'([^']+)'/g;
  let toolMatch;
  while ((toolMatch = toolRe.exec(source)) !== null) {
    const categorySlug = categoryBySlug.get(toolMatch[1]);
    if (categorySlug) tools.push(`/${categorySlug}/${toolMatch[2]}`);
  }
  return tools;
}
