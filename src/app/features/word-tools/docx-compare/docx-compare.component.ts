import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolBase } from '../../../shared/tool-base';
import { diffTexts, readDocx, type DiffSummary } from '../../../core/engines/docx.engine';
import { extensionOf, readAsText } from '../../../core/utils/file.util';

@Component({
  selector: 'app-docx-compare',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    BusyOverlayComponent,
    CopyButtonComponent,
    IconComponent,
  ],
  templateUrl: './docx-compare.component.html',
  styleUrl: './docx-compare.component.scss',
})
export class DocxCompareComponent extends ToolBase {
  readonly toolId = 'compare-docx';

  protected readonly leftName = signal('');
  protected readonly rightName = signal('');
  private readonly leftText = signal('');
  private readonly rightText = signal('');

  protected readonly view = signal<'inline' | 'side'>('inline');
  protected readonly hideUnchanged = signal(false);

  protected readonly diff = signal<DiffSummary | null>(null);
  protected readonly ready = computed(() => !!this.leftText() && !!this.rightText());

  protected readonly visibleLines = computed(() => {
    const summary = this.diff();
    if (!summary) return [];
    return this.hideUnchanged()
      ? summary.lines.filter((line) => line.op !== 'equal')
      : summary.lines;
  });

  protected readonly patchText = computed(() => {
    const summary = this.diff();
    if (!summary) return '';
    return summary.lines
      .map((line) => {
        if (line.op === 'equal') return `  ${line.left}`;
        if (line.op === 'insert') return `+ ${line.right}`;
        return line.right ? `- ${line.left}\n+ ${line.right}` : `- ${line.left}`;
      })
      .join('\n');
  });

  constructor() {
    super();
  }

  protected async onSide(side: 'left' | 'right', files: File[]): Promise<void> {
    const file = files[0];
    if (!file) return;

    await this.run('Reading document…', async () => {
      const text =
        extensionOf(file.name) === '.docx'
          ? (await readDocx(file)).text
          : await readAsText(file);

      if (side === 'left') {
        this.leftName.set(file.name);
        this.leftText.set(text);
      } else {
        this.rightName.set(file.name);
        this.rightText.set(text);
      }

      void this.recentFiles.trackFile(file, this.toolId);
      if (this.ready()) this.compare();
    });
  }

  protected compare(): void {
    this.diff.set(diffTexts(this.leftText(), this.rightText()));
  }

  protected setView(view: 'inline' | 'side'): void {
    this.view.set(view);
  }

  protected toggleUnchanged(event: Event): void {
    this.hideUnchanged.set((event.target as HTMLInputElement).checked);
  }

  protected swap(): void {
    const [leftName, rightName] = [this.leftName(), this.rightName()];
    const [leftText, rightText] = [this.leftText(), this.rightText()];
    this.leftName.set(rightName);
    this.rightName.set(leftName);
    this.leftText.set(rightText);
    this.rightText.set(leftText);
    if (this.ready()) this.compare();
  }

  protected startOver(): void {
    this.leftName.set('');
    this.rightName.set('');
    this.leftText.set('');
    this.rightText.set('');
    this.diff.set(null);
    this.reset();
  }
}
