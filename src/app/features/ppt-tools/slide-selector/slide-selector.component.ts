import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolBase } from '../../../shared/tool-base';
import {
  extractSlides,
  readPresentation,
  slideToSvg,
  type Presentation,
} from '../../../core/engines/pptx.engine';
import { parsePageRanges, withSuffix } from '../../../core/utils/file.util';

/** Keeps only the chosen slides and rebuilds the .pptx around them. */
@Component({
  selector: 'app-slide-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToolShellComponent,
    FileDropZoneComponent,
    ResultPanelComponent,
    BusyOverlayComponent,
    IconComponent,
  ],
  templateUrl: './slide-selector.component.html',
  styleUrl: './slide-selector.component.scss',
})
export class SlideSelectorComponent extends ToolBase {
  private readonly sanitizer = inject(DomSanitizer);

  readonly toolId = 'slide-selector';

  protected readonly deck = signal<Presentation | null>(null);
  protected readonly selection = signal<Set<number>>(new Set());
  protected readonly rangeInput = signal('');

  protected readonly slides = computed(() => this.deck()?.slides ?? []);
  protected readonly selectedCount = computed(() => this.selection().size);
  protected readonly removedCount = computed(() => this.slides().length - this.selectedCount());

  protected readonly aspect = computed(() => {
    const deck = this.deck();
    return deck ? `${deck.width} / ${deck.height}` : '16 / 9';
  });

  protected readonly previews = computed<SafeHtml[]>(() => {
    const deck = this.deck();
    if (!deck) return [];
    return deck.slides.map((slide) =>
      this.sanitizer.bypassSecurityTrustHtml(slideToSvg(slide, deck.width, deck.height)),
    );
  });

  constructor() {
    super();
    this.acceptHandoff();
  }

  protected override afterFiles(files: File[]): void {
    const file = files[0];
    if (!file) return;
    void this.run('Reading presentation…', async () => {
      const deck = await readPresentation(file);
      this.deck.set(deck);
      this.selection.set(new Set(deck.slides.map((_, index) => index)));
    });
  }

  protected isSelected(index: number): boolean {
    return this.selection().has(index);
  }

  protected toggle(index: number): void {
    const next = new Set(this.selection());
    next.has(index) ? next.delete(index) : next.add(index);
    this.selection.set(next);
  }

  protected selectAll(): void {
    this.selection.set(new Set(this.slides().map((_, index) => index)));
  }

  protected selectNone(): void {
    this.selection.set(new Set());
  }

  protected invert(): void {
    const current = this.selection();
    this.selection.set(
      new Set(this.slides().map((_, index) => index).filter((index) => !current.has(index))),
    );
  }

  protected setRange(event: Event): void {
    this.rangeInput.set((event.target as HTMLInputElement).value);
  }

  protected applyRange(): void {
    this.selection.set(new Set(parsePageRanges(this.rangeInput(), this.slides().length)));
  }

  protected async export(): Promise<void> {
    const file = this.primaryFile();
    if (!file) return;

    const indices = [...this.selection()].sort((a, b) => a - b);
    if (!indices.length) {
      this.toast.warning('Keep at least one slide');
      return;
    }
    if (indices.length === this.slides().length) {
      this.toast.info('Every slide is selected — nothing would be removed');
      return;
    }

    const blob = await this.run('Rebuilding presentation…', () =>
      extractSlides(file, indices),
    );
    if (blob) this.setOutputs([this.output(withSuffix(file.name, '-selected'), blob)]);
  }

  protected startOver(): void {
    this.deck.set(null);
    this.selection.set(new Set());
    this.reset();
  }
}
