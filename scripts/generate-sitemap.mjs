/**
 * Emits sitemap.xml, robots.txt and llms.txt into the built output.
 *
 * Both are derived from the same catalog the app uses, so adding a tool
 * automatically enrols it in SEO — nothing extra to remember.
 */

import { execSync } from 'node:child_process';
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
// Keep categories and tools separate before extracting slugs. The previous
// version split one combined list at a hard-coded index of nine, which would
// silently omit a tenth category from the sitemap and AI index.
const categoryCatalog = catalogSource.slice(0, catalogSource.indexOf('export const TOOLS'));
const categorySlugList = [...categoryCatalog.matchAll(/slug:\s*'([^']+)'/g)].map(
  (match) => match[1],
);

const toolPaths = extractToolPaths(catalogSource, categoryCatalog);

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

/**
 * Last-modified dates.
 *
 * `changefreq` and `priority` are gone: Google ignores both and says so. It
 * does read `lastmod`, but only while it stays truthful — stamping every page
 * with today's build date is the fastest way to have it ignored here too.
 *
 * So each URL is dated from the last commit that touched the source actually
 * behind it: a guide from its own file, a tool page from the catalog and the
 * copy layer, a static page from its component. Pages inherit a real editing
 * history rather than a deployment timestamp.
 */
/*
 * Where the dates come from.
 *
 * `git log` gives a truthful per-file date, but only where the full history
 * exists. Cloudflare builds from a depth-1 clone, so every file reports the
 * deploy commit and all 135 URLs end up stamped with the same day — which is
 * exactly the "lastmod everywhere is identical" signal Google learns to ignore.
 *
 * So the dates are resolved here when history is available and written to
 * `${SNAPSHOT_NAME}`, which is committed. A shallow build reads that snapshot
 * instead of asking git a question it cannot answer.
 */
const SNAPSHOT_NAME = 'content-dates.json';
const snapshotPath = resolve(here, SNAPSHOT_NAME);

function hasFullHistory() {
  try {
    const shallow = execSync('git rev-parse --is-shallow-repository', {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return shallow === 'false';
  } catch {
    return false;
  }
}

function readSnapshot() {
  try {
    return JSON.parse(readFileSync(snapshotPath, 'utf8'));
  } catch {
    return {};
  }
}

const fullHistory = hasFullHistory();
const snapshot = readSnapshot();

const gitDateCache = new Map();
function gitDate(file) {
  if (!gitDateCache.has(file)) {
    let iso = '';
    try {
      iso = execSync(`git log -1 --format=%cI -- "${file}"`, {
        cwd: rootDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
    } catch {
      iso = '';
    }
    gitDateCache.set(file, iso);
  }
  return gitDateCache.get(file);
}

function lastCommitDate(path, files) {
  if (!fullHistory) {
    // Trust the committed snapshot, or say nothing. An omitted lastmod is
    // better than a date every page shares.
    return snapshot[path] ?? '';
  }
  let newest = '';
  for (const file of files) {
    const iso = gitDate(file);
    if (iso && iso > newest) newest = iso;
  }
  return newest ? newest.slice(0, 10) : '';
}

const CATALOG = 'src/app/core/data/tool-catalog.ts';
const TOOL_COPY = 'src/app/core/data/tool-content.ts';
const CATEGORY_COPY = 'src/app/core/data/category-content.ts';

const guideFileBySlug = new Map();
guideFiles.forEach((file, index) => {
  const slug = guideSlugs[index];
  if (slug) guideFileBySlug.set(`/guides/${slug}`, `src/app/core/data/guides/${file}.ts`);
});

const staticSources = {
  '/': 'src/app/features/home',
  '/tools': 'src/app/features/all-tools',
  '/categories': 'src/app/features/categories',
  '/about': 'src/app/features/about',
  '/privacy': 'src/app/features/privacy',
  '/contact': 'src/app/features/contact',
  '/terms': 'src/app/features/terms',
  '/disclaimer': 'src/app/features/disclaimer',
  '/guides': 'src/app/features/guides',
};

function sourcesFor(path) {
  if (guideFileBySlug.has(path)) return [guideFileBySlug.get(path)];
  if (staticSources[path]) return [staticSources[path]];
  // A category hub reflects its own copy and the catalog it lists.
  if (path.split('/').length === 2) return [CATEGORY_COPY, CATALOG];
  // A tool page reflects the catalog entry and its extended copy.
  return [CATALOG, TOOL_COPY];
}

const resolvedDates = {};
const sitemapUrls = allPaths.map((path) => {
  const lastmod = lastCommitDate(path, sourcesFor(path));
  if (lastmod) resolvedDates[path] = lastmod;
  return `  <url>
    <loc>${site}${path === '/' ? '' : path}</loc>${lastmod ? `
    <lastmod>${lastmod}</lastmod>` : ''}
  </url>`;
});

// Refresh the committed snapshot whenever a build had real history to read,
// so the next shallow CI build inherits today's answers rather than last
// month's. Sorted so the diff is reviewable.
if (fullHistory) {
  const sorted = Object.fromEntries(Object.entries(resolvedDates).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(snapshotPath, JSON.stringify(sorted, null, 2) + '\n');
}

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

# /favorites and /recent are personal views backed by local storage and render
# empty for anyone arriving from search. They carry a noindex tag in their own
# markup, which is deliberately not paired with a Disallow here: a blocked
# crawler never fetches the page, so it never sees the noindex and the URL can
# still surface as a bare link. Letting it crawl and read the tag is what
# actually keeps them out of the index.

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

/**
 * The tool catalog stores category and tool slugs separately, so a full URL
 * needs both. We rebuild the mapping by walking the source in order.
 */
function extractToolPaths(source, categoriesSource) {
  const categoryBySlug = new Map();
  const categoryRe = /id:\s*'([a-z]+)',\s*slug:\s*'([^']+)'/g;
  let match;
  while ((match = categoryRe.exec(categoriesSource)) !== null) {
    categoryBySlug.set(match[1], match[2]);
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
  while ((match = categoryRe.exec(categoryCatalog)) !== null) {
    categories.push({ id: match[1], slug: match[2], title: match[3] });
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
