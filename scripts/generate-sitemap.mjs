import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(here, '..');
const outputDir = resolve(rootDir, 'dist/office-utility/browser');

const site = (
  process.env['OU_SITE_ORIGIN'] ||
  extract(readFileSync(resolve(rootDir, 'src/app/core/site.config.ts'), 'utf8'), /'(https?:\/\/[^']+)'/)
)?.replace(/\/+$/, '');
if (!site) throw new Error('Could not resolve the site origin');

const catalogSource = readFileSync(
  resolve(rootDir, 'src/app/core/data/tool-catalog.ts'),
  'utf8',
);
const categoryCatalog = catalogSource.slice(0, catalogSource.indexOf('export const TOOLS'));
const categorySlugList = [...categoryCatalog.matchAll(/slug:\s*'([^']+)'/g)].map(
  (match) => match[1],
);

const toolPaths = extractToolPaths(catalogSource, categoryCatalog);

const guideFiles = [
  ...readFileSync(resolve(rootDir, 'src/app/core/data/guide-catalog.ts'), 'utf8').matchAll(
    /from '\.\/guides\/([^']+)'/g,
  ),
].map(([, name]) => name);

const guideDateBySlug = new Map();

const guideSlugs = guideFiles
  .map((file) => {
    const source = readFileSync(resolve(rootDir, 'src/app/core/data/guides/' + file + '.ts'), 'utf8');
    const slug = extract(source, /slug:\s*'([^']+)'/);
    const updated = extract(source, /updated:\s*'(\d{4}-\d{2}-\d{2})'/);
    const published = extract(source, /published:\s*'(\d{4}-\d{2}-\d{2})'/);
    if (slug && (updated || published)) guideDateBySlug.set('/guides/' + slug, updated || published);
    return slug;
  })
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
  const declared = guideDateBySlug.get(path);
  if (declared) return declared;
  if (!fullHistory) {
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
  if (path.split('/').length === 2) return [CATEGORY_COPY, CATALOG];
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

if (fullHistory) {
  const sorted = Object.fromEntries(Object.entries(resolvedDates).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(snapshotPath, JSON.stringify(sorted, null, 2) + '\n');
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.join('\n')}
</urlset>
`;

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

try {
  const shell = readFileSync(join(outputDir, 'index.html'), 'utf8');
  writeFileSync(join(outputDir, '404.html'), shell);
} catch {}

console.log(`Wrote ${allPaths.length} URLs to sitemap.xml (${site})`);

function extract(source, pattern) {
  const match = source.match(pattern);
  return match ? match[1] : null;
}

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
