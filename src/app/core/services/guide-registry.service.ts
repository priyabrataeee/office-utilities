import { Injectable, inject } from '@angular/core';
import { GUIDES } from '../data/guide-catalog';
import type { GuideBlock, ResolvedGuide } from '../models/guide.model';
import { ToolRegistryService } from './tool-registry.service';
import type { ResolvedTool } from '../models/tool.model';

/** Average adult reading speed, used only for a rough "N min read". */
const WORDS_PER_MINUTE = 220;

@Injectable({ providedIn: 'root' })
export class GuideRegistryService {
  private readonly tools = inject(ToolRegistryService);

  readonly guides: readonly ResolvedGuide[] = GUIDES.map((guide) => ({
    ...guide,
    path: `/guides/${guide.slug}`,
    readingMinutes: Math.max(1, Math.round(wordCount(guide.body) / WORDS_PER_MINUTE)),
  }));

  private readonly bySlug = new Map(this.guides.map((g) => [g.slug, g]));

  /** Reverse index, so a tool page can link to the guide that covers it. */
  private readonly byToolId = (() => {
    const map = new Map<string, ResolvedGuide[]>();
    for (const guide of this.guides) {
      for (const toolId of guide.tools) {
        const list = map.get(toolId) ?? [];
        list.push(guide);
        map.set(toolId, list);
      }
    }
    return map;
  })();

  find(slug: string): ResolvedGuide | undefined {
    return this.bySlug.get(slug);
  }

  /** Guides that reference this tool. The first is treated as the primary one. */
  forTool(toolId: string): readonly ResolvedGuide[] {
    return this.byToolId.get(toolId) ?? [];
  }

  /** Resolves a guide's tool ids to real catalog entries, skipping any unknown. */
  toolsOf(guide: ResolvedGuide): readonly ResolvedTool[] {
    return guide.tools
      .map((id) => this.tools.byId(id))
      .filter((tool): tool is ResolvedTool => !!tool);
  }

  /** Other guides worth reading, preferring ones about the same tools. */
  related(guide: ResolvedGuide, limit = 3): readonly ResolvedGuide[] {
    const shares = (other: ResolvedGuide) =>
      other.tools.some((id) => guide.tools.includes(id));

    const overlapping = this.guides.filter((g) => g.slug !== guide.slug && shares(g));
    const rest = this.guides.filter((g) => g.slug !== guide.slug && !shares(g));
    return [...overlapping, ...rest].slice(0, limit);
  }
}

function wordCount(body: readonly GuideBlock[]): number {
  const count = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
  let words = 0;

  // A switch rather than if/else: `GuideList` carries `type: 'ul' | 'ol'`, and
  // TypeScript will not narrow a union-typed discriminant out of an else branch.
  for (const block of body) {
    switch (block.type) {
      case 'ul':
      case 'ol':
        for (const item of block.items) words += count(item);
        break;
      case 'tool':
        words += block.text ? count(block.text) : 0;
        break;
      default:
        words += count(block.text);
    }
  }
  return words;
}
