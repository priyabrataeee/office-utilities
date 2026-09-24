import { Injectable, computed, inject, signal } from '@angular/core';
import type { ResolvedTool, ToolCategory, ToolCategoryId } from '../models/tool.model';
import { TOOL_CATEGORIES } from '../data/tool-catalog';
import {
  RESOLVED_TOOLS,
  getCategory,
  getTool,
  getToolByPath,
  relatedTools,
  searchTools,
  toolsForExtension,
  toolsInCategory,
} from '../data/catalog.util';
import { FavoritesService } from './favorites.service';
import { RecentService } from './recent.service';

@Injectable({ providedIn: 'root' })
export class ToolRegistryService {
  private readonly favorites = inject(FavoritesService);
  private readonly recent = inject(RecentService);

  readonly tools: readonly ResolvedTool[] = RESOLVED_TOOLS;
  readonly categories: readonly ToolCategory[] = TOOL_CATEGORIES;

  readonly popular = computed(() => this.tools.filter((t) => t.popular));

  readonly favoriteTools = computed(() =>
    this.favorites
      .ids()
      .map((id) => getTool(id))
      .filter((t): t is ResolvedTool => !!t),
  );

  readonly recentTools = computed(() =>
    this.recent
      .toolIds()
      .map((id) => getTool(id))
      .filter((t): t is ResolvedTool => !!t),
  );

  readonly query = signal('');
  readonly results = computed(() => searchTools(this.query()).map((h) => h.tool));

  byId(id: string): ResolvedTool | undefined {
    return getTool(id);
  }

  byPath(path: string): ResolvedTool | undefined {
    return getToolByPath(path);
  }

  category(id: ToolCategoryId): ToolCategory | undefined {
    return getCategory(id);
  }

  categoryBySlug(slug: string): ToolCategory | undefined {
    return this.categories.find((c) => c.slug === slug);
  }

  inCategory(id: ToolCategoryId): ResolvedTool[] {
    return toolsInCategory(id);
  }

  countInCategory(id: ToolCategoryId): number {
    return toolsInCategory(id).length;
  }

  related(tool: ResolvedTool, limit?: number): ResolvedTool[] {
    return relatedTools(tool, limit);
  }

  forExtension(ext: string): ResolvedTool[] {
    return toolsForExtension(ext);
  }

  search(query: string): ResolvedTool[] {
    return searchTools(query).map((h) => h.tool);
  }
}
