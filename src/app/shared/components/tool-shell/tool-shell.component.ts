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
import { IconComponent } from '../icon/icon.component';
import { ToolCardComponent } from '../tool-card/tool-card.component';
import { ToolRegistryService } from '../../../core/services/tool-registry.service';
import { FavoritesService } from '../../../core/services/favorites.service';
import { RecentService } from '../../../core/services/recent.service';
import { SeoService } from '../../../core/services/seo.service';
import { DownloadService } from '../../../core/services/download.service';
import { ToastService } from '../../../core/services/toast.service';
import { SITE } from '../../../core/site.config';

/**
 * Chrome shared by every tool page: breadcrumbs, header, privacy assurance,
 * FAQ, related tools — plus the SEO metadata and usage tracking. Tools
 * project their own interface into the default slot and stay focused on
 * doing one job.
 */
@Component({
  selector: 'app-tool-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, ToolCardComponent],
  templateUrl: './tool-shell.component.html',
  styleUrl: './tool-shell.component.scss',
})
export class ToolShellComponent {
  private readonly registry = inject(ToolRegistryService);
  private readonly favorites = inject(FavoritesService);
  private readonly recent = inject(RecentService);
  private readonly seo = inject(SeoService);
  private readonly downloads = inject(DownloadService);
  private readonly toast = inject(ToastService);

  /** Catalog id of the tool being rendered. */
  readonly toolId = input.required<string>();
  /** Renders the tool full-bleed (used by the diagram studio and viewers). */
  readonly wide = input(false);
  /** Hides the marketing sections for immersive, app-like tools. */
  readonly minimal = input(false);

  protected readonly tool = computed(() => this.registry.byId(this.toolId()));
  protected readonly related = computed(() => {
    const tool = this.tool();
    return tool ? this.registry.related(tool, 6) : [];
  });
  protected readonly isFavorite = computed(() => {
    this.favorites.ids();
    return this.favorites.isFavorite(this.toolId());
  });

  constructor() {
    effect(() => {
      const tool = this.tool();
      if (!tool) return;
      // The body is a side effect, not a computation: reading service state
      // from inside it would make this effect depend on signals it also
      // writes, which loops.
      untracked(() => {
        this.seo.apply(this.seo.toolSeo(tool));
        this.recent.trackTool(tool.id);
      });
    });
  }

  protected toggleFavorite(): void {
    const now = this.favorites.toggle(this.toolId());
    this.toast.info(now ? 'Added to favourites' : 'Removed from favourites');
  }

  protected async share(): Promise<void> {
    const tool = this.tool();
    if (!tool) return;
    const url = SITE.origin + tool.path;
    if (await this.downloads.shareLink(url, tool.title, tool.summary)) return;
    if (await this.downloads.copyText(url)) this.toast.success('Link copied to clipboard');
  }
}
