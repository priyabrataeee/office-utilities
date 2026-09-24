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

export interface GuideNote {
  readonly type: 'note';
  readonly tone?: 'info' | 'warn';
  readonly title?: string;
  readonly text: string;
}

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
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly answer: string;
  readonly keywords: readonly string[];
  readonly tools: readonly string[];
  readonly published: string;
  readonly updated?: string;
  readonly body: readonly GuideBlock[];
}

export interface ResolvedGuide extends GuideDefinition {
  readonly path: string;
  readonly readingMinutes: number;
}
