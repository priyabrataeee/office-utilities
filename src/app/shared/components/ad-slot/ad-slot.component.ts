import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { MonetizationService } from '../../../core/services/monetization.service';

/**
 * One advertising placement.
 *
 * `ngSkipHydration` is essential rather than decorative: the ad script replaces
 * the contents of its container, and Angular would otherwise compare that
 * against the prerendered markup and report a hydration mismatch.
 *
 * Renders absolutely nothing unless a provider is enabled *and* the placement
 * has been configured, so an unconfigured page stays clean instead of showing
 * an empty grey box.
 *
 * `data-full-width-responsive` is off deliberately. With it on, AdSense sets a
 * negative margin and a viewport-width on the unit so the ad bleeds to both
 * screen edges — which on a narrow screen leaves it hanging outside the bordered
 * card that labels it as an advertisement. Slightly wider mobile ads are not
 * worth an ad that appears to have escaped its own frame on a site whose pitch
 * is that it is not one of the untrustworthy ones.
 */
@Component({
  selector: 'app-ad-slot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { ngSkipHydration: 'true', class: 'ou-no-print' },
  template: `
    @if (visible()) {
      <aside class="ad" [attr.aria-label]="'Advertisement'">
        <span class="ad__label">Advertisement</span>
        @if (adsense()) {
          <ins
            #unit
            class="adsbygoogle ad__unit"
            style="display:block"
            [attr.data-ad-client]="money.adClient"
            [attr.data-ad-slot]="slot()"
            data-ad-format="auto"
            data-full-width-responsive="false"
          ></ins>
        } @else {
          <div
            class="ad__unit"
            data-ea-publisher="placeholder"
            [attr.data-ea-type]="'text'"
          ></div>
        }
      </aside>
    }
  `,
  styleUrl: './ad-slot.component.scss',
})
export class AdSlotComponent {
  /** Key into the configured slot map, e.g. `toolFooter`. */
  readonly placement = input.required<string>();

  protected readonly money = inject(MonetizationService);
  private readonly unit = viewChild<ElementRef<HTMLElement>>('unit');

  protected readonly slot = computed(() => this.money.slotFor(this.placement()));

  /** AdSense wins when both are somehow enabled; only one may fill a slot. */
  protected readonly adsense = computed(() => this.money.adsEnabled);

  protected readonly visible = computed(
    () =>
      (this.money.adsEnabled && !!this.slot()) || this.money.ethicalAdsEnabled,
  );

  constructor() {
    // Must run after the <ins> exists — AdSense fills the last one it finds in
    // the DOM, so pushing before render would target the wrong element.
    afterNextRender(() => {
      if (this.unit()) this.money.fillSlot();
    });
  }
}
