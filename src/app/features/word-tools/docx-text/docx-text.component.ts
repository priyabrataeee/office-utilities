import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolBase } from '../../../shared/tool-base';
import { extractDocxExtras, readDocx, type DocxExtraText } from '../../../core/engines/docx.engine';
import { withExtension } from '../../../core/utils/file.util';

/**
 * Extracts text including the parts a plain copy-and-paste misses: headers,
 * footers, footnotes, endnotes, comments and text boxes.
 */
@Component({
  selector: 'app-docx-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    BusyOverlayComponent,
    CopyButtonComponent,
    IconComponent,
  ],
  template: `
    <app-tool-shell toolId="docx-extract-text">
      <div class="tool">
        <app-file-drop-zone
          [accepts]="['.docx']"
          [compact]="hasText()"
          title="Drop a Word document"
          hint="Body text plus headers, footers, footnotes, comments and text boxes."
          icon="text-select"
          (filesChange)="onFiles($event)"
        />

        @if (hasText()) {
          <div class="panel">
            <h2 class="panel__title">What to include</h2>
            <div class="checks">
              @for (part of parts; track part.key) {
                <label class="ou-check" [class.is-disabled]="countOf(part.key) === 0">
                  <input
                    type="checkbox"
                    [checked]="isIncluded(part.key)"
                    [disabled]="countOf(part.key) === 0"
                    (change)="toggle(part.key, $event)"
                  />
                  <span>
                    {{ part.label }}
                    <small>
                      {{
                        countOf(part.key) === 0
                          ? 'none found'
                          : countOf(part.key) + ' found'
                      }}
                    </small>
                  </span>
                </label>
              }
            </div>
          </div>

          <div class="toolbar">
            <span class="ou-subtle">
              {{ characterCount().toLocaleString() }} characters ·
              {{ wordCount().toLocaleString() }} words
            </span>
            <span class="ou-spacer"></span>
            <app-copy-button [text]="combined()" label="Copy text" [small]="true" />
            <button type="button" class="ou-btn ou-btn--sm" (click)="download()">
              <app-icon name="download" [size]="14" />
              Download .txt
            </button>
          </div>

          <pre class="preview"><code>{{ combined().slice(0, 60000) }}</code></pre>
          @if (combined().length > 60000) {
            <p class="hint">Preview truncated — copy and download include everything.</p>
          }

          <div class="actions">
            <button type="button" class="ou-btn" (click)="startOver()">Open another document</button>
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
  styleUrl: './docx-text.component.scss',
})
export class DocxTextComponent extends ToolBase {
  readonly toolId = 'docx-extract-text';

  protected readonly parts = [
    { key: 'body', label: 'Body text' },
    { key: 'headers', label: 'Headers' },
    { key: 'footers', label: 'Footers' },
    { key: 'footnotes', label: 'Footnotes' },
    { key: 'endnotes', label: 'Endnotes' },
    { key: 'comments', label: 'Comments' },
    { key: 'textBoxes', label: 'Text boxes' },
  ] as const;

  private readonly body = signal('');
  private readonly extras = signal<DocxExtraText | null>(null);
  protected readonly included = signal<Set<string>>(
    new Set(['body', 'headers', 'footers', 'footnotes', 'endnotes', 'textBoxes']),
  );

  protected readonly hasText = computed(() => this.body().length > 0 || !!this.extras());

  protected readonly combined = computed(() => {
    const extras = this.extras();
    const sections: string[] = [];

    if (this.isIncluded('body') && this.body()) sections.push(this.body());
    if (!extras) return sections.join('\n\n');

    const append = (key: keyof DocxExtraText, label: string): void => {
      if (!this.isIncluded(key) || !extras[key].length) return;
      sections.push(`--- ${label} ---\n${extras[key].join('\n\n')}`);
    };

    append('headers', 'Headers');
    append('footers', 'Footers');
    append('footnotes', 'Footnotes');
    append('endnotes', 'Endnotes');
    append('comments', 'Comments');
    append('textBoxes', 'Text boxes');

    return sections.join('\n\n');
  });

  protected readonly characterCount = computed(() => this.combined().length);
  protected readonly wordCount = computed(
    () => (this.combined().match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) ?? []).length,
  );

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override afterFiles(files: File[]): void {
    const file = files[0];
    if (!file) return;
    void this.run('Extracting text…', async () => {
      const [content, extras] = await Promise.all([readDocx(file), extractDocxExtras(file)]);
      this.body.set(content.text);
      this.extras.set(extras);
    });
  }

  protected isIncluded(key: string): boolean {
    return this.included().has(key);
  }

  protected countOf(key: string): number {
    if (key === 'body') return this.body() ? 1 : 0;
    const extras = this.extras();
    if (!extras) return 0;
    return extras[key as keyof DocxExtraText]?.length ?? 0;
  }

  protected toggle(key: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Set(this.included());
    checked ? next.add(key) : next.delete(key);
    this.included.set(next);
  }

  protected async download(): Promise<void> {
    const file = this.primaryFile();
    if (!file) return;
    await this.downloads.saveText(this.combined(), withExtension(file.name, '.txt'));
  }

  protected startOver(): void {
    this.body.set('');
    this.extras.set(null);
    this.reset();
  }
}
