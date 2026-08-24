import { Routes } from '@angular/router';

/**
 * Root routing table.
 *
 * Every feature is its own lazily-loaded chunk, and every category owns a URL
 * prefix that matches its catalog slug — so a tool's canonical URL is derived
 * from the same data that renders its card.
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'tools',
    loadComponent: () =>
      import('./features/all-tools/all-tools.component').then((m) => m.AllToolsComponent),
  },
  {
    path: 'categories',
    loadComponent: () =>
      import('./features/categories/categories.component').then((m) => m.CategoriesComponent),
  },
  {
    path: 'favorites',
    loadComponent: () =>
      import('./features/favorites/favorites.component').then((m) => m.FavoritesComponent),
  },
  {
    path: 'recent',
    loadComponent: () =>
      import('./features/recent/recent.component').then((m) => m.RecentComponent),
  },
  {
    path: 'about',
    loadComponent: () => import('./features/about/about.component').then((m) => m.AboutComponent),
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./features/privacy/privacy.component').then((m) => m.PrivacyComponent),
  },

  /* --- tool categories, each a separate chunk --- */
  {
    path: 'view',
    loadChildren: () => import('./features/document-viewer/viewer.routes').then((m) => m.routes),
  },
  {
    path: 'pdf',
    loadChildren: () => import('./features/pdf-tools/pdf.routes').then((m) => m.routes),
  },
  {
    path: 'word',
    loadChildren: () => import('./features/word-tools/word.routes').then((m) => m.routes),
  },
  {
    path: 'excel',
    loadChildren: () => import('./features/excel-tools/excel.routes').then((m) => m.routes),
  },
  {
    path: 'powerpoint',
    loadChildren: () => import('./features/ppt-tools/ppt.routes').then((m) => m.routes),
  },
  {
    path: 'convert',
    loadChildren: () => import('./features/converters/converters.routes').then((m) => m.routes),
  },
  {
    path: 'generate',
    loadChildren: () => import('./features/generators/generators.routes').then((m) => m.routes),
  },
  {
    path: 'diagram',
    loadChildren: () => import('./features/diagram-studio/diagram.routes').then((m) => m.routes),
  },
  {
    path: 'file',
    loadChildren: () => import('./features/file-utilities/file.routes').then((m) => m.routes),
  },

  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
