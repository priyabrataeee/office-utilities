import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ZoomControlsComponent } from '../../../shared/components/zoom-controls/zoom-controls.component';
import { DownloadService } from '../../../core/services/download.service';
import { readDocx } from '../../../core/engines/docx.engine';
import { sanitizeHtml } from '../../../core/engines/markdown.engine';
import { markdownOutline } from '../../../core/engines/markdown.engine';
import type { DocBlock } from '../../../core/engines/doc-model';

/** Word document reader with an outline, search and print. */
@Component({
  selector: 'app-docx-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, ZoomControlsComponent],
  template: `
    <div class="viewer">
      <div class="bar ou-no-print">
        <button
          type="button"
          class="ou-btn ou-btn--sm ou-btn--ghost ou-btn--icon"
          (click)="showOutline.set(!showOutline())"
          [class.is-active]="showOutline()"
          aria-label="Toggle outline"
          title="Outline"
        >
          <app-icon name="layers" [size]="16" />
        </button>

        <span class="bar__divider"></span>
        <app-zoom-controls [(zoom)]="zoom" [min]="0.6" [max]="2" [showFit]="false" />
        <span class="ou-spacer"></span>

        <span class="ou-subtle">{{ wordCount().toLocaleString() }} words</span>
        <button
          type="button"
          class="ou-btn ou-btn--sm ou-btn--ghost ou-btn--icon"
          (click)="print()"
          aria-label="Print"
          title="Print"
        >
          <app-icon name="printer" [size]="16" />
        </button>
        <button
          type="button"
          class="ou-btn ou-btn--sm ou-btn--ghost ou-btn--icon"
          (click)="download()"
          aria-label="Download original"
          title="Download original"
        >
          <app-icon name="download" [size]="16" />
        </button>
      </div>

      <div class="body">
        @if (showOutline() && outline().length) {
          <aside class="outline ou-no-print">
            <h3>Outline</h3>
            <ul>
              @for (entry of outline(); track $index) {
                <li [style.padding-left.px]="(entry.level - 1) * 12">{{ entry.text }}</li>
              }
            </ul>
          </aside>
        }

        <div class="page-area">
          @if (loading()) {
            <div class="sheet">
              <span class="ou-skeleton line" style="width: 60%"></span>
              <span class="ou-skeleton line"></span>
              <span class="ou-skeleton line"></span>
              <span class="ou-skeleton line" style="width: 80%"></span>
            </div>
          } @else if (error()) {
            <p class="error">
              <app-icon name="alert-circle" [size]="16" />
              {{ error() }}
            </p>
          } @else {
            <article
              class="sheet ou-prose"
              [style.zoom]="zoom()"
              [innerHTML]="html()"
            ></article>
          }
        </div>
      </div>
    </div>
  `,
  styleUrl: './docx-view.component.scss',
})
export class DocxViewComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly downloads = inject(DownloadService);

  readonly file = input.required<File>();

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly html = signal<SafeHtml | null>(null);
  protected readonly zoom = signal(1);
  protected readonly showOutline = signal(true);

  private readonly blocks = signal<DocBlock[]>([]);
  protected readonly outline = computed(() => markdownOutline(this.blocks()));
  protected readonly wordCount = computed(
    () =>
      this.blocks()
        .flatMap((block) =>
          block.type === 'paragraph' || block.type === 'heading'
            ? block.content.map((run) => run.text)
            : [],
        )
        .join(' ')
        .split(/\s+/)
        .filter(Boolean).length,
  );

  constructor() {
    effect(() => {
      const file = this.file();
      if (file) void this.load(file);
    });
  }

  private async load(file: File): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const content = await readDocx(file);
      this.blocks.set(content.blocks);
      // Sanitised before it is ever bound, since the source is a user file.
      this.html.set(this.sanitizer.bypassSecurityTrustHtml(await sanitizeHtml(content.html)));
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : String(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected print(): void {
    window.print();
  }

  protected async download(): Promise<void> {
    await this.downloads.save(this.file(), this.file().name);
  }
}
