import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/** Neutral placeholder for "nothing here yet" and "no results" states. */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="empty">
      <span class="empty__icon"><app-icon [name]="icon()" [size]="26" /></span>
      <h3 class="empty__title">{{ title() }}</h3>
      @if (message()) {
        <p class="empty__message">{{ message() }}</p>
      }
      <ng-content />
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--ou-s-2);
      padding: var(--ou-s-12) var(--ou-s-5);
      text-align: center;
      border: 1px dashed var(--ou-border-strong);
      border-radius: var(--ou-r-lg);
      background: var(--ou-surface);
    }

    .empty__icon {
      display: grid;
      place-items: center;
      width: 52px;
      height: 52px;
      margin-bottom: var(--ou-s-2);
      border-radius: var(--ou-r-lg);
      background: var(--ou-surface-3);
      color: var(--ou-text-subtle);
    }

    .empty__title {
      font-size: var(--ou-fs-md);
    }

    .empty__message {
      max-width: 46ch;
      color: var(--ou-text-muted);
      font-size: var(--ou-fs-sm);
    }
  `,
})
export class EmptyStateComponent {
  readonly icon = input('folder-open');
  readonly title = input('Nothing here yet');
  readonly message = input('');
}
