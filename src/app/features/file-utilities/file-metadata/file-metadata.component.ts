import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolBase } from '../../../shared/tool-base';
import { readFileMetadata, type MetadataGroup } from '../../../core/engines/file-inspect.engine';

@Component({
  selector: 'app-file-metadata',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    BusyOverlayComponent,
    CopyButtonComponent,
    IconComponent,
  ],
  template: `
    <app-tool-shell toolId="file-metadata">
      <div class="tool">
        <app-file-drop-zone
          [compact]="groups().length > 0"
          title="Drop a file to inspect"
          hint="Reads the file's own properties, not just what the browser reports."
          icon="info"
          (filesChange)="onFiles($event)"
        />

        @if (groups().length) {
          <div class="toolbar">
            <span class="ou-subtle">{{ primaryFile()?.name }}</span>
            <span class="ou-spacer"></span>
            <app-copy-button [text]="exportText()" label="Copy all" [small]="true" />
            <button type="button" class="ou-btn ou-btn--sm ou-btn--ghost" (click)="startOver()">
              Clear
            </button>
          </div>

          @for (group of groups(); track group.title) {
            <div class="panel">
              <h2 class="panel__title">{{ group.title }}</h2>
              <dl class="props">
                @for (entry of group.entries; track entry.key) {
                  <div>
                    <dt>{{ entry.key }}</dt>
                    <dd>{{ entry.value }}</dd>
                  </div>
                }
              </dl>
            </div>
          }

          <p class="notice">
            <app-icon name="shield-check" [size]="16" />
            <span>
              Document properties travel with the file. Author names, company names and template
              paths are all things worth checking before a document leaves your organisation.
            </span>
          </p>
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
  styleUrl: './file-metadata.component.scss',
})
export class FileMetadataComponent extends ToolBase {
  readonly toolId = 'file-metadata';

  protected readonly groups = signal<MetadataGroup[]>([]);

  protected readonly exportText = computed(() =>
    this.groups()
      .map(
        (group) =>
          `${group.title}\n${group.entries.map((e) => `  ${e.key}: ${e.value}`).join('\n')}`,
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
      this.groups.set(await readFileMetadata(file));
    });
  }

  protected startOver(): void {
    this.groups.set([]);
    this.reset();
  }
}
