import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { clamp } from '../../../core/utils/file.util';

const STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 6, 8];

/** Zoom stepper shared by the viewers and the diagram canvas. */
@Component({
  selector: 'app-zoom-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="zoom" role="group" aria-label="Zoom">
      <button
        type="button"
        class="ou-btn ou-btn--sm ou-btn--ghost ou-btn--icon"
        (click)="zoomOut()"
        [disabled]="zoom() <= min()"
        aria-label="Zoom out"
        title="Zoom out"
      >
        <app-icon name="zoom-out" [size]="15" />
      </button>

      <button
        type="button"
        class="zoom__value"
        (click)="reset()"
        title="Reset zoom to 100%"
        aria-label="Reset zoom"
      >
        {{ percent() }}%
      </button>

      <button
        type="button"
        class="ou-btn ou-btn--sm ou-btn--ghost ou-btn--icon"
        (click)="zoomIn()"
        [disabled]="zoom() >= max()"
        aria-label="Zoom in"
        title="Zoom in"
      >
        <app-icon name="zoom-in" [size]="15" />
      </button>

      @if (showFit()) {
        <button
          type="button"
          class="ou-btn ou-btn--sm ou-btn--ghost ou-btn--icon"
          (click)="fit.emit()"
          aria-label="Fit to view"
          title="Fit to view"
        >
          <app-icon name="maximize" [size]="15" />
        </button>
      }
    </div>
  `,
  styles: `
    .zoom {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 2px;
      border: 1px solid var(--ou-border);
      border-radius: var(--ou-r-md);
      background: var(--ou-surface);
    }

    .zoom__value {
      min-width: 52px;
      height: 26px;
      padding-inline: var(--ou-s-2);
      border: 0;
      border-radius: var(--ou-r-sm);
      background: transparent;
      font-size: var(--ou-fs-xs);
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--ou-text-muted);
      cursor: pointer;

      &:hover {
        background: var(--ou-surface-3);
        color: var(--ou-text);
      }
    }
  `,
})
export class ZoomControlsComponent {
  readonly zoom = model.required<number>();
  readonly min = input(0.25);
  readonly max = input(8);
  readonly showFit = input(true);

  readonly fit = output<void>();

  protected readonly percent = computed(() => Math.round(this.zoom() * 100));

  protected zoomIn(): void {
    const next = STEPS.find((s) => s > this.zoom() + 0.001) ?? this.max();
    this.zoom.set(clamp(next, this.min(), this.max()));
  }

  protected zoomOut(): void {
    const next = [...STEPS].reverse().find((s) => s < this.zoom() - 0.001) ?? this.min();
    this.zoom.set(clamp(next, this.min(), this.max()));
  }

  protected reset(): void {
    this.zoom.set(clamp(1, this.min(), this.max()));
  }
}
