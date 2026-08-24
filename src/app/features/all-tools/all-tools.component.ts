import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ToolCardComponent } from '../../shared/components/tool-card/tool-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ToolRegistryService } from '../../core/services/tool-registry.service';
import { SeoService } from '../../core/services/seo.service';
import { SITE } from '../../core/site.config';
import type { ToolCategoryId } from '../../core/models/tool.model';

type SortKey = 'relevance' | 'name' | 'category' | 'popular';

@Component({
  selector: 'app-all-tools',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, ToolCardComponent, EmptyStateComponent],
  templateUrl: './all-tools.component.html',
  styleUrl: './all-tools.component.scss',
})
export class AllToolsComponent {
  protected readonly registry = inject(ToolRegistryService);
  private readonly seo = inject(SeoService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly params = toSignal(this.route.queryParamMap, { initialValue: null });

  protected readonly query = signal('');
  protected readonly activeCategory = signal<ToolCategoryId | 'all'>('all');
  protected readonly sort = signal<SortKey>('popular');

  protected readonly results = computed(() => {
    const query = this.query().trim();
    const category = this.activeCategory();

    let tools = query
      ? this.registry.search(query)
      : [...this.registry.tools];

    if (category !== 'all') {
      tools = tools.filter((t) => t.category === category || t.alsoIn?.includes(category));
    }

    if (query && this.sort() === 'relevance') return tools;

    return [...tools].sort((a, b) => {
      switch (this.sort()) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'category':
          return (
            a.categoryRef.title.localeCompare(b.categoryRef.title) ||
            a.title.localeCompare(b.title)
          );
        default:
          return Number(!!b.popular) - Number(!!a.popular) || a.title.localeCompare(b.title);
      }
    });
  });

  constructor() {
    const initial = this.params()?.get('q');
    if (initial) {
      this.query.set(initial);
      this.sort.set('relevance');
    }

    this.seo.apply({
      title: `All ${this.registry.tools.length} tools`,
      description: `Browse every ${SITE.name} tool: PDF editing, Word, Excel and PowerPoint conversion, document generators, diagram tools and file utilities — all running privately in your browser.`,
      path: '/tools',
      keywords: ['all tools', 'office tools list', 'free document tools'],
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: `${SITE.name} tools`,
          numberOfItems: this.registry.tools.length,
          itemListElement: this.registry.tools.map((tool, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: tool.title,
            url: SITE.origin + tool.path,
          })),
        },
      ],
    });
  }

  protected onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    if (value && this.sort() === 'popular') this.sort.set('relevance');
    void this.router.navigate([], {
      queryParams: { q: value || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected setCategory(id: ToolCategoryId | 'all'): void {
    this.activeCategory.set(id);
  }

  protected setSort(event: Event): void {
    this.sort.set((event.target as HTMLSelectElement).value as SortKey);
  }

  protected reset(): void {
    this.query.set('');
    this.activeCategory.set('all');
    this.sort.set('popular');
    void this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }
}
