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
import { DownloadService } from '../../../core/services/download.service';
import {
  readPresentation,
  slideToSvg,
  type Presentation,
  type Slide,
} from '../../../core/engines/pptx.engine';

/** Slide reader: thumbnail rail, notes, keyboard navigation and presenting. */
@Component({
  selector: 'app-pptx-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './pptx-view.component.html',
  styleUrl: './pptx-view.component.scss',
  host: {
    '(document:keydown)': 'onKey($event)',
  },
})
export class PptxViewComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly downloads = inject(DownloadService);

  readonly file = input.required<File>();

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly deck = signal<Presentation | null>(null);
  protected readonly current = signal(0);
  protected readonly showNotes = signal(true);

  protected readonly slides = computed(() => this.deck()?.slides ?? []);
  protected readonly count = computed(() => this.slides().length);
  protected readonly activeSlide = computed<Slide | null>(
    () => this.slides()[this.current()] ?? null,
  );

  protected readonly aspect = computed(() => {
    const deck = this.deck();
    return deck ? `${deck.width} / ${deck.height}` : '16 / 9';
  });

  /** Rendered SVG for the slide on screen. Regenerated only when it changes. */
  protected readonly currentSvg = computed<SafeHtml | null>(() => {
    const deck = this.deck();
    const slide = this.activeSlide();
    if (!deck || !slide) return null;
    return this.sanitizer.bypassSecurityTrustHtml(
      slideToSvg(slide, deck.width, deck.height),
    );
  });

  protected readonly thumbnails = computed<SafeHtml[]>(() => {
    const deck = this.deck();
    if (!deck) return [];
    return deck.slides.map((slide) =>
      this.sanitizer.bypassSecurityTrustHtml(slideToSvg(slide, deck.width, deck.height)),
    );
  });

  constructor() {
    effect(() => {
      const file = this.file();
      if (file) void this.load(file);
    });
  }

  private async load(file: File): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    this.current.set(0);

    try {
      this.deck.set(await readPresentation(file));
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : String(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected go(index: number): void {
    this.current.set(Math.min(Math.max(0, index), Math.max(0, this.count() - 1)));
  }

  protected onKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

    if (event.key === 'ArrowRight' || event.key === 'PageDown') {
      event.preventDefault();
      this.go(this.current() + 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault();
      this.go(this.current() - 1);
    }
  }

  protected async download(): Promise<void> {
    await this.downloads.save(this.file(), this.file().name);
  }
}
