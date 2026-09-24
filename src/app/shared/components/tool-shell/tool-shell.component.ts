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
import { AdSlotComponent } from '../ad-slot/ad-slot.component';
import { GuideRegistryService } from '../../../core/services/guide-registry.service';
import { ToolRegistryService } from '../../../core/services/tool-registry.service';
import { FavoritesService } from '../../../core/services/favorites.service';
import { RecentService } from '../../../core/services/recent.service';
import { SeoService } from '../../../core/services/seo.service';
import { DownloadService } from '../../../core/services/download.service';
import { ToastService } from '../../../core/services/toast.service';
import { SITE } from '../../../core/site.config';
import { TOOL_CONTENT } from '../../../core/data/tool-content';

@Component({
  selector: 'app-tool-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, ToolCardComponent, AdSlotComponent],
  templateUrl: './tool-shell.component.html',
  styleUrl: './tool-shell.component.scss',
})
export class ToolShellComponent {
  private readonly registry = inject(ToolRegistryService);
  private readonly favorites = inject(FavoritesService);
  private readonly recent = inject(RecentService);
  private readonly seo = inject(SeoService);
  private readonly guideRegistry = inject(GuideRegistryService);
  private readonly downloads = inject(DownloadService);
  private readonly toast = inject(ToastService);

  readonly toolId = input.required<string>();
  readonly wide = input(false);
  readonly minimal = input(false);

  protected readonly tool = computed(() => this.registry.byId(this.toolId()));
  protected readonly related = computed(() => {
    const tool = this.tool();
    return tool ? this.registry.related(tool, 6) : [];
  });
  protected readonly guides = computed(() => this.guideRegistry.forTool(this.toolId()));
  protected readonly content = computed(() => TOOL_CONTENT[this.toolId()]);
  protected readonly isFavorite = computed(() => {
    this.favorites.ids();
    return this.favorites.isFavorite(this.toolId());
  });

  constructor() {
    effect(() => {
      const tool = this.tool();
      if (!tool) return;
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
