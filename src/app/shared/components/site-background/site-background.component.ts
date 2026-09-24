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

const REDUCED_MOTION_SPEED = SPEED * 0.15;

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

    @media (prefers-reduced-motion: reduce) {
      .fog {
        transition: none;
      }
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
  protected readonly visible = signal(false);

  constructor() {
    if (!this.isBrowser) return;
    afterNextRender(() => this.attach());
  }

  private attach(): void {
    const canvas = this.canvasRef().nativeElement;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    const renderer = FogRenderer.create(canvas, {
      colors: this.readColors(),
      blurFactor: 0.6,
      zoom: 1,
      speed: reduced.matches ? REDUCED_MOTION_SPEED : SPEED,
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

    const onMotion = (event: MediaQueryListEvent) =>
      renderer.setSpeed(event.matches ? REDUCED_MOTION_SPEED : SPEED);
    reduced.addEventListener('change', onMotion);

    const themeWatcher = new MutationObserver(() => this.syncColors());
    themeWatcher.observe(this.doc.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    const onScheme = () => this.syncColors();
    scheme.addEventListener('change', onScheme);

    this.destroyRef.onDestroy(() => {
      observer.disconnect();
      themeWatcher.disconnect();
      this.doc.removeEventListener('visibilitychange', onVisibility);
      reduced.removeEventListener('change', onMotion);
      scheme.removeEventListener('change', onScheme);
      renderer.dispose();
      this.renderer = null;
    });
  }

  private syncColors(): void {
    requestAnimationFrame(() => this.renderer?.setColors(this.readColors()));
  }

  private readColors(): FogColors {
    const styles = getComputedStyle(this.doc.documentElement);
    const read = (name: string, fallback: string) =>
      styles.getPropertyValue(name).trim() || fallback;
    return {
      base: read('--ou-fog-base', '#fbfbfd'),
      lowlight: read('--ou-fog-lowlight', '#e4e6f7'),
      midtone: read('--ou-fog-midtone', '#dfeaf7'),
      highlight: read('--ou-fog-highlight', '#f2eefc'),
    };
  }
}
