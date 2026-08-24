import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { ToolShellComponent } from '../../../shared/components/tool-shell/tool-shell.component';
import { ResultPanelComponent } from '../../../shared/components/result-panel/result-panel.component';
import { BusyOverlayComponent } from '../../../shared/components/busy-overlay/busy-overlay.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToolBase } from '../../../shared/tool-base';
import { StorageService } from '../../../core/services/storage.service';
import { uid } from '../../../core/utils/file.util';

type SlideLayout = 'title' | 'title-content' | 'two-column' | 'section' | 'blank';

interface Slide {
  readonly id: string;
  layout: SlideLayout;
  title: string;
  /** Newline-separated bullets or paragraphs; each layout treats them a bit differently. */
  body: string;
  bodyRight: string;
  notes: string;
  background: string;
  accent: string;
}

interface SavedDeck {
  readonly title: string;
  readonly author: string;
  readonly widescreen: boolean;
  readonly slides: Slide[];
}

const DRAFT_KEY = 'pptx-creator-draft';

const LAYOUT_OPTIONS: readonly { value: SlideLayout; label: string; hint: string }[] = [
  { value: 'title', label: 'Title slide', hint: 'Big title with a subtitle line' },
  { value: 'title-content', label: 'Title + content', hint: 'Heading with bullet points' },
  { value: 'two-column', label: 'Two columns', hint: 'Split bullet layout' },
  { value: 'section', label: 'Section divider', hint: 'Full-bleed accent' },
  { value: 'blank', label: 'Blank', hint: 'Title only, no chrome' },
];

const STARTER: Slide[] = [
  {
    id: uid('s'),
    layout: 'title',
    title: 'Product launch — March review',
    body: 'A pragmatic look at what worked and what did not.',
    bodyRight: '',
    notes: 'Introduce yourself, one line about scope, then move on.',
    background: '#0f1220',
    accent: '#7c7cf0',
  },
  {
    id: uid('s'),
    layout: 'title-content',
    title: 'What shipped',
    body:
      'New self-service portal, replacing the 2016 build\nBilling and account journeys behind a feature flag\nAccessibility test suite blocking regressions at PR time',
    bodyRight: '',
    notes: 'Numbers on next slide.',
    background: '#ffffff',
    accent: '#5b5bd6',
  },
  {
    id: uid('s'),
    layout: 'two-column',
    title: 'The numbers',
    body: 'Median load time\n6.2 s → 1.4 s\n\nSupport tickets\n1,412 → 968 / month',
    bodyRight: 'Portal NPS\n+18 → +34\n\nCore Web Vitals\nAll green on mobile',
    notes: 'Baseline was set in March; comparison is May.',
    background: '#ffffff',
    accent: '#5b5bd6',
  },
];

/**
 * A minimal but real PowerPoint editor.
 *
 * Slides are plain data; the layout picks how the exporter arranges them.
 * Export uses pptxgenjs, which produces a valid .pptx you can open in
 * PowerPoint or Google Slides. Media-heavy layouts are deliberately out of
 * scope for v1 — this is a text-first authoring tool.
 */
@Component({
  selector: 'app-pptx-creator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolShellComponent, ResultPanelComponent, BusyOverlayComponent, IconComponent],
  templateUrl: './pptx-creator.component.html',
  styleUrl: './pptx-creator.component.scss',
})
export class PptxCreatorComponent extends ToolBase {
  private readonly storage = inject(StorageService);

  readonly toolId = 'pptx-creator';
  protected readonly layoutOptions = LAYOUT_OPTIONS;

  protected readonly title = signal('Untitled presentation');
  protected readonly author = signal('');
  protected readonly widescreen = signal(true);
  protected readonly slides = signal<Slide[]>(STARTER);
  protected readonly currentId = signal<string>(STARTER[0].id);
  protected readonly savedAt = signal<number | null>(null);

  protected readonly current = computed<Slide>(() => {
    const list = this.slides();
    return list.find((slide) => slide.id === this.currentId()) ?? list[0];
  });

  protected readonly currentIndex = computed(() => {
    const id = this.currentId();
    const index = this.slides().findIndex((slide) => slide.id === id);
    return index === -1 ? 0 : index;
  });

  protected readonly aspect = computed(() => (this.widescreen() ? '16 / 9' : '4 / 3'));

  constructor() {
    super();
    const saved = this.storage.read<SavedDeck | null>(DRAFT_KEY, null);
    if (saved?.slides?.length) {
      this.title.set(saved.title);
      this.author.set(saved.author);
      this.widescreen.set(saved.widescreen);
      this.slides.set(saved.slides.map((slide) => ({ ...slide })));
      this.currentId.set(saved.slides[0].id);
    }

    effect(() => {
      const snapshot: SavedDeck = {
        title: this.title(),
        author: this.author(),
        widescreen: this.widescreen(),
        slides: this.slides(),
      };
      untracked(() => {
        this.storage.write(DRAFT_KEY, snapshot);
        this.savedAt.set(Date.now());
      });
    });
  }

  /* ---------------- slide management ---------------- */

  protected select(id: string): void {
    this.currentId.set(id);
  }

  protected addSlide(after?: number): void {
    const insertAt = typeof after === 'number' ? after + 1 : this.slides().length;
    const template = this.current();
    const blank: Slide = {
      id: uid('s'),
      layout: 'title-content',
      title: 'New slide',
      body: '',
      bodyRight: '',
      notes: '',
      background: template.background,
      accent: template.accent,
    };
    this.slides.update((list) => {
      const next = [...list];
      next.splice(insertAt, 0, blank);
      return next;
    });
    this.currentId.set(blank.id);
  }

  protected duplicateCurrent(): void {
    const slide = this.current();
    const copy: Slide = { ...slide, id: uid('s'), title: `${slide.title} (copy)` };
    this.slides.update((list) => {
      const index = list.findIndex((s) => s.id === slide.id);
      const next = [...list];
      next.splice(index + 1, 0, copy);
      return next;
    });
    this.currentId.set(copy.id);
  }

  protected removeCurrent(): void {
    const list = this.slides();
    if (list.length <= 1) {
      this.toast.info('A deck needs at least one slide');
      return;
    }
    const index = list.findIndex((slide) => slide.id === this.currentId());
    const next = list.filter((slide) => slide.id !== this.currentId());
    this.slides.set(next);
    this.currentId.set(next[Math.min(index, next.length - 1)].id);
  }

  protected move(delta: number): void {
    const list = this.slides();
    const index = list.findIndex((slide) => slide.id === this.currentId());
    const target = index + delta;
    if (index === -1 || target < 0 || target >= list.length) return;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    this.slides.set(next);
  }

  /* ---------------- editing ---------------- */

  protected setTitle(event: Event): void {
    this.title.set((event.target as HTMLInputElement).value);
  }

  protected setAuthor(event: Event): void {
    this.author.set((event.target as HTMLInputElement).value);
  }

  protected toggleWidescreen(event: Event): void {
    this.widescreen.set((event.target as HTMLInputElement).checked);
  }

  protected updateCurrent(field: keyof Slide, event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const value = target.value;
    this.slides.update((list) =>
      list.map((slide) =>
        slide.id === this.currentId() ? { ...slide, [field]: value } : slide,
      ),
    );
  }

  protected clearAll(): void {
    this.slides.set([
      {
        id: uid('s'),
        layout: 'title',
        title: 'Untitled slide',
        body: '',
        bodyRight: '',
        notes: '',
        background: '#ffffff',
        accent: '#5b5bd6',
      },
    ]);
    this.title.set('Untitled presentation');
    this.currentId.set(this.slides()[0].id);
  }

  protected discardDraft(): void {
    this.storage.remove(DRAFT_KEY);
    this.clearAll();
    this.savedAt.set(null);
  }

  /* ---------------- preview helpers ---------------- */

  protected bodyLines(text: string): string[] {
    return text.split(/\n/).map((line) => line.trim()).filter(Boolean);
  }

  protected layoutLabel(layout: SlideLayout): string {
    return LAYOUT_OPTIONS.find((option) => option.value === layout)?.label ?? layout;
  }

  /** Chooses a readable text colour for the current slide's background. */
  protected textColourFor(background: string): string {
    return isDark(background) ? '#f5f6fb' : '#16181f';
  }

  protected mutedColourFor(background: string): string {
    return isDark(background) ? '#c7cbe0' : '#5b6274';
  }

  /* ---------------- export ---------------- */

  protected async downloadPptx(): Promise<void> {
    if (!this.slides().length) return;

    const blob = await this.run('Building presentation…', async () => {
      // pptxgenjs is a CJS-friendly ESM module; import it as default.
      const PptxGenJS = (await import('pptxgenjs')).default;
      const pres = new PptxGenJS();
      pres.layout = this.widescreen() ? 'LAYOUT_WIDE' : 'LAYOUT_4x3';
      pres.title = this.title();
      pres.author = this.author() || 'Office Utilities';
      pres.company = 'Office Utilities';

      const width = this.widescreen() ? 13.333 : 10;
      const height = this.widescreen() ? 7.5 : 7.5;
      // 4:3 is 10 x 7.5 inches; widescreen is 13.333 x 7.5. We author within
      // those coordinates so text sits where the preview showed it.

      for (const slide of this.slides()) {
        const s = pres.addSlide();
        s.background = { color: normaliseColor(slide.background) };
        if (slide.notes) s.addNotes(slide.notes);

        const text = this.textColourFor(slide.background);
        const muted = this.mutedColourFor(slide.background);
        const accent = normaliseColor(slide.accent);

        switch (slide.layout) {
          case 'title':
            s.addText(slide.title || '', {
              x: 0.6,
              y: height / 2 - 1.4,
              w: width - 1.2,
              h: 2,
              fontSize: 44,
              bold: true,
              color: text,
              fontFace: 'Calibri',
              valign: 'bottom',
            });
            if (slide.body) {
              s.addText(slide.body, {
                x: 0.6,
                y: height / 2 + 0.7,
                w: width - 1.2,
                h: 1.5,
                fontSize: 20,
                color: muted,
                fontFace: 'Calibri',
              });
            }
            s.addShape(pres.ShapeType.rect, {
              x: 0.6,
              y: height / 2 + 0.5,
              w: 0.8,
              h: 0.06,
              fill: { color: accent },
              line: { color: accent, width: 0 },
            });
            break;

          case 'section':
            s.background = { color: accent };
            s.addText(slide.title || '', {
              x: 0.6,
              y: 0.6,
              w: width - 1.2,
              h: height - 1.2,
              fontSize: 54,
              bold: true,
              color: 'FFFFFF',
              fontFace: 'Calibri',
              align: 'left',
              valign: 'middle',
            });
            if (slide.body) {
              s.addText(slide.body, {
                x: 0.6,
                y: height - 1.6,
                w: width - 1.2,
                h: 0.8,
                fontSize: 18,
                color: 'FFFFFFCC',
                fontFace: 'Calibri',
              });
            }
            break;

          case 'blank':
            s.addText(slide.title || '', {
              x: 0.6,
              y: 0.4,
              w: width - 1.2,
              h: 0.8,
              fontSize: 24,
              bold: true,
              color: text,
              fontFace: 'Calibri',
            });
            break;

          case 'two-column': {
            addSlideChrome(s, slide, { width, text, accent });
            const columnWidth = (width - 1.6) / 2;
            s.addText(bulletsFor(slide.body), {
              x: 0.6,
              y: 1.6,
              w: columnWidth,
              h: height - 2.2,
              fontSize: 18,
              color: text,
              fontFace: 'Calibri',
              valign: 'top',
              paraSpaceAfter: 6,
            });
            s.addText(bulletsFor(slide.bodyRight), {
              x: 0.6 + columnWidth + 0.4,
              y: 1.6,
              w: columnWidth,
              h: height - 2.2,
              fontSize: 18,
              color: text,
              fontFace: 'Calibri',
              valign: 'top',
              paraSpaceAfter: 6,
            });
            break;
          }

          default: {
            addSlideChrome(s, slide, { width, text, accent });
            s.addText(bulletsFor(slide.body), {
              x: 0.6,
              y: 1.6,
              w: width - 1.2,
              h: height - 2.2,
              fontSize: 20,
              color: text,
              fontFace: 'Calibri',
              valign: 'top',
              paraSpaceAfter: 8,
            });
          }
        }
      }

      // pptxgenjs writes to a Blob in the browser when we ask for 'blob'.
      const output = (await pres.write({ outputType: 'blob' })) as Blob;
      return output;
    });

    if (blob)
      this.setOutputs([
        this.output(`${filename(this.title())}.pptx`, blob),
      ]);
  }

  protected startOver(): void {
    this.clearOutputs();
  }
}

/** Adds the header strip and title band shared by content layouts. */
function addSlideChrome(
  slide: import('pptxgenjs').default.Slide,
  data: Slide,
  ctx: { width: number; text: string; accent: string },
): void {
  slide.addShape('rect' as never, {
    x: 0,
    y: 0,
    w: ctx.width,
    h: 0.14,
    fill: { color: ctx.accent },
    line: { color: ctx.accent, width: 0 },
  });
  slide.addText(data.title || '', {
    x: 0.6,
    y: 0.5,
    w: ctx.width - 1.2,
    h: 0.9,
    fontSize: 30,
    bold: true,
    color: ctx.text,
    fontFace: 'Calibri',
  });
}

function bulletsFor(text: string): { text: string; options?: { bullet?: boolean } }[] {
  return text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      text: line,
      options: line ? { bullet: true } : {},
    }));
}

function isDark(hex: string): boolean {
  const value = hex.replace('#', '').padEnd(6, '0').slice(0, 6);
  const int = Number.parseInt(value, 16);
  if (Number.isNaN(int)) return false;
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
}

function normaliseColor(hex: string): string {
  return hex.replace('#', '').padEnd(6, '0').slice(0, 6).toUpperCase();
}

function filename(title: string): string {
  const stem = title.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return stem || 'presentation';
}
