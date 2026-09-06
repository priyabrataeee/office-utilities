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

/** Fraction of the way through an article the in-article ad aims for. */
const AD_POSITION = 0.4;

/** Below this, an article is too short to interrupt at all. */
const MIN_BLOCKS_FOR_INLINE_AD = 12;

@Component({
  selector: 'app-guide-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, RichTextComponent, AdSlotComponent],
  templateUrl: './guide-page.component.html',
  styleUrl: './guide-page.component.scss',
})
export class GuidePageComponent {
  /** Bound from route data by `withComponentInputBinding()`. */
  readonly slug = input.required<string>();

  private readonly guides = inject(GuideRegistryService);
  private readonly seo = inject(SeoService);
  protected readonly toolRegistry = inject(ToolRegistryService);

  protected readonly guide = computed(() => this.guides.find(this.slug()));
  protected readonly tools = computed(() => {
    const guide = this.guide();
    return guide ? this.guides.toolsOf(guide) : [];
  });
  protected readonly related = computed(() => {
    const guide = this.guide();
    return guide ? this.guides.related(guide) : [];
  });

  /**
   * Index of the body block the in-article advertisement follows.
   *
   * Derived from the article's own structure rather than fixed at block N.
   * Guides differ in how long they take to get going, so a fixed offset lands
   * mid-sentence in one and past the useful part of another. This picks the
   * section break nearest `AD_POSITION`, which puts the unit where the reader
   * is already pausing.
   *
   * Breaks in the opening section are excluded — an ad between the direct
   * answer and the article is the one position guaranteed to annoy — as are
   * breaks near the end, which would stack the inline unit on top of the one
   * below the article. Returns -1 when nothing qualifies, and the guide simply
   * carries no inline ad.
   */
  protected readonly inlineAdAfter = computed(() => {
    const body = this.guide()?.body ?? [];
    if (body.length < MIN_BLOCKS_FOR_INLINE_AD) return -1;

    const ideal = body.length * AD_POSITION;
    const chosen = body
      .flatMap((block, i) => (block.type === 'h2' ? [i] : []))
      .filter((i) => i >= 4 && i <= body.length - 5)
      .reduce((best, i) => (Math.abs(i - ideal) < Math.abs(best - ideal) ? i : best), -1);

    // One block earlier, so the ad precedes the heading rather than orphaning
    // it from the section it introduces.
    return chosen < 0 ? -1 : chosen - 1;
  });

  constructor() {
    effect(() => {
      const guide = this.guide();
      if (!guide) return;
      // Applying SEO is a side effect, not a computation — reading service
      // state inside it would make the effect depend on what it writes.
      untracked(() => this.seo.apply(this.seo.guideSeo(guide)));
    });
  }

  protected toolFor(id: string) {
    return this.toolRegistry.byId(id);
  }
}
