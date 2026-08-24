import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ShortcutService, type Shortcut } from '../../core/services/shortcut.service';

/** Lists whatever shortcuts are registered right now, grouped by area. */
@Component({
  selector: 'app-shortcut-help',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    @if (service.helpOpen()) {
      <div class="scrim ou-no-print" (click)="service.helpOpen.set(false)">
        <div
          class="sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
          (click)="$event.stopPropagation()"
        >
          <header class="sheet__head">
            <h2>Keyboard shortcuts</h2>
            <button
              type="button"
              class="ou-btn ou-btn--ghost ou-btn--sm ou-btn--icon"
              (click)="service.helpOpen.set(false)"
              aria-label="Close"
            >
              <app-icon name="x" [size]="16" />
            </button>
          </header>

          <div class="sheet__body">
            @for (group of groups(); track group.name) {
              <section>
                <h3>{{ group.name }}</h3>
                <ul>
                  @for (item of group.items; track item.keys) {
                    <li>
                      <span>{{ item.label }}</span>
                      <span class="keys">
                        @for (key of service.display(item.keys); track $index) {
                          <kbd>{{ key }}</kbd>
                        }
                      </span>
                    </li>
                  }
                </ul>
              </section>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .scrim {
      position: fixed;
      inset: 0;
      z-index: 850;
      display: grid;
      place-items: center;
      padding: var(--ou-s-4);
      background: var(--ou-overlay);
      backdrop-filter: blur(3px);
      animation: ou-fade-in var(--ou-dur-fast) var(--ou-ease) both;
    }

    .sheet {
      width: min(560px, 100%);
      max-height: 82dvh;
      display: flex;
      flex-direction: column;
      border: 1px solid var(--ou-border);
      border-radius: var(--ou-r-xl);
      background: var(--ou-surface);
      box-shadow: var(--ou-shadow-xl);
      overflow: hidden;
      animation: ou-rise var(--ou-dur) var(--ou-ease) both;
    }

    .sheet__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--ou-s-4);
      border-bottom: 1px solid var(--ou-border);

      h2 {
        font-size: var(--ou-fs-md);
      }
    }

    .sheet__body {
      overflow-y: auto;
      padding: var(--ou-s-4);
      display: flex;
      flex-direction: column;
      gap: var(--ou-s-5);
    }

    h3 {
      font-size: var(--ou-fs-xs);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--ou-text-subtle);
      margin-bottom: var(--ou-s-2);
    }

    ul {
      list-style: none;
      padding: 0;
      display: flex;
      flex-direction: column;
    }

    li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--ou-s-4);
      padding: var(--ou-s-2) 0;
      border-bottom: 1px solid var(--ou-border);
      font-size: var(--ou-fs-sm);

      &:last-child {
        border-bottom: 0;
      }
    }

    .keys {
      display: inline-flex;
      gap: 4px;
      flex: none;
    }
  `,
})
export class ShortcutHelpComponent {
  protected readonly service = inject(ShortcutService);

  protected readonly groups = computed(() => {
    const byGroup = new Map<string, Shortcut[]>();
    for (const shortcut of this.service.registered()) {
      const list = byGroup.get(shortcut.group) ?? [];
      list.push(shortcut);
      byGroup.set(shortcut.group, list);
    }
    return [...byGroup.entries()].map(([name, items]) => ({ name, items }));
  });
}
