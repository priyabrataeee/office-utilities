import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ZoomControlsComponent } from '../../../shared/components/zoom-controls/zoom-controls.component';
import { InViewDirective } from '../../../shared/directives/in-view.directive';
import { ToastService } from '../../../core/services/toast.service';
import { DownloadService } from '../../../core/services/download.service';
import {
  closePdf,
  describePdf,
  extractAllText,
  openPdf,
  PasswordRequiredError,
  renderPageProxy,
  renderThumbnail,
  searchPages,
  type PageText,
  type PdfDocumentInfo,
  type SearchHit,
} from '../../../core/engines/pdfjs.engine';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';

interface RenderedPage {
  readonly number: number;
  canvasUrl: string | null;
  width: number;
  height: number;
}

/**
 * Full PDF reader: continuous scroll, thumbnails, full-text search, zoom,
 * rotation, fullscreen, printing and download.
 *
 * Pages render lazily as they approach the viewport, so a 900-page document
 * opens as quickly as a one-page one.
 */
@Component({
  selector: 'app-pdf-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, ZoomControlsComponent, InViewDirective],
  templateUrl: './pdf-view.component.html',
  styleUrl: './pdf-view.component.scss',
})
export class PdfViewComponent {
  private readonly toast = inject(ToastService);
  private readonly downloads = inject(DownloadService);

  readonly file = input.required<File>();

  private readonly scroller = viewChild<ElementRef<HTMLDivElement>>('scroller');
  private readonly shell = viewChild<ElementRef<HTMLDivElement>>('shell');

  protected readonly loading = signal(true);
  protected readonly info = signal<PdfDocumentInfo | null>(null);
  protected readonly pages = signal<RenderedPage[]>([]);
  protected readonly thumbnails = signal<(string | null)[]>([]);
  protected readonly currentPage = signal(1);
  protected readonly zoom = signal(1);
  protected readonly rotation = signal(0);
  protected readonly showThumbnails = signal(true);
  protected readonly showOutline = signal(false);
  protected readonly fullscreen = signal(false);

  protected readonly needsPassword = signal(false);
  protected readonly password = signal('');
  protected readonly error = signal('');

  protected readonly searchOpen = signal(false);
  protected readonly query = signal('');
  protected readonly hits = signal<SearchHit[]>([]);
  protected readonly activeHit = signal(0);
  protected readonly searching = signal(false);

  private doc: PDFDocumentProxy | null = null;
  private textCache: PageText[] | null = null;
  private renderQueue = new Set<number>();
  private observer: IntersectionObserver | null = null;

  protected readonly pageCount = computed(() => this.info()?.pageCount ?? 0);
  protected readonly hasOutline = computed(() => (this.info()?.outline.length ?? 0) > 0);

  constructor() {
    effect(() => {
      const file = this.file();
      if (file) void this.load(file);
    });
  }

  private async load(file: File): Promise<void> {
    this.dispose();
    this.loading.set(true);
    this.error.set('');

    try {
      this.doc = await openPdf(await file.arrayBuffer(), {
        password: this.password() || undefined,
      });
      this.needsPassword.set(false);
    } catch (error) {
      this.loading.set(false);
      if (error instanceof PasswordRequiredError) {
        this.needsPassword.set(true);
        this.error.set(error.message);
        return;
      }
      this.error.set(error instanceof Error ? error.message : String(error));
      return;
    }

    const doc = this.doc;
    this.info.set(await describePdf(doc));
    this.pages.set(
      Array.from({ length: doc.numPages }, (_, index) => ({
        number: index + 1,
        canvasUrl: null,
        width: 612,
        height: 792,
      })),
    );
    this.thumbnails.set(new Array(doc.numPages).fill(null));
    this.loading.set(false);

    // First few pages eagerly, the rest on demand.
    for (let page = 1; page <= Math.min(3, doc.numPages); page++) {
      await this.renderPageAt(page);
    }
    void this.renderThumbnails(doc);
  }

  private async renderPageAt(pageNumber: number): Promise<void> {
    const doc = this.doc;
    if (!doc || this.renderQueue.has(pageNumber)) return;

    const existing = this.pages()[pageNumber - 1];
    if (existing?.canvasUrl) return;

    this.renderQueue.add(pageNumber);
    try {
      const page = await doc.getPage(pageNumber);
      const canvas = await renderPageProxy(page, {
        scale: Math.min(2, this.zoom() * (window.devicePixelRatio || 1)),
        rotation: this.rotation(),
        background: '#ffffff',
        maxDimension: 4096,
      });
      const viewport = page.getViewport({ scale: 1, rotation: this.rotation() });
      page.cleanup();

      const url = canvas.toDataURL('image/jpeg', 0.86);
      canvas.width = 0;
      canvas.height = 0;

      this.pages.update((list) =>
        list.map((item) =>
          item.number === pageNumber
            ? { ...item, canvasUrl: url, width: viewport.width, height: viewport.height }
            : item,
        ),
      );
    } catch {
      /* a page that fails to render keeps its placeholder */
    } finally {
      this.renderQueue.delete(pageNumber);
    }
  }

  private async renderThumbnails(doc: PDFDocumentProxy): Promise<void> {
    for (let index = 1; index <= doc.numPages; index++) {
      if (this.doc !== doc) return;
      try {
        const thumbnail = await renderThumbnail(doc, index, 130);
        this.thumbnails.update((list) => {
          const next = [...list];
          next[index - 1] = thumbnail;
          return next;
        });
      } catch {
        /* skip */
      }
      if (index % 5 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  /** Renders a page when its placeholder scrolls close to the viewport. */
  protected onPageVisible(pageNumber: number): void {
    this.currentPage.set(pageNumber);
    void this.renderPageAt(pageNumber);
    void this.renderPageAt(pageNumber + 1);
  }

  protected goToPage(pageNumber: number): void {
    const clamped = Math.min(Math.max(1, pageNumber), this.pageCount());
    this.currentPage.set(clamped);
    const element = this.scroller()?.nativeElement.querySelector(`#pdf-page-${clamped}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    void this.renderPageAt(clamped);
  }

  protected onPageInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(value)) this.goToPage(value);
  }

  protected rotate(): void {
    this.rotation.update((current) => (current + 90) % 360);
    // Rotation invalidates every rendered bitmap.
    this.pages.update((list) => list.map((page) => ({ ...page, canvasUrl: null })));
    void this.renderPageAt(this.currentPage());
  }

  protected toggleThumbnails(): void {
    this.showThumbnails.update((visible) => !visible);
  }

  protected toggleOutline(): void {
    this.showOutline.update((visible) => !visible);
  }

  protected async toggleFullscreen(): Promise<void> {
    const element = this.shell()?.nativeElement;
    if (!element) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        this.fullscreen.set(false);
      } else {
        await element.requestFullscreen();
        this.fullscreen.set(true);
      }
    } catch {
      this.toast.info('Fullscreen was blocked by the browser');
    }
  }

  protected toggleSearch(): void {
    this.searchOpen.update((open) => !open);
    if (!this.searchOpen()) {
      this.query.set('');
      this.hits.set([]);
    }
  }

  protected async onSearch(event: Event): Promise<void> {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);

    if (value.trim().length < 2) {
      this.hits.set([]);
      return;
    }

    const doc = this.doc;
    if (!doc) return;

    if (!this.textCache) {
      this.searching.set(true);
      // One extraction pass, reused for every subsequent query.
      this.textCache = await extractAllText(doc);
      this.searching.set(false);
    }

    const found = searchPages(this.textCache, value);
    this.hits.set(found);
    this.activeHit.set(0);
    if (found.length) this.goToPage(found[0].page);
  }

  protected nextHit(step: number): void {
    const hits = this.hits();
    if (!hits.length) return;
    const next = (this.activeHit() + step + hits.length) % hits.length;
    this.activeHit.set(next);
    this.goToPage(hits[next].page);
  }

  protected jumpToHit(index: number): void {
    this.activeHit.set(index);
    this.goToPage(this.hits()[index].page);
  }

  protected setPassword(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
  }

  protected retry(): void {
    void this.load(this.file());
  }

  protected async download(): Promise<void> {
    await this.downloads.save(this.file(), this.file().name);
  }

  protected print(): void {
    this.downloads.print(this.file());
  }

  protected pageStyle(page: RenderedPage): Record<string, string> {
    const scale = this.zoom();
    return {
      width: `${page.width * scale}px`,
      height: `${page.height * scale}px`,
    };
  }

  private dispose(): void {
    this.observer?.disconnect();
    this.observer = null;
    void closePdf(this.doc);
    this.doc = null;
    this.textCache = null;
    this.renderQueue.clear();
    this.pages.set([]);
    this.thumbnails.set([]);
    this.hits.set([]);
  }
}
