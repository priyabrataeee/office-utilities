import {
  Directive,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  afterNextRender,
  inject,
  input,
  output,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[appInView]',
})
export class InViewDirective implements OnDestroy {
  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly rootMargin = input('600px');
  readonly once = input(false);

  readonly appInView = output<void>();

  private observer: IntersectionObserver | null = null;

  constructor() {
    afterNextRender(() => {
      if (!this.isBrowser || typeof IntersectionObserver === 'undefined') {
        this.appInView.emit();
        return;
      }

      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            this.appInView.emit();
            if (this.once()) this.disconnect();
          }
        },
        { rootMargin: this.rootMargin(), threshold: 0.01 },
      );
      this.observer.observe(this.element.nativeElement);
    });
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  private disconnect(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}
