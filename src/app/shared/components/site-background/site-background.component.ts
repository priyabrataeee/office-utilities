import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ThemeService } from '../../../core/services/theme.service';
import { FogRenderer, type FogColors } from '../../../core/engines/fog.engine';

const SPEED = 3.5;

const FOLLOW_MS = 1100;

const TOKENS = ['--ou-fog-base', '--ou-fog-lowlight', '--ou-fog-midtone', '--ou-fog-highlight'];

@Component({
  selector: 'app-site-background',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #canvas class="fog" [class.fog--on]="visible()" aria-hidden="true"></canvas>`,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
      display: block;
      overflow: hidden;
      contain: layout paint size;
      pointer-events: none;
      background: var(--ou-bg);
    }

    .fog {
      display: block;
      width: 100%;
      height: 100%;
      opacity: 0;
      transition: opacity 900ms ease;
    }

    .fog--on {
      opacity: 1;
    }

    @media print {
      :host {
        display: none;
      }
    }
  `,
})
export class SiteBackgroundComponent {
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly doc = inject(DOCUMENT);
  private readonly theme = inject(ThemeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private renderer: FogRenderer | null = null;
  private probe: HTMLElement | null = null;
  private swatch: CanvasRenderingContext2D | null = null;
  private followUntil = 0;
  private following = 0;
  protected readonly visible = signal(false);

  constructor() {
    if (!this.isBrowser) return;
    afterNextRender(() => this.attach());
  }

  private attach(): void {
    const canvas = this.canvasRef().nativeElement;

    this.probe = this.doc.createElement('i');
    this.probe.style.display = 'none';
    this.el.nativeElement.appendChild(this.probe);
    const swatch = this.doc.createElement('canvas');
    swatch.width = swatch.height = 1;
    this.swatch = swatch.getContext('2d', { willReadFrequently: true });

    const renderer = FogRenderer.create(canvas, {
      colors: this.readColors(),
      blurFactor: 0.6,
      zoom: 1,
      speed: SPEED,
      fps: 30,
      downscale: window.innerWidth < 768 ? 3 : 2,
    });

    if (!renderer) return;
    this.renderer = renderer;

    renderer.onAvailabilityChange = (available) => {
      this.visible.set(available);
      if (available) {
        renderer.resize();
        renderer.setColors(this.readColors());
        renderer.play();
      }
    };

    renderer.resize();
    renderer.play();
    this.visible.set(true);

    const observer = new ResizeObserver(() => renderer.resize());
    observer.observe(this.el.nativeElement);

    const onVisibility = () => {
      if (this.doc.hidden) renderer.pause();
      else renderer.play();
    };
    this.doc.addEventListener('visibilitychange', onVisibility);

    const themeWatcher = new MutationObserver(() => this.syncColors());
    themeWatcher.observe(this.doc.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-chroma'],
    });
    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    const onScheme = () => this.syncColors();
    scheme.addEventListener('change', onScheme);

    this.destroyRef.onDestroy(() => {
      observer.disconnect();
      themeWatcher.disconnect();
      this.doc.removeEventListener('visibilitychange', onVisibility);
      scheme.removeEventListener('change', onScheme);
      renderer.dispose();
      this.renderer = null;
    });
  }

  private syncColors(): void {
    this.followUntil = performance.now() + FOLLOW_MS;
    if (this.following) return;
    const step = () => {
      this.renderer?.setColors(this.readColors());
      this.following = performance.now() < this.followUntil ? requestAnimationFrame(step) : 0;
    };
    this.following = requestAnimationFrame(step);
    setTimeout(() => this.renderer?.setColors(this.readColors()), FOLLOW_MS + 60);
  }

  private readColors(): FogColors {
    const [base, lowlight, midtone, highlight] = TOKENS.map((token) => this.resolve(token));
    return { base, lowlight, midtone, highlight };
  }

  private resolve(token: string): string {
    const probe = this.probe;
    const swatch = this.swatch;
    if (!probe || !swatch) return '#808080';
    probe.style.color = `var(${token})`;
    swatch.clearRect(0, 0, 1, 1);
    swatch.fillStyle = '#808080';
    swatch.fillStyle = getComputedStyle(probe).color;
    swatch.fillRect(0, 0, 1, 1);
    const [r, g, b] = swatch.getImageData(0, 0, 1, 1).data;
    return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
  }
}
