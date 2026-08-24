import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolBase } from '../../../shared/tool-base';
import { readPresentation, type Presentation } from '../../../core/engines/pptx.engine';
import { withExtension } from '../../../core/utils/file.util';

type Format = 'text' | 'markdown' | 'json';

@Component({
  selector: 'app-pptx-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    BusyOverlayComponent,
    CopyButtonComponent,
    IconComponent,
  ],
  template: `
    <app-tool-shell toolId="pptx-extract-text">
      <div class="tool">
        <app-file-drop-zone
          [accepts]="['.pptx']"
          [compact]="!!deck()"
          title="Drop a presentation"
          hint="Titles, bullets, tables and speaker notes, grouped by slide."
          icon="text-select"
          (filesChange)="onFiles($event)"
        />

        @if (deck(); as presentation) {
          <div class="panel">
            <h2 class="panel__title">Output</h2>
            <div class="options">
              <label class="ou-field">
                <span class="ou-label">Format</span>
                <select class="ou-select" [value]="format()" (change)="setFormat($event)">
                  <option value="text">Plain text</option>
                  <option value="markdown">Markdown</option>
                  <option value="json">JSON</option>
                </select>
              </label>
            </div>
            <div class="checks">
              <label class="ou-check">
                <input type="checkbox" [checked]="includeNotes()" (change)="toggleNotes($event)" />
                Include speaker notes
              </label>
              <label class="ou-check">
                <input
                  type="checkbox"
                  [checked]="includeNumbers()"
                  (change)="toggleNumbers($event)"
                />
                Label each slide with its number
              </label>
            </div>
          </div>

          <div class="toolbar">
            <span class="ou-subtle">
              {{ presentation.slides.length }} slides ·
              {{ extracted().length.toLocaleString() }} characters
            </span>
            <span class="ou-spacer"></span>
            <app-copy-button [text]="extracted()" label="Copy" [small]="true" />
            <button type="button" class="ou-btn ou-btn--sm" (click)="download()">
              <app-icon name="download" [size]="14" />
              Download
            </button>
          </div>

          <pre class="preview"><code>{{ extracted().slice(0, 40000) }}</code></pre>

          <div class="actions">
            <button type="button" class="ou-btn" (click)="startOver()">Open another deck</button>
          </div>
        }

        <app-busy-overlay [active]="busy()" [percent]="percent()" [label]="progressLabel()" />

        @if (errorMessage()) {
          <p class="error">
            <app-icon name="alert-circle" [size]="16" />
            {{ errorMessage() }}
          </p>
        }
      </div>
    </app-tool-shell>
  `,
  styleUrl: './pptx-text.component.scss',
})
export class PptxTextComponent extends ToolBase {
  readonly toolId = 'pptx-extract-text';

  protected readonly deck = signal<Presentation | null>(null);
  protected readonly format = signal<Format>('text');
  protected readonly includeNotes = signal(true);
  protected readonly includeNumbers = signal(true);

  protected readonly extracted = computed(() => {
    const deck = this.deck();
    if (!deck) return '';

    if (this.format() === 'json') {
      return JSON.stringify(
        deck.slides.map((slide) => ({
          slide: slide.index + 1,
          title: slide.title,
          text: slide.text,
          ...(this.includeNotes() ? { notes: slide.notes } : {}),
        })),
        null,
        2,
      );
    }

    return deck.slides
      .map((slide) => {
        const parts: string[] = [];
        const heading = this.includeNumbers()
          ? `Slide ${slide.index + 1}${slide.title ? ` — ${slide.title}` : ''}`
          : slide.title;

        if (heading) {
          parts.push(this.format() === 'markdown' ? `## ${heading}` : `${heading}\n${'='.repeat(Math.min(60, heading.length))}`);
        }
        if (slide.text) parts.push(slide.text);
        if (this.includeNotes() && slide.notes) {
          parts.push(
            this.format() === 'markdown'
              ? `> **Notes:** ${slide.notes.replace(/\n/g, '\n> ')}`
              : `Notes: ${slide.notes}`,
          );
        }
        return parts.join('\n\n');
      })
      .filter(Boolean)
      .join('\n\n---\n\n');
  });

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override afterFiles(files: File[]): void {
    const file = files[0];
    if (!file) return;
    void this.run('Reading presentation…', async () => {
      this.deck.set(await readPresentation(file));
    });
  }

  protected setFormat(event: Event): void {
    this.format.set((event.target as HTMLSelectElement).value as Format);
  }

  protected toggleNotes(event: Event): void {
    this.includeNotes.set((event.target as HTMLInputElement).checked);
  }

  protected toggleNumbers(event: Event): void {
    this.includeNumbers.set((event.target as HTMLInputElement).checked);
  }

  protected async download(): Promise<void> {
    const file = this.primaryFile();
    if (!file) return;
    const extension =
      this.format() === 'json' ? '.json' : this.format() === 'markdown' ? '.md' : '.txt';
    await this.downloads.saveText(this.extracted(), withExtension(file.name, extension));
  }

  protected startOver(): void {
    this.deck.set(null);
    this.reset();
  }
}
