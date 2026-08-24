import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { DownloadService } from '../../../core/services/download.service';

/** Copy-to-clipboard button that confirms in place rather than via a toast. */
@Component({
  selector: 'app-copy-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <button
      type="button"
      class="ou-btn"
      [class.ou-btn--sm]="small()"
      [class.ou-btn--icon]="!label()"
      [class.is-done]="copied()"
      (click)="copy()"
      [attr.aria-label]="label() || 'Copy to clipboard'"
      [title]="label() || 'Copy to clipboard'"
    >
      <app-icon [name]="copied() ? 'check' : 'copy'" [size]="small() ? 14 : 16" />
      @if (label()) {
        <span>{{ copied() ? 'Copied' : label() }}</span>
      }
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .is-done {
      color: var(--ou-success);
      border-color: var(--ou-success);
    }
  `,
})
export class CopyButtonComponent {
  private readonly downloads = inject(DownloadService);

  readonly text = input<string>('');
  readonly label = input<string>('');
  readonly small = input(false);

  protected readonly copied = signal(false);

  protected async copy(): Promise<void> {
    const ok = await this.downloads.copyText(this.text());
    if (!ok) return;
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1800);
  }
}
