import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolBase } from '../../../shared/tool-base';
import { protectPdf } from '../../../core/engines/pdf.engine';
import { withSuffix } from '../../../core/utils/file.util';

type PermissionKey =
  | 'printing'
  | 'copying'
  | 'modifying'
  | 'annotating'
  | 'fillingForms'
  | 'contentAccessibility'
  | 'documentAssembly';

interface StrengthReport {
  readonly score: number;
  readonly label: string;
  readonly tone: 'danger' | 'warning' | 'success';
  readonly advice: string;
}

@Component({
  selector: 'app-protect-pdf',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    ResultPanelComponent,
    BusyOverlayComponent,
    IconComponent,
  ],
  templateUrl: './protect-pdf.component.html',
  styleUrl: './protect-pdf.component.scss',
})
export class ProtectPdfComponent extends ToolBase {
  readonly toolId = 'protect-pdf';

  protected readonly userPassword = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly ownerPassword = signal('');
  protected readonly showPassword = signal(false);
  protected readonly useOwnerPassword = signal(false);

  /** Kept as one object so the template can drive it from a list. */
  protected readonly permissions = signal<Record<PermissionKey, boolean>>({
    printing: true,
    copying: false,
    modifying: false,
    annotating: false,
    fillingForms: true,
    contentAccessibility: true,
    documentAssembly: false,
  });

  protected readonly permissionRows: readonly { key: PermissionKey; label: string; hint: string }[] = [
    { key: 'printing', label: 'Printing', hint: 'Print the document at full resolution' },
    { key: 'copying', label: 'Copying text', hint: 'Select and copy content to the clipboard' },
    { key: 'modifying', label: 'Editing', hint: 'Change the content of the document' },
    { key: 'annotating', label: 'Commenting', hint: 'Add notes and highlights' },
    { key: 'fillingForms', label: 'Filling forms', hint: 'Complete interactive form fields' },
    {
      key: 'contentAccessibility',
      label: 'Screen readers',
      hint: 'Allow assistive technology to read the text',
    },
    { key: 'documentAssembly', label: 'Assembling', hint: 'Insert, rotate or delete pages' },
  ];

  protected readonly passwordsMatch = computed(
    () => this.userPassword() === this.confirmPassword(),
  );

  protected readonly canProtect = computed(
    () => this.hasFile() && this.userPassword().length > 0 && this.passwordsMatch(),
  );

  /** Local-only strength hint; nothing is checked against any service. */
  protected readonly strength = computed<StrengthReport | null>(() => {
    const password = this.userPassword();
    if (!password) return null;

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    if (/^(.)\1+$/.test(password)) score = 0;

    if (score <= 2) {
      return {
        score,
        label: 'Weak',
        tone: 'danger',
        advice: 'Short passwords fall quickly to offline guessing. Aim for 12+ characters.',
      };
    }
    if (score <= 4) {
      return {
        score,
        label: 'Reasonable',
        tone: 'warning',
        advice: 'Adding length matters more than adding symbols.',
      };
    }
    return {
      score,
      label: 'Strong',
      tone: 'success',
      advice: 'Store it somewhere safe — this password cannot be recovered.',
    };
  });

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected set(target: 'user' | 'confirm' | 'owner', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (target === 'user') this.userPassword.set(value);
    else if (target === 'confirm') this.confirmPassword.set(value);
    else this.ownerPassword.set(value);
  }

  protected toggleVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  protected toggleOwner(event: Event): void {
    this.useOwnerPassword.set((event.target as HTMLInputElement).checked);
  }

  protected setPermission(key: PermissionKey, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.permissions.update((current) => ({ ...current, [key]: checked }));
  }

  protected async protect(): Promise<void> {
    const file = this.primaryFile();
    if (!file) return;

    const blob = await this.run('Encrypting…', () =>
      protectPdf(file, {
        userPassword: this.userPassword(),
        ownerPassword: this.useOwnerPassword() ? this.ownerPassword() : undefined,
        permissions: this.permissions(),
      }),
    );

    if (blob) {
      this.setOutputs([this.output(withSuffix(file.name, '-protected'), blob)]);
      this.toast.warning(
        'Save your password somewhere safe',
        'There is no recovery — not by us, and not by anyone else.',
      );
    }
  }

  protected startOver(): void {
    this.userPassword.set('');
    this.confirmPassword.set('');
    this.ownerPassword.set('');
    this.reset();
  }
}
