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
  readonly slug: string;
  readonly title: string;
  readonly tagline: string;
  readonly description: string;
  readonly icon: string;
  readonly accentVar: string;
}

export interface ToolDefinition {
  readonly id: string;
  readonly category: ToolCategoryId;
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly description: string;
  readonly icon: string;
  readonly keywords: readonly string[];
  readonly accepts: readonly string[];
  readonly popular?: boolean;
  readonly alsoIn?: readonly ToolCategoryId[];
  readonly badge?: 'new' | 'beta';
  readonly faq?: readonly { readonly q: string; readonly a: string }[];
}

export interface ResolvedTool extends ToolDefinition {
  readonly path: string;
  readonly categoryRef: ToolCategory;
}
