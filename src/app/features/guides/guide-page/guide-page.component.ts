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
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { RichTextComponent } from '../../../shared/components/rich-text/rich-text.component';
import { AdSlotComponent } from '../../../shared/components/ad-slot/ad-slot.component';
import { GuideRegistryService } from '../../../core/services/guide-registry.service';
import { ToolRegistryService } from '../../../core/services/tool-registry.service';
import { SeoService } from '../../../core/services/seo.service';
import { SITE } from '../../../core/site.config';

const AD_POSITION = 0.4;

const MIN_BLOCKS_FOR_INLINE_AD = 12;

@Component({
  selector: 'app-guide-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, RichTextComponent, AdSlotComponent],
  templateUrl: './guide-page.component.html',
  styleUrl: './guide-page.component.scss',
})
export class GuidePageComponent {
  readonly slug = input.required<string>();

  private readonly guides = inject(GuideRegistryService);
  private readonly seo = inject(SeoService);
  protected readonly toolRegistry = inject(ToolRegistryService);

  protected readonly author = SITE.author;
  protected readonly guide = computed(() => this.guides.find(this.slug()));
  protected readonly tools = computed(() => {
    const guide = this.guide();
    return guide ? this.guides.toolsOf(guide) : [];
  });
  protected readonly related = computed(() => {
    const guide = this.guide();
    return guide ? this.guides.related(guide) : [];
  });

  protected readonly inlineAdAfter = computed(() => {
    const body = this.guide()?.body ?? [];
    if (body.length < MIN_BLOCKS_FOR_INLINE_AD) return -1;

    const ideal = body.length * AD_POSITION;
    const chosen = body
      .flatMap((block, i) => (block.type === 'h2' ? [i] : []))
      .filter((i) => i >= 4 && i <= body.length - 5)
      .reduce((best, i) => (Math.abs(i - ideal) < Math.abs(best - ideal) ? i : best), -1);

    return chosen < 0 ? -1 : chosen - 1;
  });

  constructor() {
    effect(() => {
      const guide = this.guide();
      if (!guide) return;
      untracked(() => this.seo.apply(this.seo.guideSeo(guide)));
    });
  }

  protected toolFor(id: string) {
    return this.toolRegistry.byId(id);
  }
}
