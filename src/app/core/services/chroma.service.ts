import { DOCUMENT, Injectable, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { TOOL_CATEGORIES } from '../data/tool-catalog';
import type { ToolCategoryId } from '../models/tool.model';

const BY_SLUG = new Map<string, ToolCategoryId>(TOOL_CATEGORIES.map((c) => [c.slug, c.id]));

@Injectable({ providedIn: 'root' })
export class ChromaService {
  private readonly doc = inject(DOCUMENT);
  private readonly router = inject(Router);

  private readonly fromRoute = signal<ToolCategoryId | null>(null);
  private readonly preview = signal<ToolCategoryId | null>(null);

  constructor() {
    this.fromRoute.set(this.categoryOf(this.router.url));
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.fromRoute.set(this.categoryOf(event.urlAfterRedirects));
      }
    });

    effect(() => {
      const active = this.preview() ?? this.fromRoute();
      const root = this.doc.documentElement;
      if (active) root.setAttribute('data-chroma', active);
      else root.removeAttribute('data-chroma');
    });
  }

  show(category: ToolCategoryId | null): void {
    this.preview.set(category);
  }

  private categoryOf(url: string): ToolCategoryId | null {
    const segment = url.split(/[?#]/)[0].split('/').filter(Boolean)[0] ?? '';
    return BY_SLUG.get(segment) ?? null;
  }
}
