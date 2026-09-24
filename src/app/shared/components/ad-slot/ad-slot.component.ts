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
  readonly placement = input.required<string>();

  protected readonly money = inject(MonetizationService);
  private readonly unit = viewChild<ElementRef<HTMLElement>>('unit');

  protected readonly slot = computed(() => this.money.slotFor(this.placement()));

  protected readonly visible = computed(
    () => this.money.adsEnabled && !!this.slot(),
  );

  protected readonly collapsed = signal(false);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const ins = this.unit()?.nativeElement;
      if (!ins) return;
      this.money.fillSlot();

      const observer = new MutationObserver(() => {
        if (ins.getAttribute('data-ad-status') === 'unfilled') {
          this.collapsed.set(true);
          observer.disconnect();
        }
      });
      observer.observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] });

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
