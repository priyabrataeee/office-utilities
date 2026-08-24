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
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { DownloadService } from '../../../core/services/download.service';
import {
  markdownOutline,
  markdownToDocument,
  markdownToHtml,
} from '../../../core/engines/markdown.engine';
import { readAsText, withExtension } from '../../../core/utils/file.util';
import type { DocBlock } from '../../../core/engines/doc-model';

/** Markdown reader with a live outline, rendered and source views. */
@Component({
  selector: 'app-markdown-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, CopyButtonComponent],
  template: `
    <div class="viewer">
      <div class="bar ou-no-print">
        <div class="tabs">
          <button
            type="button"
            class="tab"
            [class.is-active]="tab() === 'rendered'"
            (click)="tab.set('rendered')"
          >
            Rendered
          </button>
          <button
            type="button"
            class="tab"
            [class.is-active]="tab() === 'source'"
            (click)="tab.set('source')"
          >
            Source
          </button>
        </div>

        <span class="bar__divider"></span>

        <button
          type="button"
          class="ou-btn ou-btn--sm ou-btn--ghost ou-btn--icon"
          (click)="showOutline.set(!showOutline())"
          [class.is-active]="showOutline()"
          aria-label="Toggle contents"
          title="Table of contents"
        >
          <app-icon name="layers" [size]="16" />
        </button>

        <span class="ou-spacer"></span>
        <span class="ou-subtle">{{ outline().length }} headings</span>
        <app-copy-button [text]="source()" [small]="true" />
        <button type="button" class="ou-btn ou-btn--sm" (click)="downloadHtml()">
          <app-icon name="download" [size]="14" />
          HTML
        </button>
      </div>

      <div class="body">
        @if (showOutline() && outline().length) {
          <aside class="outline ou-no-print">
            <h3>Contents</h3>
            <ul>
              @for (entry of outline(); track $index) {
                <li [style.padding-left.px]="(entry.level - 1) * 12">{{ entry.text }}</li>
              }
            </ul>
          </aside>
        }

        <div class="page-area">
          @if (loading()) {
            <div class="ou-skeleton loader"></div>
          } @else if (error()) {
            <p class="error">
              <app-icon name="alert-circle" [size]="16" />
              {{ error() }}
            </p>
          } @else if (tab() === 'rendered') {
            <article class="sheet ou-prose" [innerHTML]="rendered()"></article>
          } @else {
            <pre class="source"><code>{{ source() }}</code></pre>
          }
        </div>
      </div>
    </div>
  `,
  styleUrl: './markdown-view.component.scss',
})
export class MarkdownViewComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly downloads = inject(DownloadService);

  readonly file = input.required<File>();

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly source = signal('');
  protected readonly rendered = signal<SafeHtml | null>(null);
  protected readonly tab = signal<'rendered' | 'source'>('rendered');
  protected readonly showOutline = signal(true);

  private readonly blocks = signal<DocBlock[]>([]);
  protected readonly outline = computed(() => markdownOutline(this.blocks()));

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
      const text = await readAsText(file);
      this.source.set(text);
      this.blocks.set(await markdownToDocument(text));
      this.rendered.set(this.sanitizer.bypassSecurityTrustHtml(await markdownToHtml(text)));
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : String(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected async downloadHtml(): Promise<void> {
    const html = await markdownToHtml(this.source());
    await this.downloads.saveText(
      html,
      withExtension(this.file().name, '.html'),
      'text/html;charset=utf-8',
    );
  }
}
