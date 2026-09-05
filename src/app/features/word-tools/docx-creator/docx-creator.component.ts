import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolBase } from '../../../shared/tool-base';
import { StorageService } from '../../../core/services/storage.service';
import { htmlToDocument } from '../../../core/engines/html.engine';
import { renderDocumentToDocx } from '../../../core/engines/docx-writer';
import { renderDocumentToPdf } from '../../../core/engines/pdf-writer';

interface ToolbarButton {
  readonly command: string;
  readonly icon: string;
  readonly label: string;
  readonly value?: string;
}

const DRAFT_KEY = 'docx-creator-draft';

const STARTER = `
<h2>Title of your document</h2>
<p>Start typing here. Use the toolbar above to add headings, lists, quotes and links; changes are saved to this browser as you type.</p>
<h3>What you can do</h3>
<ul>
  <li>Paste rich text from anywhere — it keeps its structure.</li>
  <li>Insert headings, bullet and numbered lists, quotes and code.</li>
  <li>Export the result as .docx or .pdf, all done in this tab.</li>
</ul>
<blockquote>Nothing you type here leaves your computer.</blockquote>
`.trim();

/**
 * A rich text editor that produces real .docx and .pdf files.
 *
 * The editor is a `contenteditable` region — cheapest way to get inline
 * styling, drag-and-drop and rich-text paste that actually works. Its HTML is
 * then parsed by the same html engine every conversion tool uses, so headings,
 * lists and tables end up as proper Word styles rather than boxes of ad-hoc
 * formatting.
 */
@Component({
  selector: 'app-docx-creator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolShellComponent, ResultPanelComponent, BusyOverlayComponent, IconComponent],
  templateUrl: './docx-creator.component.html',
  styleUrl: './docx-creator.component.scss',
})
export class DocxCreatorComponent extends ToolBase {
  private readonly storage = inject(StorageService);
  private readonly doc = inject(DOCUMENT);

  readonly toolId = 'docx-creator';

  protected readonly title = signal('Untitled document');
  protected readonly wordCount = signal(0);
  protected readonly savedAt = signal<number | null>(null);

  protected readonly editor = viewChild<ElementRef<HTMLDivElement>>('editor');

  protected readonly formatButtons: readonly ToolbarButton[] = [
    { command: 'bold', icon: 'type', label: 'Bold' },
    { command: 'italic', icon: 'type', label: 'Italic' },
    { command: 'underline', icon: 'type', label: 'Underline' },
    { command: 'strikeThrough', icon: 'type', label: 'Strikethrough' },
  ];

  protected readonly blockButtons: readonly ToolbarButton[] = [
    { command: 'formatBlock', value: 'H1', icon: 'type', label: 'Heading 1' },
    { command: 'formatBlock', value: 'H2', icon: 'type', label: 'Heading 2' },
    { command: 'formatBlock', value: 'H3', icon: 'type', label: 'Heading 3' },
    { command: 'formatBlock', value: 'P', icon: 'type', label: 'Paragraph' },
    { command: 'formatBlock', value: 'BLOCKQUOTE', icon: 'type', label: 'Quote' },
    { command: 'formatBlock', value: 'PRE', icon: 'code', label: 'Code block' },
  ];

  protected readonly listButtons: readonly ToolbarButton[] = [
    { command: 'insertUnorderedList', icon: 'layers', label: 'Bulleted list' },
    { command: 'insertOrderedList', icon: 'hash', label: 'Numbered list' },
  ];

  protected readonly alignButtons: readonly ToolbarButton[] = [
    { command: 'justifyLeft', icon: 'text-select', label: 'Align left' },
    { command: 'justifyCenter', icon: 'text-select', label: 'Center' },
    { command: 'justifyRight', icon: 'text-select', label: 'Align right' },
  ];

  protected readonly hasContent = computed(() => this.wordCount() > 0);

  constructor() {
    super();

    // Restore the saved draft (or the starter markup) once the editor exists.
    effect(() => {
      const element = this.editor()?.nativeElement;
      if (!element) return;
      untracked(() => {
        const saved = this.storage.read<{ title: string; html: string } | null>(DRAFT_KEY, null);
        this.title.set(saved?.title ?? 'Untitled document');
        element.innerHTML = saved?.html ?? STARTER;
        this.refreshStats();
      });
    });
  }

  protected exec(button: ToolbarButton): void {
    const element = this.editor()?.nativeElement;
    element?.focus();
    // `execCommand` is deprecated but is still the only way to get rich-text
    // editing without a full editor library. It is supported everywhere.
    this.doc.execCommand(button.command, false, button.value);
    this.persist();
  }

  protected insertLink(): void {
    const url = prompt('Link to (https://…)');
    if (!url) return;
    if (!/^(https?:|mailto:|tel:)/i.test(url)) {
      this.toast.warning('That does not look like a valid link');
      return;
    }
    this.editor()?.nativeElement.focus();
    this.doc.execCommand('createLink', false, url);
    this.persist();
  }

  protected insertHorizontalRule(): void {
    this.editor()?.nativeElement.focus();
    this.doc.execCommand('insertHorizontalRule');
    this.persist();
  }

  protected undo(): void {
    this.editor()?.nativeElement.focus();
    this.doc.execCommand('undo');
    this.persist();
  }

  protected redo(): void {
    this.editor()?.nativeElement.focus();
    this.doc.execCommand('redo');
    this.persist();
  }

  protected onInput(): void {
    this.persist();
  }

  protected onPaste(event: ClipboardEvent): void {
    // Prefer HTML from the clipboard, but fall back to plain text so pasting
    // from a terminal or a plain-text editor does not insert nothing.
    const clipboard = event.clipboardData;
    if (!clipboard) return;
    const html = clipboard.getData('text/html');
    if (html) {
      event.preventDefault();
      this.doc.execCommand('insertHTML', false, sanitiseForPaste(html));
      this.persist();
    }
  }

  protected setTitle(event: Event): void {
    this.title.set((event.target as HTMLInputElement).value);
    this.persist();
  }

  private persist(): void {
    const html = this.editor()?.nativeElement.innerHTML ?? '';
    this.storage.write(DRAFT_KEY, { title: this.title(), html });
    this.savedAt.set(Date.now());
    this.refreshStats();
  }

  private refreshStats(): void {
    const text = this.editor()?.nativeElement.innerText ?? '';
    this.wordCount.set((text.match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) ?? []).length);
  }

  protected async downloadDocx(): Promise<void> {
    const blocks = this.blocks();
    if (!blocks.length) {
      this.toast.warning('Nothing to export — add some content first');
      return;
    }
    const blob = await this.run('Building document…', () =>
      renderDocumentToDocx(blocks, {
        font: 'sans',
        fontSize: 11,
        meta: { title: this.title(), creator: 'Office Utilities' },
      }),
    );
    if (blob) this.setOutputs([this.output(`${filename(this.title())}.docx`, blob)]);
  }

  protected async downloadPdf(): Promise<void> {
    const blocks = this.blocks();
    if (!blocks.length) {
      this.toast.warning('Nothing to export — add some content first');
      return;
    }
    const result = await this.run('Building PDF…', () =>
      renderDocumentToPdf(blocks, {
        font: 'sans',
        fontSize: 11,
        pageNumbers: true,
        meta: { title: this.title() },
      }),
    );
    if (!result) return;
    if (result.droppedCharacters > 0) {
      this.toast.warning(
        `${result.droppedCharacters} characters were substituted`,
        'The standard PDF fonts cover Latin text only.',
      );
    }
    this.setOutputs([this.output(`${filename(this.title())}.pdf`, result.blob)]);
  }

  private blocks(): ReturnType<typeof htmlToDocument> {
    const html = this.editor()?.nativeElement.innerHTML ?? '';
    return htmlToDocument(html);
  }

  protected clearAll(): void {
    const element = this.editor()?.nativeElement;
    if (!element) return;
    element.innerHTML = STARTER;
    this.title.set('Untitled document');
    this.persist();
    this.toast.info('Editor reset to the starter template');
  }

  protected discardDraft(): void {
    this.storage.remove(DRAFT_KEY);
    this.savedAt.set(null);
    this.clearAll();
  }

  protected startOver(): void {
    this.clearOutputs();
  }
}

/**
 * A cheap sanitiser for pasted markup: strips scripts, styles and event
 * attributes. The exporter will re-sanitise structurally when it converts to
 * the document model, so this only needs to defend the live DOM.
 */
function sanitiseForPaste(html: string): string {
  return html
    .replace(/<\s*(script|style|iframe|object|embed)[^]*?<\/\s*\1\s*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\sstyle\s*=\s*("[^"]*"|'[^']*')/gi, '');
}

function filename(title: string): string {
  const stem = title.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return stem || 'document';
}
