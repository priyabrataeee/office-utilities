import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ToolCardComponent } from '../../shared/components/tool-card/tool-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ToolRegistryService } from '../../core/services/tool-registry.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-favorites',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, ToolCardComponent, EmptyStateComponent],
  template: `
    <div class="page ou-container">
      <header class="page__head">
        <nav class="crumbs" aria-label="Breadcrumb">
          <a routerLink="/">Home</a>
          <app-icon name="chevron-right" [size]="13" />
          <span aria-current="page">Favourites</span>
        </nav>
        <h1>Favourites</h1>
        <p>
          Tools you starred, kept in this browser's local storage. They are never synced anywhere.
        </p>
      </header>

      @if (registry.favoriteTools().length) {
        <div class="bar">
          <p class="count">{{ registry.favoriteTools().length }} saved</p>
          <button type="button" class="ou-btn ou-btn--sm ou-btn--danger" (click)="clear()">
            <app-icon name="trash" [size]="14" />
            Clear favourites
          </button>
        </div>

        <div class="ou-grid">
          @for (tool of registry.favoriteTools(); track tool.id) {
            <app-tool-card [tool]="tool" [showCategory]="true" />
          }
        </div>
      } @else {
        <app-empty-state
          icon="star"
          title="No favourites yet"
          message="Star a tool from its page and it will appear here for one-click access."
        >
          <a class="ou-btn ou-btn--primary" routerLink="/tools">Browse all tools</a>
        </app-empty-state>
      }
    </div>
  `,
  styleUrl: './favorites.component.scss',
})
export class FavoritesComponent {
  protected readonly registry = inject(ToolRegistryService);
  private readonly favorites = inject(FavoritesService);
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.apply({
      title: 'Your favourite tools',
      description:
        'The tools you starred, stored locally in your browser for quick access. Nothing is synced to a server.',
      path: '/favorites',
      noIndex: true,
    });
  }

  protected clear(): void {
    this.favorites.clear();
  }
}
