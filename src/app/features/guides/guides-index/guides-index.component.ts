import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { GuideRegistryService } from '../../../core/services/guide-registry.service';
import { SeoService } from '../../../core/services/seo.service';
import { SITE } from '../../../core/site.config';

@Component({
  selector: 'app-guides-index',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="page ou-container">
      <header class="page__head">
        <nav class="crumbs" aria-label="Breadcrumb">
          <a routerLink="/">Home</a>
          <app-icon name="chevron-right" [size]="13" />
          <span aria-current="page">Guides</span>
        </nav>
        <h1>Guides</h1>
        <p>
          How document formats actually work, what converters can and cannot do, and how to
          handle sensitive files without handing them to anyone.
        </p>
      </header>

      <ul class="cards">
        @for (guide of guides.guides; track guide.slug) {
          <li>
            <a class="card" [routerLink]="guide.path">
              <h2>{{ guide.title }}</h2>
              <p>{{ guide.summary }}</p>
              <span class="card__meta">
                {{ guide.readingMinutes }} min read
                <app-icon name="arrow-right" [size]="14" />
              </span>
            </a>
          </li>
        }
      </ul>
    </div>
  `,
  styleUrl: './guides-index.component.scss',
})
export class GuidesIndexComponent {
  protected readonly guides = inject(GuideRegistryService);
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.apply({
      title: 'Guides',
      description: `How document formats work and what converters can and cannot do — practical guides from ${SITE.name}, covering PDF, Word, Excel and document privacy.`,
      path: '/guides',
      keywords: ['document guides', 'pdf guides', 'how to convert documents', 'file format help'],
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Guides',
          url: `${SITE.origin}/guides`,
          hasPart: this.guides.guides.map((guide) => ({
            '@type': 'Article',
            headline: guide.title,
            url: SITE.origin + guide.path,
            description: guide.summary,
          })),
        },
      ],
    });
  }
}
