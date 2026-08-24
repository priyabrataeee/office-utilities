import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolBase } from '../../../shared/tool-base';
import { baseNameOf, extensionOf } from '../../../core/utils/file.util';

type CaseMode = 'none' | 'lower' | 'upper' | 'title' | 'kebab' | 'snake';

interface Rename {
  readonly file: File;
  readonly from: string;
  readonly to: string;
  readonly changed: boolean;
  readonly collision: boolean;
}

/** Batch rename with a live preview and a ZIP of the renamed set. */
@Component({
  selector: 'app-batch-rename',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    ResultPanelComponent,
    BusyOverlayComponent,
    IconComponent,
  ],
  templateUrl: './batch-rename.component.html',
  styleUrl: './batch-rename.component.scss',
})
export class BatchRenameComponent extends ToolBase {
  readonly toolId = 'batch-rename';

  protected readonly find = signal('');
  protected readonly replace = signal('');
  protected readonly useRegex = signal(false);
  protected readonly prefix = signal('');
  protected readonly suffix = signal('');
  protected readonly caseMode = signal<CaseMode>('none');
  protected readonly numbering = signal(false);
  protected readonly startAt = signal(1);
  protected readonly padding = signal(3);
  protected readonly numberPosition = signal<'prefix' | 'suffix'>('prefix');
  protected readonly datePrefix = signal(false);
  protected readonly newExtension = signal('');
  protected readonly regexError = signal('');

  protected readonly renames = computed<Rename[]>(() => {
    const files = this.files();
    if (!files.length) return [];

    const seen = new Map<string, number>();
    const out: Rename[] = [];

    files.forEach((file, index) => {
      let stem = baseNameOf(file.name);
      const originalExtension = extensionOf(file.name);

      // find & replace
      const needle = this.find();
      if (needle) {
        try {
          if (this.useRegex()) {
            stem = stem.replace(new RegExp(needle, 'g'), this.replace());
          } else {
            stem = stem.split(needle).join(this.replace());
          }
        } catch {
          /* an invalid pattern is reported separately, not applied */
        }
      }

      switch (this.caseMode()) {
        case 'lower':
          stem = stem.toLowerCase();
          break;
        case 'upper':
          stem = stem.toUpperCase();
          break;
        case 'title':
          stem = stem.replace(/\w\S*/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase());
          break;
        case 'kebab':
          stem = stem.trim().replace(/[\s_]+/g, '-').toLowerCase();
          break;
        case 'snake':
          stem = stem.trim().replace(/[\s-]+/g, '_').toLowerCase();
          break;
      }

      if (this.datePrefix()) {
        const date = new Date(file.lastModified);
        const stamp = [
          date.getFullYear(),
          String(date.getMonth() + 1).padStart(2, '0'),
          String(date.getDate()).padStart(2, '0'),
        ].join('-');
        stem = `${stamp} ${stem}`;
      }

      if (this.numbering()) {
        const number = String(this.startAt() + index).padStart(Math.max(1, this.padding()), '0');
        stem = this.numberPosition() === 'prefix' ? `${number} ${stem}` : `${stem} ${number}`;
      }

      stem = `${this.prefix()}${stem}${this.suffix()}`.trim();
      if (!stem) stem = `file-${index + 1}`;

      const extension = this.newExtension()
        ? this.newExtension().startsWith('.')
          ? this.newExtension()
          : `.${this.newExtension()}`
        : originalExtension;

      let candidate = `${stem}${extension}`;
      const key = candidate.toLowerCase();
      const count = seen.get(key) ?? 0;
      seen.set(key, count + 1);
      const collision = count > 0;
      if (collision) candidate = `${stem} (${count + 1})${extension}`;

      out.push({
        file,
        from: file.name,
        to: candidate,
        changed: candidate !== file.name,
        collision,
      });
    });

    return out;
  });

  protected readonly changedCount = computed(
    () => this.renames().filter((entry) => entry.changed).length,
  );
  protected readonly collisionCount = computed(
    () => this.renames().filter((entry) => entry.collision).length,
  );

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected setText(
    name: 'find' | 'replace' | 'prefix' | 'suffix' | 'newExtension',
    event: Event,
  ): void {
    this[name].set((event.target as HTMLInputElement).value);
    if (name === 'find') this.validateRegex();
  }

  protected setNumber(name: 'startAt' | 'padding', event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this[name].set(Number.isFinite(value) ? value : 1);
  }

  protected toggle(name: 'useRegex' | 'numbering' | 'datePrefix', event: Event): void {
    this[name].set((event.target as HTMLInputElement).checked);
    if (name === 'useRegex') this.validateRegex();
  }

  protected setCaseMode(event: Event): void {
    this.caseMode.set((event.target as HTMLSelectElement).value as CaseMode);
  }

  protected setNumberPosition(event: Event): void {
    this.numberPosition.set((event.target as HTMLSelectElement).value as 'prefix' | 'suffix');
  }

  private validateRegex(): void {
    if (!this.useRegex() || !this.find()) {
      this.regexError.set('');
      return;
    }
    try {
      new RegExp(this.find());
      this.regexError.set('');
    } catch (error) {
      this.regexError.set(error instanceof Error ? error.message : 'Invalid pattern');
    }
  }

  protected async download(): Promise<void> {
    const renames = this.renames();
    if (!renames.length) return;

    const outputs = renames.map((entry) => this.output(entry.to, entry.file));
    this.setOutputs(outputs);
    await this.downloads.saveZip(outputs, 'renamed-files.zip');
  }

  protected startOver(): void {
    this.find.set('');
    this.replace.set('');
    this.prefix.set('');
    this.suffix.set('');
    this.newExtension.set('');
    this.caseMode.set('none');
    this.numbering.set(false);
    this.datePrefix.set(false);
    this.reset();
  }
}
