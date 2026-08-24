import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolBase } from '../../../shared/tool-base';
import { analyseText, readDocx } from '../../../core/engines/docx.engine';
import { extensionOf, readAsText } from '../../../core/utils/file.util';

@Component({
  selector: 'app-word-count',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    BusyOverlayComponent,
    CopyButtonComponent,
    IconComponent,
  ],
  templateUrl: './word-count.component.html',
  styleUrl: './word-count.component.scss',
})
export class WordCountComponent extends ToolBase {
  readonly toolId = 'word-count';

  protected readonly text = signal('');
  protected readonly stats = computed(() => analyseText(this.text()));
  protected readonly hasText = computed(() => this.text().trim().length > 0);

  protected readonly readingTime = computed(() => formatDuration(this.stats().readingMinutes));
  protected readonly speakingTime = computed(() => formatDuration(this.stats().speakingMinutes));

  protected readonly summaryText = computed(() => {
    const s = this.stats();
    return [
      `Words: ${s.words}`,
      `Characters: ${s.characters}`,
      `Characters (no spaces): ${s.charactersNoSpaces}`,
      `Sentences: ${s.sentences}`,
      `Paragraphs: ${s.paragraphs}`,
      `Unique words: ${s.uniqueWords}`,
      `Average word length: ${s.averageWordLength.toFixed(1)}`,
      `Average sentence length: ${s.averageSentenceLength.toFixed(1)} words`,
      `Reading time: ${this.readingTime()}`,
      `Speaking time: ${this.speakingTime()}`,
      `Estimated pages: ${s.estimatedPages.toFixed(1)}`,
    ].join('\n');
  });

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override afterFiles(files: File[]): void {
    const file = files[0];
    if (!file) return;

    void this.run('Reading document…', async () => {
      if (extensionOf(file.name) === '.docx') {
        const content = await readDocx(file);
        this.text.set(content.text);
      } else {
        this.text.set(await readAsText(file));
      }
    });
  }

  protected onInput(event: Event): void {
    this.text.set((event.target as HTMLTextAreaElement).value);
  }

  protected clear(): void {
    this.text.set('');
    this.reset();
  }
}

function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0 sec';
  if (minutes < 1) return `${Math.max(1, Math.round(minutes * 60))} sec`;
  if (minutes < 60) {
    const whole = Math.floor(minutes);
    const seconds = Math.round((minutes - whole) * 60);
    return seconds ? `${whole} min ${seconds} sec` : `${whole} min`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours} hr ${Math.round(minutes % 60)} min`;
}
