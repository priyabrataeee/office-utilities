import { Routes } from '@angular/router';
import { GUIDES } from '../../core/data/guide-catalog';

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
