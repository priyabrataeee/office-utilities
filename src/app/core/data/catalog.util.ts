import type { ResolvedTool, ToolCategory, ToolCategoryId } from '../models/tool.model';
import { TOOLS, TOOL_CATEGORIES } from './tool-catalog';

/**
 * Pure catalog helpers. Kept free of Angular imports so the sitemap
 * generator can import this module directly under Node.
 */

const categoryById = new Map<ToolCategoryId, ToolCategory>(
  TOOL_CATEGORIES.map((c) => [c.id, c]),
);

export function categoryPath(category: ToolCategory): string {
  return `/${category.slug}`;
}

export const RESOLVED_TOOLS: readonly ResolvedTool[] = TOOLS.map((tool) => {
  const categoryRef = categoryById.get(tool.category);
  if (!categoryRef) {
    throw new Error(`Tool "${tool.id}" references unknown category "${tool.category}"`);
  }
  return { ...tool, categoryRef, path: `/${categoryRef.slug}/${tool.slug}` };
});

const toolById = new Map(RESOLVED_TOOLS.map((t) => [t.id, t]));
const toolByPath = new Map(RESOLVED_TOOLS.map((t) => [t.path, t]));

export function getTool(id: string): ResolvedTool | undefined {
  return toolById.get(id);
}

export function getToolByPath(path: string): ResolvedTool | undefined {
  return toolByPath.get(path.replace(/\/+$/, '') || '/');
}

export function getCategory(id: ToolCategoryId): ToolCategory | undefined {
  return categoryById.get(id);
}

/** Tools whose canonical or cross-listed category matches. */
export function toolsInCategory(id: ToolCategoryId): ResolvedTool[] {
  return RESOLVED_TOOLS.filter((t) => t.category === id || t.alsoIn?.includes(id));
}

/** Static page routes that should appear in the sitemap. */
export const STATIC_ROUTES: readonly string[] = [
  '/',
  '/tools',
  '/categories',
  '/favorites',
  '/recent',
  '/about',
  '/privacy',
];

export function allRoutes(): string[] {
  return [
    ...STATIC_ROUTES,
    ...TOOL_CATEGORIES.map(categoryPath),
    ...RESOLVED_TOOLS.map((t) => t.path),
  ];
}

/* ------------------------------------------------------------------
   Search
   ------------------------------------------------------------------ */

export interface SearchHit {
  readonly tool: ResolvedTool;
  readonly score: number;
}

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Field-weighted substring search. Deliberately simple and synchronous —
 * with fewer than a hundred entries this runs in well under a millisecond,
 * which is what makes the command palette feel instant.
 */
export function searchTools(query: string, pool: readonly ResolvedTool[] = RESOLVED_TOOLS): SearchHit[] {
  const q = normalise(query);
  if (!q) return [];
  const terms = q.split(' ');

  const hits: SearchHit[] = [];
  for (const tool of pool) {
    const title = normalise(tool.title);
    const summary = normalise(tool.summary);
    const keywords = normalise(tool.keywords.join(' '));
    const category = normalise(tool.categoryRef.title);
    const slug = normalise(tool.slug);

    let score = 0;
    let matchedAll = true;

    for (const term of terms) {
      let termScore = 0;
      if (title === term) termScore += 120;
      else if (title.startsWith(term)) termScore += 70;
      else if (title.includes(term)) termScore += 45;

      if (slug.includes(term)) termScore += 25;
      if (keywords.includes(term)) termScore += 22;
      if (summary.includes(term)) termScore += 10;
      if (category.includes(term)) termScore += 8;
      if (tool.accepts.some((ext) => ext.slice(1) === term)) termScore += 30;

      if (termScore === 0) {
        matchedAll = false;
        break;
      }
      score += termScore;
    }

    if (!matchedAll) continue;
    if (tool.popular) score += 12;
    hits.push({ tool, score });
  }

  return hits.sort((a, b) => b.score - a.score || a.tool.title.localeCompare(b.tool.title));
}

/** Tools related to `tool`: same category first, then keyword overlap. */
export function relatedTools(tool: ResolvedTool, limit = 6): ResolvedTool[] {
  const keywords = new Set(tool.keywords);
  return RESOLVED_TOOLS.filter((t) => t.id !== tool.id)
    .map((t) => {
      let score = t.category === tool.category ? 10 : 0;
      for (const k of t.keywords) if (keywords.has(k)) score += 4;
      for (const ext of t.accepts) if (tool.accepts.includes(ext)) score += 3;
      if (t.popular) score += 1;
      return { t, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.t);
}

/** Tools that can open a given file extension, best first. */
export function toolsForExtension(ext: string): ResolvedTool[] {
  const needle = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  return RESOLVED_TOOLS.filter((t) => t.accepts.includes(needle)).sort(
    (a, b) => Number(!!b.popular) - Number(!!a.popular),
  );
}
