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
import { readDocx } from '../../../core/engines/docx.engine';
import { documentToHtml, documentToMarkdown } from '../../../core/engines/html.engine';
import { sanitizeHtml } from '../../../core/engines/markdown.engine';
import { renderDocumentToPdf } from '../../../core/engines/pdf-writer';
import { documentText, type DocBlock, type PageSizeName } from '../../../core/engines/doc-model';
import { withExtension } from '../../../core/utils/file.util';

export type ConvertTarget = 'pdf' | 'html' | 'markdown' | 'text';

const TARGET_META: Record<
  ConvertTarget,
  { extension: string; mime: string; label: string; icon: string }
> = {
  pdf: { extension: '.pdf', mime: 'application/pdf', label: 'PDF', icon: 'file-pdf' },
  html: { extension: '.html', mime: 'text/html;charset=utf-8', label: 'HTML', icon: 'code' },
  markdown: { extension: '.md', mime: 'text/markdown;charset=utf-8', label: 'Markdown', icon: 'markdown' },
  text: { extension: '.txt', mime: 'text/plain;charset=utf-8', label: 'plain text', icon: 'file-text' },
};

/** Word to PDF, HTML, Markdown or plain text — one pipeline, four writers. */
@Component({
  selector: 'app-docx-convert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    ResultPanelComponent,
    BusyOverlayComponent,
    CopyButtonComponent,
    IconComponent,
  ],
  templateUrl: './docx-convert.component.html',
  styleUrl: './docx-convert.component.scss',
})
export class DocxConvertComponent extends ToolBase {
  private readonly sanitizer = inject(DomSanitizer);

  readonly toolIdInput = input.required<string>({ alias: 'toolId' });
  readonly target = input.required<ConvertTarget>();

  get toolId(): string {
    return this.toolIdInput();
  }

  private readonly blocks = signal<DocBlock[]>([]);
  protected readonly rawHtml = signal('');
  protected readonly safePreview = signal<SafeHtml | null>(null);
  protected readonly textOutput = signal('');
  protected readonly conversionNotes = signal<string[]>([]);
  protected readonly droppedCharacters = signal(0);

  /* PDF options */
  protected readonly pageSize = signal<PageSizeName>('A4');
  protected readonly fontFamily = signal<'sans' | 'serif'>('serif');
  protected readonly fontSize = signal(11);
  protected readonly margin = signal(56);
  protected readonly pageNumbers = signal(true);

  /* HTML options */
  protected readonly standalone = signal(true);

  protected readonly meta = computed(() => TARGET_META[this.target()]);
  protected readonly isPdf = computed(() => this.target() === 'pdf');
  protected readonly isTextual = computed(() => this.target() !== 'pdf');
  protected readonly hasContent = computed(() => this.blocks().length > 0);
  protected readonly blockCount = computed(() => this.blocks().length);

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override afterFiles(files: File[]): void {
    const file = files[0];
    if (file) void this.convert(file);
  }

  private async convert(file: File): Promise<void> {
    await this.run('Reading document…', async () => {
      const content = await readDocx(file);
      this.blocks.set(content.blocks);
      this.rawHtml.set(content.html);
      this.conversionNotes.set([...new Set(content.messages)].slice(0, 6));
      // The preview is sanitised before it is ever bound into the page.
      this.safePreview.set(
        this.sanitizer.bypassSecurityTrustHtml(await sanitizeHtml(content.html)),
      );
      await this.buildTextOutput();
    });
  }

  private async buildTextOutput(): Promise<void> {
    const blocks = this.blocks();
    switch (this.target()) {
      case 'html':
        this.textOutput.set(
          documentToHtml(blocks, {
            standalone: this.standalone(),
            title: this.primaryFile()?.name,
          }),
        );
        break;
      case 'markdown':
        this.textOutput.set(documentToMarkdown(blocks));
        break;
      case 'text':
        this.textOutput.set(documentText(blocks));
        break;
      default:
        this.textOutput.set('');
    }
  }

  protected setPageSize(event: Event): void {
    this.pageSize.set((event.target as HTMLSelectElement).value as PageSizeName);
  }

  protected setFont(event: Event): void {
    this.fontFamily.set((event.target as HTMLSelectElement).value as 'sans' | 'serif');
  }

  protected setFontSize(event: Event): void {
    this.fontSize.set(Number((event.target as HTMLInputElement).value));
  }

  protected setMargin(event: Event): void {
    this.margin.set(Number((event.target as HTMLInputElement).value));
  }

  protected togglePageNumbers(event: Event): void {
    this.pageNumbers.set((event.target as HTMLInputElement).checked);
  }

  protected async toggleStandalone(event: Event): Promise<void> {
    this.standalone.set((event.target as HTMLInputElement).checked);
    await this.buildTextOutput();
  }

  protected async download(): Promise<void> {
    const file = this.primaryFile();
    const blocks = this.blocks();
    if (!file || !blocks.length) return;

    const meta = this.meta();

    if (this.isPdf()) {
      const result = await this.run('Laying out pages…', () =>
        renderDocumentToPdf(blocks, {
          size: this.pageSize(),
          font: this.fontFamily(),
          fontSize: this.fontSize(),
          margin: this.margin(),
          pageNumbers: this.pageNumbers(),
          meta: { title: file.name.replace(/\.docx$/i, ''), creator: 'Office Utilities' },
        }),
      );
      if (!result) return;

      this.droppedCharacters.set(result.droppedCharacters);
      if (result.droppedCharacters > 0) {
        this.toast.warning(
          `${result.droppedCharacters} characters could not be drawn`,
          'The standard PDF fonts cover Latin text only. Non-Latin scripts were replaced with "?".',
        );
      }
      this.setOutputs([this.output(withExtension(file.name, meta.extension), result.blob)]);
      return;
    }

    const blob = new Blob([this.textOutput()], { type: meta.mime });
    this.setOutputs([this.output(withExtension(file.name, meta.extension), blob)]);
  }

  protected startOver(): void {
    this.blocks.set([]);
    this.rawHtml.set('');
    this.safePreview.set(null);
    this.textOutput.set('');
    this.conversionNotes.set([]);
    this.reset();
  }
}
