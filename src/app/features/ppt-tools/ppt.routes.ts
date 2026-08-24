import { Routes } from '@angular/router';

/** PowerPoint toolkit. Export to PDF and images share one component. */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../categories/category-page.component').then((m) => m.CategoryPageComponent),
    data: { categoryId: 'powerpoint' },
  },
  {
    path: 'pptx-creator',
    loadComponent: () =>
      import('./pptx-creator/pptx-creator.component').then((m) => m.PptxCreatorComponent),
  },
  {
    path: 'powerpoint-to-pdf',
    loadComponent: () =>
      import('./pptx-export/pptx-export.component').then((m) => m.PptxExportComponent),
    data: { toolId: 'pptx-to-pdf', target: 'pdf' },
  },
  {
    path: 'powerpoint-to-images',
    loadComponent: () =>
      import('./pptx-export/pptx-export.component').then((m) => m.PptxExportComponent),
    data: { toolId: 'pptx-to-images', target: 'images' },
  },
  {
    path: 'extract-text-from-powerpoint',
    loadComponent: () =>
      import('./pptx-text/pptx-text.component').then((m) => m.PptxTextComponent),
  },
  {
    path: 'extract-images-from-powerpoint',
    loadComponent: () =>
      import('./pptx-media/pptx-media.component').then((m) => m.PptxMediaComponent),
  },
  {
    path: 'slide-selector',
    loadComponent: () =>
      import('./slide-selector/slide-selector.component').then((m) => m.SlideSelectorComponent),
  },
];
