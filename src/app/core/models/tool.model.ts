/**
 * Domain model for the tool catalog.
 *
 * The catalog is the single source of truth for: the router configuration,
 * navigation, search, the command palette, sitemap generation and the
 * per-tool SEO metadata. Adding a tool means adding one catalog entry plus
 * one lazy route — nothing else in the app needs to know about it.
 */

export type ToolCategoryId =
  | 'viewer'
  | 'pdf'
  | 'word'
  | 'excel'
  | 'powerpoint'
  | 'convert'
  | 'generate'
  | 'diagram'
  | 'file';

export interface ToolCategory {
  readonly id: ToolCategoryId;
  /** URL segment shared by every tool in the category, e.g. `pdf`. */
  readonly slug: string;
  readonly title: string;
  readonly tagline: string;
  readonly description: string;
  readonly icon: string;
  /** CSS custom property holding the category accent colour. */
  readonly accentVar: string;
}

export interface ToolDefinition {
  /** Stable id, also used as the localStorage key for favourites. */
  readonly id: string;
  readonly category: ToolCategoryId;
  /** Final URL segment. Full path is `/{category.slug}/{slug}`. */
  readonly slug: string;
  readonly title: string;
  /** One-liner used on cards and in the command palette. */
  readonly summary: string;
  /** Long-form copy used for the meta description and the tool header. */
  readonly description: string;
  readonly icon: string;
  /** Extra search terms that should match this tool. */
  readonly keywords: readonly string[];
  /** File extensions the tool accepts, e.g. `['.pdf']`. Empty = no input. */
  readonly accepts: readonly string[];
  /** Surfaced on the home page and ranked first in listings. */
  readonly popular?: boolean;
  /**
   * Additional category pages this tool should be listed on. The canonical
   * URL never changes, so cross-listing costs nothing in SEO terms.
   */
  readonly alsoIn?: readonly ToolCategoryId[];
  readonly badge?: 'new' | 'beta';
  /** Question/answer pairs rendered as content and as FAQ structured data. */
  readonly faq?: readonly { readonly q: string; readonly a: string }[];
}

/** A catalog entry with its resolved absolute route, produced by the registry. */
export interface ResolvedTool extends ToolDefinition {
  readonly path: string;
  readonly categoryRef: ToolCategory;
}
