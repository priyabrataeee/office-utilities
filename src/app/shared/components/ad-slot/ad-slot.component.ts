import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
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
 * Renders absolutely nothing unless ads are enabled *and* the placement has a
 * configured unit id, so an unconfigured page stays clean instead of showing an
 * empty grey box.
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
  host: { ngSkipHydration: 'true', class: 'ou-no-print', '[class.is-collapsed]': 'collapsed()' },
  template: `
    @if (visible()) {
      <aside class="ad" [attr.aria-label]="'Advertisement'">
        <span class="ad__label">Advertisement</span>
        <ins
          #unit
          class="adsbygoogle ad__unit"
          style="display:block"
          [attr.data-ad-client]="money.adClient"
          [attr.data-ad-slot]="slot()"
          data-ad-format="auto"
          data-full-width-responsive="false"
        ></ins>
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

  protected readonly visible = computed(
    () => this.money.adsEnabled && !!this.slot(),
  );

  /**
   * True when the slot will never show an ad. A labelled, bordered, empty box is
   * worse than nothing: it reads as broken, and an unfilled frame on a thin page
   * is exactly what an AdSense reviewer notices.
   */
  protected readonly collapsed = signal(false);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // Must run after the <ins> exists — AdSense fills the last one it finds in
    // the DOM, so pushing before render would target the wrong element.
    afterNextRender(() => {
      const ins = this.unit()?.nativeElement;
      if (!ins) return;
      this.money.fillSlot();

      // AdSense marks a slot it could not fill with data-ad-status="unfilled".
      const observer = new MutationObserver(() => {
        if (ins.getAttribute('data-ad-status') === 'unfilled') {
          this.collapsed.set(true);
          observer.disconnect();
        }
      });
      observer.observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] });

      // A blocked or failed loader never processes the slot at all, so it never
      // gets data-adsbygoogle-status. The wait is generous on purpose: collapsing
      // a slot that was merely slow would stop it being filled.
      const timer = setTimeout(() => {
        if (!ins.hasAttribute('data-adsbygoogle-status')) this.collapsed.set(true);
      }, 8000);

      this.destroyRef.onDestroy(() => {
        observer.disconnect();
        clearTimeout(timer);
      });
    });
  }
}
