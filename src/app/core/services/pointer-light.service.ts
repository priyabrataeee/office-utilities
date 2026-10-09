import { DOCUMENT, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const LIT = '.card, .dz, .head, .ou-card, .lit';

@Injectable({ providedIn: 'root' })
export class PointerLightService {
  private readonly doc = inject(DOCUMENT);

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    const view = this.doc.defaultView;
    if (!view || !view.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let frame = 0;
    let last: PointerEvent | null = null;

    const paint = () => {
      frame = 0;
      const event = last;
      if (!event) return;
      const target = (event.target as Element | null)?.closest?.(LIT) as HTMLElement | null;
      if (!target) return;
      const box = target.getBoundingClientRect();
      target.style.setProperty('--px', `${event.clientX - box.left}px`);
      target.style.setProperty('--py', `${event.clientY - box.top}px`);
    };

    this.doc.addEventListener(
      'pointermove',
      (event) => {
        last = event;
        if (!frame) frame = view.requestAnimationFrame(paint);
      },
      { passive: true },
    );
  }
}
