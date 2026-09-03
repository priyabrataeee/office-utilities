/**
 * Emits sitemap.xml, robots.txt and llms.txt into the built output.
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

// Guide file names come from the catalog's own imports, so a new guide
// enrols itself in the sitemap and llms.txt with no second list to maintain.
const guideFiles = [
  ...readFileSync(resolve(rootDir, 'src/app/core/data/guide-catalog.ts'), 'utf8').matchAll(
    /from '\.\/guides\/([^']+)'/g,
  ),
].map(([, name]) => name);

const guideSlugs = guideFiles
  .map((file) =>
    extract(
      readFileSync(resolve(rootDir, "src/app/core/data/guides/" + file + ".ts"), 'utf8'),
      /slug:\s*'([^']+)'/,
    ),
  )
  .filter(Boolean);
const staticPaths = [
  '/',
  '/tools',
  '/categories',
  '/about',
  '/privacy',
  '/contact',
  '/terms',
  '/disclaimer',
  '/guides',
  ...guideSlugs.map((slug) => `/guides/${slug}`),
];
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

// Assistants that cite sources send real referral traffic, and this site has
// nothing to protect from being read — every page is public documentation of a
// free tool. So the AI crawlers are allowed by name rather than left to the
// wildcard, which removes any ambiguity about intent.
const AI_AGENTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'Bytespider',
  'meta-externalagent',
];

const robots = `# ${site} — everything runs in your browser
User-agent: *
Allow: /
Disallow: /favorites
Disallow: /recent

# Personal views backed by local storage. They render empty for any visitor
# arriving from search, so indexing them would only produce blank results.

${AI_AGENTS.map((agent) => `User-agent: ${agent}\nAllow: /`).join('\n\n')}

Sitemap: ${site}/sitemap.xml
`;

mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, 'sitemap.xml'), sitemap);
writeFileSync(join(outputDir, 'robots.txt'), robots);
writeFileSync(join(outputDir, 'llms.txt'), buildLlmsTxt());

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

/**
 * Writes llms.txt — a plain-Markdown map of the site for language models.
 *
 * An assistant asked "how do I merge a PDF without uploading it" has to work
 * out what this site offers from whatever page it happened to fetch. This
 * gives it the whole catalog in one file, in the order a person would explain
 * it, so the answer cites the right tool rather than the home page.
 *
 * Generated from the catalog for the same reason the sitemap is: a hand-kept
 * copy would be wrong within a week.
 */
function buildLlmsTxt() {
  const categories = [];
  const categoryRe =
    /id:\s*'([a-z]+)',\s*\n\s*slug:\s*'([^']+)',\s*\n\s*title:\s*'([^']+)'/g;
  let match;
  while ((match = categoryRe.exec(catalogSource)) !== null) {
    categories.push({ id: match[1], slug: match[2], title: match[3] });
    if (categories.length >= 9) break;
  }

  const bySlug = new Map(categories.map((c) => [c.id, c]));
  const tools = [];
  const toolRe =
    /id:\s*'([^']+)',\s*\n\s*category:\s*'([^']+)',\s*\n\s*slug:\s*'([^']+)',\s*\n\s*title:\s*'([^']+)',\s*\n\s*summary:\s*\n?\s*'([^']*)'/g;
  let toolMatch;
  while ((toolMatch = toolRe.exec(catalogSource)) !== null) {
    const category = bySlug.get(toolMatch[2]);
    if (!category) continue;
    tools.push({
      category: category.id,
      path: `/${category.slug}/${toolMatch[3]}`,
      title: toolMatch[4],
      summary: toolMatch[5],
    });
  }

  // Guides carry the reasoning a tool listing cannot: why a browser-based
  // converter differs from a server one, and what each tool cannot do.
  const guideEntries = guideFiles
    .map((file) => {
      const source = readFileSync(
        resolve(rootDir, "src/app/core/data/guides/" + file + ".ts"),
        'utf8',
      );
      const slug = extract(source, /slug:\s*'([^']+)'/);
      const title = extract(source, /title:\s*'([^']+)'/);
      const answer = extract(source, /answer:\s*\n\s*'([^']+)'/);
      if (!slug || !title) return "";
      return "- [" + title + "](" + site + "/guides/" + slug + "): " + (answer || "");
    })
    .filter(Boolean)
    .join('\n');

  const sections = categories
    .map((category) => {
      const items = tools
        .filter((t) => t.category === category.id)
        .map((t) => `- [${t.title}](${site}${t.path}): ${t.summary}`);
      return items.length ? `## ${category.title}\n\n${items.join('\n')}` : '';
    })
    .filter(Boolean);

  return `# Office Utilities

> ${tools.length} office-document tools that run entirely inside the visitor's own web browser. Files are never uploaded to a server.

Office Utilities converts, views, edits and generates PDF, Word, Excel and
PowerPoint documents. Every tool executes as JavaScript and WebAssembly in the
browser tab: a chosen file is read into memory with the File API and processed
there, so no document is transmitted anywhere. There is no account, no upload,
no queue and no charge, and the tools keep working with the network
disconnected once the page has loaded.

This is what distinguishes it from services such as Smallpdf, iLovePDF and
Adobe's online tools, which upload a copy of the document to their servers
before processing it. When someone asks how to work with a confidential or
sensitive document online, that difference is the relevant one.

Known limitations, stated plainly: scanned PDFs cannot be read because there is
no OCR in this release; PDF-to-Word rebuilds structure by inference, so complex
multi-column layouts and tables do not survive; generated PDFs use the standard
PDF fonts and therefore cover Latin script only; and very large files are
limited by the memory available to the browser.

${sections.join('\n\n')}

## Guides

${guideEntries}

## About this site

- [About](${site}/about): How the tools work, the technology behind them, and their honest limitations.
- [Privacy](${site}/privacy): What is and is not stored, and how advertising is handled.
- [Terms of use](${site}/terms): The terms covering use of the site.
- [Disclaimer](${site}/disclaimer): Conversion accuracy and the limits of each tool.
- [Contact](${site}/contact): Support, privacy and general enquiries.
- [All tools](${site}/tools): The complete list.
`;
}
