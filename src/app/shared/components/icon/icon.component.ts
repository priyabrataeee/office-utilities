import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ICONS } from './icon.data';

/**
 * Renders one icon from the registry.
 *
 * Unknown names render nothing rather than throwing — a missing glyph should
 * never take a tool page down.
 */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      [attr.stroke-width]="strokeWidth()"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      [attr.aria-hidden]="label() ? null : 'true'"
      [attr.role]="label() ? 'img' : null"
      [attr.aria-label]="label() || null"
    >
      @for (d of paths(); track $index) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
      line-height: 0;
    }
  `,
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly size = input<number>(18);
  readonly strokeWidth = input<number>(1.7);
  /** Supply when the icon is the only label, e.g. on an icon-only button. */
  readonly label = input<string>('');

  protected readonly paths = computed(() => ICONS[this.name()] ?? []);
}
