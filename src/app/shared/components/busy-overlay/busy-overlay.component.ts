import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Inline progress indicator shown while a tool is working.
 *
 * Determinate whenever the operation can report progress (per page, per file),
 * indeterminate otherwise — never a spinner with no context.
 */
@Component({
  selector: 'app-busy-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (active()) {
      <div class="busy" role="status" aria-live="polite">
        <div class="busy__row">
          <span class="busy__label">{{ label() || 'Working…' }}</span>
          @if (percent() !== null) {
            <span class="busy__pct">{{ percent() }}%</span>
          }
        </div>
        <div
          class="busy__track"
          role="progressbar"
          [attr.aria-valuenow]="percent()"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div
            class="busy__bar"
            [class.busy__bar--indeterminate]="percent() === null"
            [style.width.%]="percent() ?? 100"
          ></div>
        </div>
        @if (note()) {
          <p class="busy__note">{{ note() }}</p>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .busy {
      padding: var(--ou-s-4);
      border: 1px solid var(--ou-accent-border);
      border-radius: var(--ou-r-lg);
      background: var(--ou-accent-soft);
    }

    .busy__row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--ou-s-3);
      margin-bottom: var(--ou-s-2);
    }

    .busy__label {
      font-size: var(--ou-fs-base);
      font-weight: 560;
      color: var(--ou-accent-text);
    }

    .busy__pct {
      font-size: var(--ou-fs-sm);
      color: var(--ou-accent-text);
      font-variant-numeric: tabular-nums;
    }

    .busy__track {
      height: 6px;
      border-radius: var(--ou-r-full);
      background: color-mix(in srgb, var(--ou-accent) 18%, transparent);
      overflow: hidden;
    }

    .busy__bar {
      height: 100%;
      border-radius: inherit;
      background: var(--ou-accent);
      transition: width var(--ou-dur) var(--ou-ease);
    }

    .busy__bar--indeterminate {
      width: 40% !important;
      animation: slide 1.1s var(--ou-ease) infinite;
    }

    @keyframes slide {
      0% {
        transform: translateX(-100%);
      }
      100% {
        transform: translateX(250%);
      }
    }

    .busy__note {
      margin-top: var(--ou-s-2);
      font-size: var(--ou-fs-sm);
      color: var(--ou-text-muted);
    }

    @media (prefers-reduced-motion: reduce) {
      .busy__bar--indeterminate {
        animation: none;
        width: 100% !important;
        opacity: 0.6;
      }
    }
  `,
})
export class BusyOverlayComponent {
  readonly active = input(false);
  /** 0–100, or null for indeterminate work. */
  readonly percent = input<number | null>(null);
  readonly label = input('');
  readonly note = input('');
}
