import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { ToastService, type ToastKind } from '../../../core/services/toast.service';

const ICON: Record<ToastKind, string> = {
  success: 'check-circle',
  error: 'x-circle',
  warning: 'alert-triangle',
  info: 'info',
};

@Component({
  selector: 'app-toast-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="host ou-no-print" role="status" aria-live="polite">
      @for (toast of toasts(); track toast.id) {
        <div class="toast" [class]="'toast--' + toast.kind">
          <app-icon class="toast__icon" [name]="icon(toast.kind)" [size]="17" />
          <div class="toast__body">
            <span class="toast__message">{{ toast.message }}</span>
            @if (toast.detail) {
              <span class="toast__detail">{{ toast.detail }}</span>
            }
          </div>
          <button
            type="button"
            class="toast__close"
            (click)="dismiss(toast.id)"
            aria-label="Dismiss notification"
          >
            <app-icon name="x" [size]="14" />
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .host {
      position: fixed;
      z-index: 900;
      right: var(--ou-s-4);
      bottom: var(--ou-s-4);
      display: flex;
      flex-direction: column;
      gap: var(--ou-s-2);
      width: min(380px, calc(100vw - var(--ou-s-8)));
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: flex-start;
      gap: var(--ou-s-3);
      padding: var(--ou-s-3) var(--ou-s-3) var(--ou-s-3) var(--ou-s-4);
      border: 1px solid var(--ou-border);
      border-left: 3px solid var(--ou-text-subtle);
      border-radius: var(--ou-r-md);
      background: var(--ou-surface);
      box-shadow: var(--ou-shadow-lg);
      pointer-events: auto;
      animation: ou-rise var(--ou-dur) var(--ou-ease) both;
    }

    .toast--success {
      border-left-color: var(--ou-success);
    }
    .toast--error {
      border-left-color: var(--ou-danger);
    }
    .toast--warning {
      border-left-color: var(--ou-warning);
    }
    .toast--info {
      border-left-color: var(--ou-info);
    }

    .toast__icon {
      margin-top: 1px;
    }
    .toast--success .toast__icon {
      color: var(--ou-success);
    }
    .toast--error .toast__icon {
      color: var(--ou-danger);
    }
    .toast--warning .toast__icon {
      color: var(--ou-warning);
    }
    .toast--info .toast__icon {
      color: var(--ou-info);
    }

    .toast__body {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .toast__message {
      font-size: var(--ou-fs-base);
      font-weight: 540;
    }

    .toast__detail {
      font-size: var(--ou-fs-sm);
      color: var(--ou-text-muted);
      overflow-wrap: anywhere;
    }

    .toast__close {
      flex: none;
      display: grid;
      place-items: center;
      width: 24px;
      height: 24px;
      border: 0;
      border-radius: var(--ou-r-sm);
      background: transparent;
      color: var(--ou-text-subtle);
      cursor: pointer;

      &:hover {
        background: var(--ou-surface-3);
        color: var(--ou-text);
      }
    }

    @media (max-width: 640px) {
      .host {
        left: var(--ou-s-3);
        right: var(--ou-s-3);
        width: auto;
      }
    }
  `,
})
export class ToastHostComponent {
  private readonly service = inject(ToastService);
  protected readonly toasts = this.service.toasts;

  protected icon(kind: ToastKind): string {
    return ICON[kind];
  }

  protected dismiss(id: number): void {
    this.service.dismiss(id);
  }
}
