import { Routes } from '@angular/router';

/**
 * Viewer routes.
 *
 * Every format gets its own URL for SEO, and all of them resolve to the same
 * host component — which then defers in only the sub-viewer that format needs.
 */
const viewer = () =>
  import('./viewer-page/viewer-page.component').then((m) => m.ViewerPageComponent);

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../categories/category-page.component').then((m) => m.CategoryPageComponent),
    data: { categoryId: 'viewer' },
  },
  { path: 'document-viewer', loadComponent: viewer, data: { toolId: 'universal-viewer', kind: 'auto' } },
  { path: 'pdf-viewer', loadComponent: viewer, data: { toolId: 'pdf-viewer', kind: 'pdf' } },
  { path: 'word-viewer', loadComponent: viewer, data: { toolId: 'docx-viewer', kind: 'docx' } },
  { path: 'excel-viewer', loadComponent: viewer, data: { toolId: 'xlsx-viewer', kind: 'sheet' } },
  { path: 'csv-viewer', loadComponent: viewer, data: { toolId: 'csv-viewer', kind: 'sheet' } },
  {
    path: 'powerpoint-viewer',
    loadComponent: viewer,
    data: { toolId: 'pptx-viewer', kind: 'pptx' },
  },
  {
    path: 'markdown-viewer',
    loadComponent: viewer,
    data: { toolId: 'markdown-viewer', kind: 'markdown' },
  },
  { path: 'json-viewer', loadComponent: viewer, data: { toolId: 'json-viewer', kind: 'json' } },
  { path: 'xml-viewer', loadComponent: viewer, data: { toolId: 'xml-viewer', kind: 'xml' } },
  { path: 'text-viewer', loadComponent: viewer, data: { toolId: 'text-viewer', kind: 'text' } },
  { path: 'html-viewer', loadComponent: viewer, data: { toolId: 'html-viewer', kind: 'html' } },
];
