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
import { markdownToDocument, sanitizeHtml } from '../../../core/engines/markdown.engine';
import {
  documentToHtml,
  documentToMarkdown,
  htmlToDocument,
} from '../../../core/engines/html.engine';
import { renderDocumentToPdf } from '../../../core/engines/pdf-writer';
import { renderDocumentToDocx } from '../../../core/engines/docx-writer';
import type { DocBlock, PageSizeName } from '../../../core/engines/doc-model';
import { readAsText, withExtension } from '../../../core/utils/file.util';

export type DocSource = 'markdown' | 'html' | 'text';
export type DocTarget = 'pdf' | 'docx' | 'html' | 'markdown';

const TARGET_META: Record<DocTarget, { extension: string; mime: string; label: string; icon: string }> = {
  pdf: { extension: '.pdf', mime: 'application/pdf', label: 'PDF', icon: 'file-pdf' },
  docx: {
    extension: '.docx',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    label: 'Word',
    icon: 'file-word',
  },
  html: { extension: '.html', mime: 'text/html;charset=utf-8', label: 'HTML', icon: 'code' },
  markdown: {
    extension: '.md',
    mime: 'text/markdown;charset=utf-8',
    label: 'Markdown',
    icon: 'markdown',
  },
};

const SOURCE_META: Record<DocSource, { accepts: string[]; label: string; placeholder: string }> = {
  markdown: {
    accepts: ['.md', '.markdown', '.mdx', '.txt'],
    label: 'Markdown',
    placeholder: '# Title\n\nWrite **Markdown** here, or drop a file above.\n\n- Point one\n- Point two',
  },
  html: {
    accepts: ['.html', '.htm'],
    label: 'HTML',
    placeholder: '<h1>Title</h1>\n<p>Paste <strong>HTML</strong> here, or drop a file above.</p>',
  },
  text: {
    accepts: ['.txt', '.log', '.md'],
    label: 'text',
    placeholder: 'Paste plain text here, or drop a file above.',
  },
};

/**
 * Markup conversion hub.
 *
 * Everything routes through the shared document model: parse the source into
 * blocks once, then hand those blocks to whichever writer the target needs.
 */
@Component({
  selector: 'app-doc-convert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    ResultPanelComponent,
    BusyOverlayComponent,
    CopyButtonComponent,
    IconComponent,
  ],
  templateUrl: './doc-convert.component.html',
  styleUrl: './doc-convert.component.scss',
})
export class DocConvertComponent extends ToolBase {
  private readonly sanitizer = inject(DomSanitizer);

  readonly toolIdInput = input.required<string>({ alias: 'toolId' });
  readonly source = input.required<DocSource>();
  readonly target = input.required<DocTarget>();

  get toolId(): string {
    return this.toolIdInput();
  }

  protected readonly input$ = signal('');
  protected readonly blocks = signal<DocBlock[]>([]);
  protected readonly preview = signal<SafeHtml | null>(null);
  protected readonly textOutput = signal('');
  protected readonly droppedCharacters = signal(0);

  /* Page options, used by the PDF and DOCX writers. */
  protected readonly pageSize = signal<PageSizeName>('A4');
  protected readonly fontFamily = signal<'sans' | 'serif' | 'mono'>('sans');
  protected readonly fontSize = signal(11);
  protected readonly margin = signal(56);
  protected readonly pageNumbers = signal(false);
  protected readonly standalone = signal(true);
  protected readonly lineNumbers = signal(false);

  protected readonly sourceMeta = computed(() => SOURCE_META[this.source()]);
  protected readonly targetMeta = computed(() => TARGET_META[this.target()]);
  protected readonly isBinaryTarget = computed(
    () => this.target() === 'pdf' || this.target() === 'docx',
  );
  protected readonly hasContent = computed(() => this.blocks().length > 0);

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override afterFiles(files: File[]): void {
    const file = files[0];
    if (!file) return;
    void this.run('Reading file…', async () => {
      const text = await readAsText(file);
      this.input$.set(text);
      await this.parse(text);
    });
  }

  protected async onInput(event: Event): Promise<void> {
    const text = (event.target as HTMLTextAreaElement).value;
    this.input$.set(text);
    await this.parse(text);
  }

  private async parse(text: string): Promise<void> {
    if (!text.trim()) {
      this.blocks.set([]);
      this.preview.set(null);
      this.textOutput.set('');
      return;
    }

    let blocks: DocBlock[];
    switch (this.source()) {
      case 'markdown':
        blocks = await markdownToDocument(text);
        break;
      case 'html':
        blocks = htmlToDocument(text);
        break;
      default:
        blocks = plainTextToBlocks(text, this.lineNumbers());
    }

    this.blocks.set(blocks);
    this.preview.set(
      this.sanitizer.bypassSecurityTrustHtml(await sanitizeHtml(documentToHtml(blocks))),
    );
    this.buildTextOutput(blocks);
  }

  private buildTextOutput(blocks: readonly DocBlock[]): void {
    switch (this.target()) {
      case 'html':
        this.textOutput.set(
          documentToHtml(blocks, { standalone: this.standalone(), title: this.documentTitle() }),
        );
        break;
      case 'markdown':
        this.textOutput.set(documentToMarkdown(blocks));
        break;
      default:
        this.textOutput.set('');
    }
  }

  private documentTitle(): string {
    const file = this.primaryFile();
    if (file) return file.name.replace(/\.[^.]+$/, '');
    const heading = this.blocks().find((block) => block.type === 'heading');
    return heading && heading.type === 'heading'
      ? heading.content.map((run) => run.text).join('')
      : 'Document';
  }

  protected setPageSize(event: Event): void {
    this.pageSize.set((event.target as HTMLSelectElement).value as PageSizeName);
  }
  protected setFont(event: Event): void {
    this.fontFamily.set((event.target as HTMLSelectElement).value as 'sans' | 'serif' | 'mono');
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
  protected toggleStandalone(event: Event): void {
    this.standalone.set((event.target as HTMLInputElement).checked);
    this.buildTextOutput(this.blocks());
  }
  protected async toggleLineNumbers(event: Event): Promise<void> {
    this.lineNumbers.set((event.target as HTMLInputElement).checked);
    await this.parse(this.input$());
  }

  protected async convert(): Promise<void> {
    const blocks = this.blocks();
    if (!blocks.length) return;

    const meta = this.targetMeta();
    const file = this.primaryFile();
    const name = file
      ? withExtension(file.name, meta.extension)
      : `document${meta.extension}`;

    if (this.target() === 'pdf') {
      const result = await this.run('Laying out pages…', () =>
        renderDocumentToPdf(blocks, {
          size: this.pageSize(),
          font: this.fontFamily(),
          fontSize: this.fontSize(),
          margin: this.margin(),
          pageNumbers: this.pageNumbers(),
          meta: { title: this.documentTitle() },
        }),
      );
      if (!result) return;

      this.droppedCharacters.set(result.droppedCharacters);
      if (result.droppedCharacters > 0) {
        this.toast.warning(
          `${result.droppedCharacters} characters were substituted`,
          'The standard PDF fonts cover Latin text only.',
        );
      }
      this.setOutputs([this.output(name, result.blob)]);
      return;
    }

    if (this.target() === 'docx') {
      const blob = await this.run('Building document…', () =>
        renderDocumentToDocx(blocks, {
          size: this.pageSize(),
          font: this.fontFamily(),
          fontSize: this.fontSize(),
          margin: this.margin(),
          pageNumbers: this.pageNumbers(),
          meta: { title: this.documentTitle() },
        }),
      );
      if (blob) this.setOutputs([this.output(name, blob)]);
      return;
    }

    this.setOutputs([
      this.output(name, new Blob([this.textOutput()], { type: meta.mime })),
    ]);
  }

  protected startOver(): void {
    this.input$.set('');
    this.blocks.set([]);
    this.preview.set(null);
    this.textOutput.set('');
    this.reset();
  }
}

/** Splits plain text into paragraphs, optionally numbering each line. */
function plainTextToBlocks(text: string, lineNumbers: boolean): DocBlock[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const width = String(lines.length).length;

  if (lineNumbers) {
    return [
      {
        type: 'code',
        text: lines
          .map((line, index) => `${String(index + 1).padStart(width, ' ')}  ${line}`)
          .join('\n'),
      },
    ];
  }

  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .filter((paragraph) => paragraph.trim())
    .map((paragraph) => ({
      type: 'paragraph' as const,
      content: [{ text: paragraph.replace(/\n/g, ' ').trim() }],
    }));
}
