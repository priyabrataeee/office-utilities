import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { FileSizePipe } from '../../pipes/file-size.pipe';
import { DownloadService } from '../../../core/services/download.service';
import { ToastService } from '../../../core/services/toast.service';
import type { OutputFile } from '../../../core/models/file.model';

/**
 * The consistent "your file is ready" step shared by every producing tool:
 * per-file download, ZIP for the whole set, open in a new tab, print, share,
 * and a size delta when the tool set one.
 */
@Component({
  selector: 'app-result-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, FileSizePipe],
  template: `
    @if (outputs().length) {
      <section class="result ou-animate-in">
        <header class="result__head">
          <span class="result__badge"><app-icon name="check" [size]="15" /></span>
          <div>
            <h2 class="result__title">{{ title() }}</h2>
            <p class="result__sub">
              {{ outputs().length }}
              {{ outputs().length === 1 ? 'file' : 'files' }} · {{ totalSize() | fileSize }}
              @if (savedPercent() !== null) {
                · <span class="result__saved">{{ savedPercent() }}% smaller</span>
              }
            </p>
          </div>
          <span class="ou-spacer"></span>
          @if (outputs().length > 1) {
            <button type="button" class="ou-btn ou-btn--primary" (click)="downloadAll()">
              <app-icon name="download" [size]="16" />
              Download all (ZIP)
            </button>
          }
          @if (allowReset()) {
            <button type="button" class="ou-btn" (click)="reset.emit()">
              <app-icon name="refresh" [size]="15" />
              Start over
            </button>
          }
        </header>

        <ul class="result__list">
          @for (file of outputs(); track file.name + $index) {
            <li class="result__item">
              <app-icon class="result__icon" [name]="iconFor(file.name)" [size]="18" />
              <span class="result__name" [title]="file.name">{{ file.name }}</span>
              <span class="result__size">{{ file.size | fileSize }}</span>

              @if (canOpen(file)) {
                <button
                  type="button"
                  class="ou-btn ou-btn--sm ou-btn--ghost ou-btn--icon"
                  (click)="open(file)"
                  [attr.aria-label]="'Open ' + file.name + ' in a new tab'"
                  title="Open in a new tab"
                >
                  <app-icon name="external-link" [size]="15" />
                </button>
              }
              @if (file.blob.type === 'application/pdf') {
                <button
                  type="button"
                  class="ou-btn ou-btn--sm ou-btn--ghost ou-btn--icon"
                  (click)="print(file)"
                  aria-label="Print"
                  title="Print"
                >
                  <app-icon name="printer" [size]="15" />
                </button>
              }
              @if (canShare()) {
                <button
                  type="button"
                  class="ou-btn ou-btn--sm ou-btn--ghost ou-btn--icon"
                  (click)="share(file)"
                  aria-label="Share"
                  title="Share"
                >
                  <app-icon name="share" [size]="15" />
                </button>
              }
              <button type="button" class="ou-btn ou-btn--sm" (click)="download(file)">
                <app-icon name="download" [size]="15" />
                Download
              </button>
            </li>
          }
        </ul>
      </section>
    }
  `,
  styleUrl: './result-panel.component.scss',
})
export class ResultPanelComponent {
  private readonly downloads = inject(DownloadService);
  private readonly toast = inject(ToastService);

  readonly outputs = input<readonly OutputFile[]>([]);
  readonly title = input('Ready to download');
  readonly zipName = input('office-utilities.zip');
  readonly allowReset = input(true);
  /** Original size in bytes; enables the "n% smaller" indicator. */
  readonly originalSize = input<number | null>(null);

  readonly reset = output<void>();

  protected readonly totalSize = computed(() =>
    this.outputs().reduce((sum, f) => sum + f.size, 0),
  );

  protected readonly savedPercent = computed(() => {
    const original = this.originalSize();
    if (!original || original <= 0) return null;
    const saved = Math.round((1 - this.totalSize() / original) * 100);
    return saved > 0 ? saved : null;
  });

  protected readonly canShare = computed(() => this.downloads.canShareFiles);

  protected iconFor(name: string): string {
    const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
    if (ext === '.pdf') return 'file-pdf';
    if (ext === '.docx') return 'file-word';
    if (['.xlsx', '.csv'].includes(ext)) return 'file-excel';
    if (ext === '.pptx') return 'file-ppt';
    if (['.png', '.jpg', '.jpeg', '.webp', '.svg', '.avif'].includes(ext)) return 'image';
    if (ext === '.zip') return 'file-zip';
    if (['.json', '.xml', '.html'].includes(ext)) return 'code';
    return 'file-text';
  }

  protected canOpen(file: OutputFile): boolean {
    return /^(application\/pdf|image\/|text\/)/.test(file.blob.type);
  }

  protected async download(file: OutputFile): Promise<void> {
    await this.downloads.saveOutput(file);
  }

  protected async downloadAll(): Promise<void> {
    await this.downloads.saveZip(this.outputs(), this.zipName());
  }

  protected open(file: OutputFile): void {
    this.downloads.openInNewTab(file.blob);
  }

  protected print(file: OutputFile): void {
    this.downloads.print(file.blob);
  }

  protected async share(file: OutputFile): Promise<void> {
    const shared = await this.downloads.shareFile(file.blob, file.name, file.name);
    if (!shared) this.toast.info('Sharing was cancelled or is unavailable here');
  }
}
