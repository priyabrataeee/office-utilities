import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolBase } from '../../../shared/tool-base';
import {
  extractPdfDocument,
  type PdfExtractOptions,
  type PdfExtractResult,
} from '../../../core/engines/pdf-extract.engine';
import { renderDocumentToDocx } from '../../../core/engines/docx-writer';
import { documentToHtml } from '../../../core/engines/html.engine';
import { sanitizeHtml } from '../../../core/engines/markdown.engine';
import { withExtension } from '../../../core/utils/file.util';

export type ExtractTarget = 'docx' | 'text';

const TARGET_META: Record<
  ExtractTarget,
  { extension: string; label: string; icon: string }
> = {
  docx: { extension: '.docx', label: 'Word', icon: 'file-word' },
  text: { extension: '.txt', label: 'text', icon: 'file-text' },
};

/**
 * PDF to Word and PDF to text.
 *
 * Both read the same extraction; only the writer differs. The options are
 * exposed rather than hidden because structure recovery is inference — when a
 * document defeats the heuristics, the person looking at the result is far
 * better placed to correct it than the code is.
 */
@Component({
  selector: 'app-pdf-extract',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    ResultPanelComponent,
    BusyOverlayComponent,
    CopyButtonComponent,
    IconComponent,
  ],
  templateUrl: './pdf-extract.component.html',
  styleUrl: './pdf-extract.component.scss',
})
export class PdfExtractComponent extends ToolBase {
  readonly toolIdInput = input.required<string>({ alias: 'toolId' });
  readonly target = input.required<ExtractTarget>();

  get toolId(): string {
    return this.toolIdInput();
  }

  private readonly sanitizer = inject(DomSanitizer);

  protected readonly result = signal<PdfExtractResult | null>(null);
  protected readonly previewHtml = signal<SafeHtml | null>(null);

  protected readonly detectHeadings = signal(true);
  protected readonly detectLists = signal(true);
  protected readonly mergeParagraphs = signal(true);
  protected readonly dropRepeated = signal(true);
  protected readonly pageBreaks = signal(false);

  protected readonly meta = computed(() => TARGET_META[this.target()]);
  protected readonly isWord = computed(() => this.target() === 'docx');
  protected readonly hasContent = computed(() => (this.result()?.blocks.length ?? 0) > 0);

  protected readonly blockCount = computed(() => this.result()?.blocks.length ?? 0);
  protected readonly headingCount = computed(() => this.result()?.headingCount ?? 0);
  protected readonly pageCount = computed(() => this.result()?.pageCount ?? 0);
  protected readonly droppedLines = computed(() => this.result()?.droppedLines ?? []);
  protected readonly textOutput = computed(() => this.result()?.text ?? '');

  /** A PDF with no text layer is a scan; nothing here can read it. */
  protected readonly isScanned = computed(() => {
    const result = this.result();
    return !!result && !result.hasTextLayer;
  });

  protected override afterFiles(): void {
    void this.extract();
  }

  private options(): PdfExtractOptions {
    return {
      detectHeadings: this.detectHeadings(),
      detectLists: this.detectLists(),
      mergeParagraphs: this.mergeParagraphs(),
      dropRepeated: this.dropRepeated(),
      pageBreaks: this.pageBreaks(),
    };
  }

  private async extract(): Promise<void> {
    const file = this.primaryFile();
    if (!file) return;

    const extracted = await this.run('Reading the PDF…', () =>
      extractPdfDocument(file, this.options(), this.onProgress),
    );
    if (!extracted) return;

    this.result.set(extracted);
    this.clearOutputs();

    if (extracted.hasTextLayer) {
      const html = documentToHtml(extracted.blocks);
      this.previewHtml.set(this.sanitizer.bypassSecurityTrustHtml(await sanitizeHtml(html)));
    } else {
      this.previewHtml.set(null);
    }
  }

  /** Any option change re-runs the extraction, so the preview always matches. */
  protected async toggle(
    option: 'detectHeadings' | 'detectLists' | 'mergeParagraphs' | 'dropRepeated' | 'pageBreaks',
    event: Event,
  ): Promise<void> {
    this[option].set((event.target as HTMLInputElement).checked);
    await this.extract();
  }

  protected async download(): Promise<void> {
    const file = this.primaryFile();
    const extracted = this.result();
    if (!file || !extracted || !extracted.blocks.length) return;

    const name = withExtension(file.name, this.meta().extension);

    if (this.isWord()) {
      const blob = await this.run('Building the Word document…', () =>
        renderDocumentToDocx(extracted.blocks, {
          meta: {
            title: file.name.replace(/\.pdf$/i, ''),
            creator: 'Office Utilities',
          },
        }),
      );
      if (!blob) return;
      this.setOutputs([this.output(name, blob)]);
      return;
    }

    const blob = new Blob([extracted.text], { type: 'text/plain;charset=utf-8' });
    this.setOutputs([this.output(name, blob)]);
  }

  protected startOver(): void {
    this.reset();
    this.result.set(null);
    this.previewHtml.set(null);
  }
}
