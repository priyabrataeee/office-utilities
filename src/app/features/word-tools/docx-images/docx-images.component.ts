import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { FileSizePipe } from '../../../shared/pipes/file-size.pipe';
import { ToolBase } from '../../../shared/tool-base';
import { extractDocxImages, type DocxImage } from '../../../core/engines/docx.engine';
import { dataUrlToBlob } from '../../../core/engines/image.engine';
import { baseNameOf } from '../../../core/utils/file.util';

@Component({
  selector: 'app-docx-images',
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
    <app-tool-shell toolId="docx-extract-images" [wide]="true">
      <div class="tool">
        <app-file-drop-zone
          [accepts]="['.docx']"
          [compact]="scanned()"
          title="Drop a Word document"
          hint="Every embedded picture is listed at its original quality."
          icon="images"
          (filesChange)="onFiles($event)"
        />

        @if (scanned()) {
          @if (images().length) {
            <div class="toolbar">
              <span class="ou-subtle">
                {{ images().length }} images · {{ totalBytes() | fileSize }}
              </span>
              <span class="ou-spacer"></span>
              <button
                type="button"
                class="ou-btn ou-btn--sm"
                [disabled]="busy()"
                (click)="downloadAll()"
              >
                <app-icon name="download" [size]="14" />
                Prepare all for download
              </button>
            </div>

            <ul class="grid">
              @for (image of images(); track image.name) {
                <li class="card">
                  <div class="card__thumb">
                    <img [src]="image.dataUrl" [alt]="image.name" loading="lazy" />
                  </div>
                  <div class="card__meta">
                    <span class="card__name" [title]="image.name">{{ image.name }}</span>
                    <span class="card__spec">
                      {{ image.width && image.height ? image.width + '×' + image.height : '—' }} ·
                      {{ image.bytes | fileSize }}
                    </span>
                  </div>
                  <button
                    type="button"
                    class="ou-btn ou-btn--sm ou-btn--block"
                    (click)="downloadOne(image)"
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
              title="No images in this document"
              message="Nothing is stored in the document's media folder. Charts and shapes drawn in Word are vector objects, not embedded pictures, so they do not appear here."
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

        <app-result-panel
          [outputs]="outputs()"
          title="Images ready"
          zipName="word-images.zip"
          (reset)="clearOutputs()"
        />
      </div>
    </app-tool-shell>
  `,
  styleUrl: './docx-images.component.scss',
})
export class DocxImagesComponent extends ToolBase {
  readonly toolId = 'docx-extract-images';

  protected readonly images = signal<DocxImage[]>([]);
  protected readonly scanned = signal(false);

  protected readonly totalBytes = computed(() =>
    this.images().reduce((sum, image) => sum + image.bytes, 0),
  );

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override afterFiles(files: File[]): void {
    const file = files[0];
    if (!file) return;
    this.scanned.set(false);
    void this.run('Opening document…', async () => {
      this.images.set(await extractDocxImages(file));
      this.scanned.set(true);
    });
  }

  protected async downloadOne(image: DocxImage): Promise<void> {
    const blob = await dataUrlToBlob(image.dataUrl);
    await this.downloads.save(blob, image.name);
  }

  protected async downloadAll(): Promise<void> {
    const images = this.images();
    const base = baseNameOf(this.primaryFile()?.name ?? 'document');

    const outputs = await this.run('Collecting images…', async () => {
      const produced = [];
      for (const [index, image] of images.entries()) {
        produced.push(this.output(image.name, await dataUrlToBlob(image.dataUrl)));
        this.onProgress(index + 1, images.length);
      }
      return produced;
    });

    if (outputs) {
      this.setOutputs(outputs);
      void base;
    }
  }

  protected startOver(): void {
    this.images.set([]);
    this.scanned.set(false);
    this.reset();
  }
}
