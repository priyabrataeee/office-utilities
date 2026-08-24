import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon/icon.component';
import { FavoritesService } from '../../../core/services/favorites.service';
import type { ResolvedTool } from '../../../core/models/tool.model';

/** Link card used in every listing: home, category pages, search, favourites. */
@Component({
  selector: 'app-tool-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    @let t = tool();
    <a class="card" [class.card--compact]="compact()" [routerLink]="t.path">
      <span class="card__icon" [style.--accent]="'var(' + t.categoryRef.accentVar + ')'">
        <app-icon [name]="t.icon" [size]="compact() ? 16 : 20" />
      </span>

      <span class="card__body">
        <span class="card__title">
          {{ t.title }}
          @if (t.badge) {
            <span class="ou-badge ou-badge--accent">{{ t.badge }}</span>
          }
        </span>
        <span class="card__summary">{{ t.summary }}</span>
        @if (showCategory()) {
          <span class="card__category">{{ t.categoryRef.title }}</span>
        }
      </span>

      @if (isFavorite()) {
        <span class="card__fav" title="Favourite"><app-icon name="star" [size]="13" /></span>
      }
    </a>
  `,
  styleUrl: './tool-card.component.scss',
})
export class ToolCardComponent {
  private readonly favorites = inject(FavoritesService);

  readonly tool = input.required<ResolvedTool>();
  readonly compact = input(false);
  readonly showCategory = input(false);

  protected readonly isFavorite = computed(() => {
    this.favorites.ids();
    return this.favorites.isFavorite(this.tool().id);
  });
}
