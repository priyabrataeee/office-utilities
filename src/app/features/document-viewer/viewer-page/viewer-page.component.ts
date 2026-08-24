import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { FileSizePipe } from '../../../shared/pipes/file-size.pipe';
import { ToolBase } from '../../../shared/tool-base';
import { PdfViewComponent } from '../pdf-view/pdf-view.component';
import { DocxViewComponent } from '../docx-view/docx-view.component';
import { SheetViewComponent } from '../sheet-view/sheet-view.component';
import { PptxViewComponent } from '../pptx-view/pptx-view.component';
import { CodeViewComponent, type CodeKind } from '../code-view/code-view.component';
import { MarkdownViewComponent } from '../markdown-view/markdown-view.component';
import { acceptsFor, detectViewerKind, type ViewerKind } from '../viewer-kind';

/**
 * Host for every viewer route.
 *
 * The route supplies the format; `auto` detects it from the dropped file. Each
 * sub-viewer is `@defer`red so opening a JSON file never downloads the PDF
 * renderer, and vice versa.
 */
@Component({
  selector: 'app-viewer-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    EmptyStateComponent,
    IconComponent,
    FileSizePipe,
    PdfViewComponent,
    DocxViewComponent,
    SheetViewComponent,
    PptxViewComponent,
    CodeViewComponent,
    MarkdownViewComponent,
  ],
  templateUrl: './viewer-page.component.html',
  styleUrl: './viewer-page.component.scss',
})
export class ViewerPageComponent extends ToolBase {
  readonly toolIdInput = input.required<string>({ alias: 'toolId' });
  readonly kind = input.required<ViewerKind | 'auto'>();

  get toolId(): string {
    return this.toolIdInput();
  }

  protected readonly detected = signal<ViewerKind | null>(null);
  protected readonly imageUrl = signal<string | null>(null);

  protected readonly accepts = computed(() => acceptsFor(this.kind()));

  /**
   * The viewer actually in use.
   *
   * Detection wins over the route: someone who lands on /json-viewer and drops
   * a CSV wants to see their data, not an error.
   */
  protected readonly effectiveKind = computed<ViewerKind | null>(() => {
    if (!this.hasFile()) return null;
    const detected = this.detected();
    if (detected && detected !== 'unsupported') return detected;
    const routeKind = this.kind();
    return routeKind === 'auto' ? (detected ?? null) : (routeKind as ViewerKind);
  });

  /** Which flavour of the shared code viewer the current file needs. */
  protected readonly codeKind = computed<CodeKind>(() => {
    const kind = this.effectiveKind();
    return kind === 'json' || kind === 'xml' || kind === 'html' ? kind : 'text';
  });

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override afterFiles(files: File[]): void {
    const file = files[0];
    if (!file) return;

    const kind = detectViewerKind(file);
    this.detected.set(kind);

    const previous = this.imageUrl();
    if (previous) URL.revokeObjectURL(previous);
    this.imageUrl.set(kind === 'image' ? URL.createObjectURL(file) : null);

    // A file dropped on a format-specific route that does not match it is
    // worth flagging rather than failing silently in the sub-viewer.
    const routeKind = this.kind();
    if (routeKind !== 'auto' && kind !== routeKind && kind !== 'unsupported') {
      this.toast.info(
        `That looks like a ${kind.toUpperCase()} file`,
        'Opening it with the universal viewer instead.',
      );
    }
  }

  protected startOver(): void {
    const url = this.imageUrl();
    if (url) URL.revokeObjectURL(url);
    this.imageUrl.set(null);
    this.detected.set(null);
    this.reset();
  }
}
