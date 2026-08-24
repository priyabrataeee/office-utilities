import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { FileSizePipe } from '../../../shared/pipes/file-size.pipe';
import { ToolBase } from '../../../shared/tool-base';
import { readPresentation } from '../../../core/engines/pptx.engine';
import { dataUrlToBlob } from '../../../core/engines/image.engine';

interface MediaItem {
  readonly name: string;
  readonly dataUrl: string;
  readonly bytes: number;
}

@Component({
  selector: 'app-pptx-media',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    ResultPanelComponent,
    BusyOverlayComponent,
    EmptyStateComponent,
    IconComponent,
    FileSizePipe,
  ],
  template: `
    <app-tool-shell toolId="pptx-extract-images" [wide]="true">
      <div class="tool">
        <app-file-drop-zone
          [accepts]="['.pptx']"
          [compact]="scanned()"
          title="Drop a presentation"
          hint="Every embedded picture at its original quality."
          icon="images"
          (filesChange)="onFiles($event)"
        />

        @if (scanned()) {
          @if (media().length) {
            <div class="toolbar">
              <span class="ou-subtle">
                {{ media().length }} images · {{ totalBytes() | fileSize }}
              </span>
              <span class="ou-spacer"></span>
              <button
                type="button"
                class="ou-btn ou-btn--sm"
                [disabled]="busy()"
                (click)="collectAll()"
              >
                <app-icon name="download" [size]="14" />
                Prepare all for download
              </button>
            </div>

            <ul class="grid">
              @for (item of media(); track item.name) {
                <li class="card">
                  <div class="card__thumb">
                    <img [src]="item.dataUrl" [alt]="item.name" loading="lazy" />
                  </div>
                  <div class="card__meta">
                    <span class="card__name" [title]="item.name">{{ item.name }}</span>
                    <span class="card__spec">{{ item.bytes | fileSize }}</span>
                  </div>
                  <button
                    type="button"
                    class="ou-btn ou-btn--sm ou-btn--block"
                    (click)="downloadOne(item)"
                  >
                    <app-icon name="download" [size]="13" />
                    Download
                  </button>
                </li>
              }
            </ul>
          } @else {
            <app-empty-state
              icon="images"
              title="No usable images in this deck"
              message="Nothing is stored in the presentation's media folder, or the media it contains uses vector or video formats a browser cannot display."
            />
          }

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

        <app-result-panel
          [outputs]="outputs()"
          title="Images ready"
          zipName="slide-images.zip"
          (reset)="clearOutputs()"
        />
      </div>
    </app-tool-shell>
  `,
  styleUrl: './pptx-media.component.scss',
})
export class PptxMediaComponent extends ToolBase {
  readonly toolId = 'pptx-extract-images';

  protected readonly media = signal<MediaItem[]>([]);
  protected readonly scanned = signal(false);

  protected readonly totalBytes = computed(() =>
    this.media().reduce((sum, item) => sum + item.bytes, 0),
  );

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override afterFiles(files: File[]): void {
    const file = files[0];
    if (!file) return;
    this.scanned.set(false);
    void this.run('Opening presentation…', async () => {
      const deck = await readPresentation(file);
      this.media.set([...deck.media].sort((a, b) => b.bytes - a.bytes));
      this.scanned.set(true);
    });
  }

  protected async downloadOne(item: MediaItem): Promise<void> {
    await this.downloads.save(await dataUrlToBlob(item.dataUrl), item.name);
  }

  protected async collectAll(): Promise<void> {
    const items = this.media();
    const outputs = await this.run('Collecting images…', async () => {
      const produced = [];
      for (const [index, item] of items.entries()) {
        produced.push(this.output(item.name, await dataUrlToBlob(item.dataUrl)));
        this.onProgress(index + 1, items.length);
      }
      return produced;
    });
    if (outputs) this.setOutputs(outputs);
  }

  protected startOver(): void {
    this.media.set([]);
    this.scanned.set(false);
    this.reset();
  }
}
