import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ToolCardComponent } from '../../shared/components/tool-card/tool-card.component';
import { ToolRegistryService } from '../../core/services/tool-registry.service';
import { SeoService } from '../../core/services/seo.service';

/** 404 that tries to be useful: it searches the catalog with the bad URL. */
@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, ToolCardComponent],
  template: `
    <div class="page ou-container">
      <div class="wrap">
        <span class="code">404</span>
        <h1>That page does not exist</h1>
        <p>
          The address <code>{{ path }}</code> is not one of our tools. Here is what looks closest.
        </p>

        <div class="actions">
          <a class="ou-btn ou-btn--primary" routerLink="/">
            <app-icon name="home" [size]="15" />
            Go home
          </a>
          <a class="ou-btn" routerLink="/tools">Browse all tools</a>
        </div>
      </div>

      @if (guesses().length) {
        <div class="ou-grid">
          @for (tool of guesses(); track tool.id) {
            <app-tool-card [tool]="tool" [showCategory]="true" />
          }
        </div>
      }
    </div>
  `,
  styleUrl: './not-found.component.scss',
})
export class NotFoundComponent {
  private readonly registry = inject(ToolRegistryService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  protected readonly path = this.router.url;

  protected readonly guesses = computed(() => {
    const terms = this.path.replace(/[^a-z0-9]+/gi, ' ').trim();
    const hits = terms ? this.registry.search(terms) : [];
    return (hits.length ? hits : this.registry.popular()).slice(0, 6);
  });

  constructor() {
    this.seo.apply({
      title: 'Page not found',
      description: 'That page does not exist. Browse the tool catalog instead.',
      path: '/404',
      noIndex: true,
    });
  }
}
