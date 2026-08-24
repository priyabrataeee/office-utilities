import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ToolRegistryService } from '../../core/services/tool-registry.service';
import { SeoService } from '../../core/services/seo.service';
import { SITE } from '../../core/site.config';

@Component({
  selector: 'app-categories',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="page ou-container">
      <header class="page__head">
        <nav class="crumbs" aria-label="Breadcrumb">
          <a routerLink="/">Home</a>
          <app-icon name="chevron-right" [size]="13" />
          <span aria-current="page">Categories</span>
        </nav>
        <h1>Categories</h1>
        <p>
          {{ registry.tools.length }} tools grouped into
          {{ registry.categories.length }} toolkits. Every one of them processes your files locally.
        </p>
      </header>

      <div class="cards">
        @for (category of registry.categories; track category.id) {
          <section class="cat" [style.--accent]="'var(' + category.accentVar + ')'">
            <header class="cat__head">
              <span class="cat__icon"><app-icon [name]="category.icon" [size]="22" /></span>
              <div>
                <h2><a [routerLink]="['/', category.slug]">{{ category.title }}</a></h2>
                <p>{{ category.tagline }}</p>
              </div>
              <span class="ou-badge">{{ registry.countInCategory(category.id) }} tools</span>
            </header>

            <p class="cat__desc">{{ category.description }}</p>

            <ul class="cat__tools">
              @for (tool of registry.inCategory(category.id); track tool.id) {
                <li>
                  <a [routerLink]="tool.path">
                    <app-icon [name]="tool.icon" [size]="14" />
                    {{ tool.title }}
                  </a>
                </li>
              }
            </ul>
          </section>
        }
      </div>
    </div>
  `,
  styleUrl: './categories.component.scss',
})
export class CategoriesComponent {
  protected readonly registry = inject(ToolRegistryService);
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.apply({
      title: 'Tool categories',
      description: `Explore ${SITE.name} by category: PDF tools, Word tools, Excel and CSV tools, PowerPoint tools, file converters, document generators, diagram studio and file utilities.`,
      path: '/categories',
      keywords: ['document tool categories', 'pdf tools', 'excel tools', 'word tools'],
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Tool categories',
          url: `${SITE.origin}/categories`,
          hasPart: this.registry.categories.map((category) => ({
            '@type': 'CollectionPage',
            name: category.title,
            description: category.description,
            url: `${SITE.origin}/${category.slug}`,
          })),
        },
      ],
    });
  }
}
