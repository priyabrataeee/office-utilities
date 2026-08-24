import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ToolCardComponent } from '../../shared/components/tool-card/tool-card.component';
import { ToolRegistryService } from '../../core/services/tool-registry.service';
import { SeoService } from '../../core/services/seo.service';
import type { ToolCategoryId } from '../../core/models/tool.model';

/**
 * Landing page for one category, e.g. `/pdf`.
 *
 * Bound from route data via `withComponentInputBinding`, so each feature's
 * routes file supplies only its category id.
 */
@Component({
  selector: 'app-category-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, ToolCardComponent],
  template: `
    @let category = current();
    @if (category) {
      <div class="page ou-container" [style.--accent]="'var(' + category.accentVar + ')'">
        <header class="page__head">
          <nav class="crumbs" aria-label="Breadcrumb">
            <a routerLink="/">Home</a>
            <app-icon name="chevron-right" [size]="13" />
            <a routerLink="/categories">Categories</a>
            <app-icon name="chevron-right" [size]="13" />
            <span aria-current="page">{{ category.title }}</span>
          </nav>

          <div class="hero">
            <span class="hero__icon"><app-icon [name]="category.icon" [size]="26" /></span>
            <div>
              <h1>{{ category.title }}</h1>
              <p class="hero__tagline">{{ category.tagline }}</p>
            </div>
          </div>

          <p>{{ category.description }}</p>
        </header>

        <p class="count">{{ tools().length }} tools · all client-side</p>

        <div class="ou-grid">
          @for (tool of tools(); track tool.id) {
            <app-tool-card [tool]="tool" />
          }
        </div>

        <section class="more">
          <h2>Other toolkits</h2>
          <div class="more__links">
            @for (other of others(); track other.id) {
              <a class="chip" [routerLink]="['/', other.slug]" [style.--accent]="'var(' + other.accentVar + ')'">
                <app-icon [name]="other.icon" [size]="14" />
                {{ other.title }}
                <span class="chip__count">{{ registry.countInCategory(other.id) }}</span>
              </a>
            }
          </div>
        </section>
      </div>
    }
  `,
  styleUrl: './category-page.component.scss',
})
export class CategoryPageComponent {
  protected readonly registry = inject(ToolRegistryService);
  private readonly seo = inject(SeoService);

  /** Supplied by route data. */
  readonly categoryId = input.required<ToolCategoryId>();

  protected readonly current = computed(() => this.registry.category(this.categoryId()));
  protected readonly tools = computed(() =>
    this.registry
      .inCategory(this.categoryId())
      .sort((a, b) => Number(!!b.popular) - Number(!!a.popular) || a.title.localeCompare(b.title)),
  );
  protected readonly others = computed(() =>
    this.registry.categories.filter((c) => c.id !== this.categoryId()),
  );

  constructor() {
    effect(() => {
      const category = this.current();
      const count = this.tools().length;
      if (category) untracked(() => this.seo.apply(this.seo.categorySeo(category, count)));
    });
  }
}
