import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { FileSizePipe } from '../../../shared/pipes/file-size.pipe';
import { ToolBase } from '../../../shared/tool-base';
import { readDocxMetadata, type DocxMetadata } from '../../../core/engines/docx.engine';

interface Section {
  readonly title: string;
  readonly hint: string;
  readonly entries: readonly { key: string; value: string }[];
}

@Component({
  selector: 'app-docx-metadata',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    BusyOverlayComponent,
    CopyButtonComponent,
    EmptyStateComponent,
    IconComponent,
    FileSizePipe,
  ],
  template: `
    <app-tool-shell toolId="docx-metadata">
      <div class="tool">
        <app-file-drop-zone
          [accepts]="['.docx']"
          [compact]="!!metadata()"
          title="Drop a Word document"
          hint="Reads the OOXML property parts — author, dates, editing time and more."
          icon="info"
          (filesChange)="onFiles($event)"
        />

        @if (metadata()) {
          <div class="toolbar">
            <span class="ou-subtle">
              {{ primaryFile()?.name }} · {{ primaryFile()?.size | fileSize }}
            </span>
            <span class="ou-spacer"></span>
            <app-copy-button [text]="exportText()" label="Copy all" [small]="true" />
          </div>

          @if (hasAnything()) {
            @for (section of sections(); track section.title) {
              @if (section.entries.length) {
                <div class="panel">
                  <h2 class="panel__title">{{ section.title }}</h2>
                  <p class="panel__hint">{{ section.hint }}</p>
                  <dl class="props">
                    @for (entry of section.entries; track entry.key) {
                      <div>
                        <dt>{{ entry.key }}</dt>
                        <dd>{{ entry.value }}</dd>
                      </div>
                    }
                  </dl>
                </div>
              }
            }

            <p class="notice">
              <app-icon name="shield-check" [size]="16" />
              <span>
                Document properties often carry more than people expect — an author's full name, a
                company, a template path, or how long the file was edited for. Worth checking before
                sending a document outside your organisation.
              </span>
            </p>
          } @else {
            <app-empty-state
              icon="info"
              title="No properties recorded"
              message="This document has no core or application properties — often the sign of a file produced by a converter rather than Word itself."
            />
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
  styleUrl: './docx-metadata.component.scss',
})
export class DocxMetadataComponent extends ToolBase {
  readonly toolId = 'docx-metadata';

  protected readonly metadata = signal<DocxMetadata | null>(null);

  protected readonly sections = computed<Section[]>(() => {
    const data = this.metadata();
    if (!data) return [];
    return [
      {
        title: 'Core properties',
        hint: 'Author, title and revision history recorded by Word.',
        entries: toEntries(data.core),
      },
      {
        title: 'Application properties',
        hint: 'Counts and application details written when the file was saved.',
        entries: toEntries(data.app),
      },
      {
        title: 'Custom properties',
        hint: 'Fields added by your organisation, a template or a document system.',
        entries: toEntries(data.custom),
      },
    ];
  });

  protected readonly hasAnything = computed(() =>
    this.sections().some((section) => section.entries.length > 0),
  );

  protected readonly exportText = computed(() =>
    this.sections()
      .filter((section) => section.entries.length)
      .map(
        (section) =>
          `${section.title}\n${section.entries.map((e) => `  ${e.key}: ${e.value}`).join('\n')}`,
      )
      .join('\n\n'),
  );

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override afterFiles(files: File[]): void {
    const file = files[0];
    if (!file) return;
    void this.run('Reading properties…', async () => {
      this.metadata.set(await readDocxMetadata(file));
    });
  }

  protected startOver(): void {
    this.metadata.set(null);
    this.reset();
  }
}

function toEntries(source: Record<string, string>): { key: string; value: string }[] {
  return Object.entries(source).map(([key, value]) => ({ key, value }));
}
