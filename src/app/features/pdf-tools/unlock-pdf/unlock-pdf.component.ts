import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolBase } from '../../../shared/tool-base';
import { unlockPdf } from '../../../core/engines/pdf.engine';
import { closePdf, openPdf, PasswordRequiredError } from '../../../core/engines/pdfjs.engine';
import { withSuffix } from '../../../core/utils/file.util';

@Component({
  selector: 'app-unlock-pdf',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    ResultPanelComponent,
    BusyOverlayComponent,
    IconComponent,
  ],
  template: `
    <app-tool-shell toolId="unlock-pdf">
      <div class="tool">
        <app-file-drop-zone
          [accepts]="['.pdf']"
          [compact]="hasFile()"
          title="Drop a protected PDF"
          hint="You will need its password — this tool decrypts, it does not crack."
          icon="unlock"
          (filesChange)="onFiles($event)"
        />

        @if (hasFile()) {
          @if (!encrypted()) {
            <p class="notice">
              <app-icon name="info" [size]="16" />
              <span>
                This PDF is not encrypted — there is nothing to unlock. You can use it as it is.
              </span>
            </p>
          } @else {
            <div class="panel">
              <h2 class="panel__title">Password</h2>
              <p class="panel__hint">
                Enter the password you already know. It is used entirely on this device and is not
                stored anywhere.
              </p>

              <div class="row">
                <label class="ou-field">
                  <span class="ou-label">Password</span>
                  <div class="reveal">
                    <input
                      [type]="showPassword() ? 'text' : 'password'"
                      class="ou-input"
                      autocomplete="off"
                      [value]="password()"
                      (input)="setPassword($event)"
                      (keyup.enter)="unlock()"
                    />
                    <button
                      type="button"
                      class="ou-btn ou-btn--ghost ou-btn--icon"
                      (click)="showPassword.set(!showPassword())"
                      [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
                    >
                      <app-icon [name]="showPassword() ? 'eye-off' : 'eye'" [size]="16" />
                    </button>
                  </div>
                </label>

                <button
                  type="button"
                  class="ou-btn ou-btn--primary"
                  [disabled]="!password() || busy()"
                  (click)="unlock()"
                >
                  <app-icon name="unlock" [size]="16" />
                  Unlock PDF
                </button>
              </div>
            </div>

            <p class="warn">
              <app-icon name="shield" [size]="16" />
              <span>
                Only remove protection from documents you own or are authorised to modify. This tool
                will never attempt to guess or bypass a password you do not have.
              </span>
            </p>
          }
        }

        <app-busy-overlay [active]="busy()" [percent]="percent()" [label]="progressLabel()" />

        @if (errorMessage()) {
          <p class="error">
            <app-icon name="alert-circle" [size]="16" />
            {{ errorMessage() }}
          </p>
        }

        <app-result-panel
          [outputs]="outputs()"
          title="Unlocked PDF ready"
          (reset)="startOver()"
        />
      </div>
    </app-tool-shell>
  `,
  styleUrl: './unlock-pdf.component.scss',
})
export class UnlockPdfComponent extends ToolBase {
  readonly toolId = 'unlock-pdf';

  protected readonly password = signal('');
  protected readonly showPassword = signal(false);
  protected readonly encrypted = signal(true);

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override afterFiles(files: File[]): void {
    if (files[0]) void this.probe(files[0]);
  }

  /** Determines up front whether the file is actually encrypted. */
  private async probe(file: File): Promise<void> {
    try {
      const doc = await openPdf(await file.arrayBuffer());
      await closePdf(doc);
      this.encrypted.set(false);
    } catch (error) {
      this.encrypted.set(error instanceof PasswordRequiredError);
      if (!(error instanceof PasswordRequiredError)) {
        this.errorMessage.set('That file could not be read as a PDF.');
      }
    }
  }

  protected setPassword(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
  }

  protected async unlock(): Promise<void> {
    const file = this.primaryFile();
    if (!file || !this.password()) return;

    const blob = await this.run('Decrypting…', () => unlockPdf(file, this.password()));
    if (blob) this.setOutputs([this.output(withSuffix(file.name, '-unlocked'), blob)]);
  }

  protected startOver(): void {
    this.password.set('');
    this.encrypted.set(true);
    this.reset();
  }
}
