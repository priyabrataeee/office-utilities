/**
 * Domain model for the written guides.
 *
 * Bodies are structured blocks rather than a Markdown or HTML string, because
 * the guides exist to be indexed. Markdown rendered in the browser would leave
 * every prerendered page empty of the content it was written for, and an HTML
 * string would mean pushing unescaped markup through `innerHTML` on pages whose
 * whole premise is that nothing untrusted executes here.
 *
 * Inline links use a small `[label](/path)` convention parsed at render time
 * into real anchors, so the source stays readable without any raw markup.
 */

export interface GuideParagraph {
  readonly type: 'p';
  readonly text: string;
}

export interface GuideHeading {
  readonly type: 'h2' | 'h3';
  readonly text: string;
}

export interface GuideList {
  readonly type: 'ul' | 'ol';
  readonly items: readonly string[];
}

/** A pulled-out aside — a caveat, a warning, or the honest limitation. */
export interface GuideNote {
  readonly type: 'note';
  readonly tone?: 'info' | 'warn';
  readonly title?: string;
  readonly text: string;
}

/** An inline call to action pointing at the tool the guide is about. */
export interface GuideToolCard {
  readonly type: 'tool';
  readonly toolId: string;
  readonly text?: string;
}

export type GuideBlock =
  | GuideParagraph
  | GuideHeading
  | GuideList
  | GuideNote
  | GuideToolCard;

export interface GuideDefinition {
  /** Final URL segment. Full path is `/guides/{slug}`. */
  readonly slug: string;
  readonly title: string;
  /** Used as the meta description and on the index card. */
  readonly summary: string;
  /** The question the reader typed, answered in one or two sentences. */
  readonly answer: string;
  readonly keywords: readonly string[];
  /** Catalog ids of the tools this guide sends people to. */
  readonly tools: readonly string[];
  /** ISO date, used for `datePublished` and the sitemap. */
  readonly published: string;
  readonly updated?: string;
  readonly body: readonly GuideBlock[];
}

export interface ResolvedGuide extends GuideDefinition {
  readonly path: string;
  readonly readingMinutes: number;
}
