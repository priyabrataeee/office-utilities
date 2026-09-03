import { Routes } from '@angular/router';
import { GUIDES } from '../../core/data/guide-catalog';

/**
 * Guide routes.
 *
 * One explicit route per guide rather than a `:slug` parameter, so the
 * prerenderer discovers every article without a route-parameter manifest and
 * each one is emitted as a real static page.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./guides-index/guides-index.component').then((m) => m.GuidesIndexComponent),
  },
  ...GUIDES.map((guide) => ({
    path: guide.slug,
    loadComponent: () =>
      import('./guide-page/guide-page.component').then((m) => m.GuidePageComponent),
    data: { slug: guide.slug },
  })),
];
