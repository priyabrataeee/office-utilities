import { Routes } from '@angular/router';

/**
 * PDF toolkit routes.
 *
 * Several tools share one component and differ only by route data — the page
 * organiser in particular backs rotate, delete, reorder and extract, because
 * they are the same interaction with a different default action.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../categories/category-page.component').then((m) => m.CategoryPageComponent),
    data: { categoryId: 'pdf' },
  },
  {
    path: 'pdf-to-word',
    loadComponent: () =>
      import('./pdf-extract/pdf-extract.component').then((m) => m.PdfExtractComponent),
    data: { toolId: 'pdf-to-word', target: 'docx' },
  },
  {
    path: 'pdf-to-text',
    loadComponent: () =>
      import('./pdf-extract/pdf-extract.component').then((m) => m.PdfExtractComponent),
    data: { toolId: 'pdf-to-text', target: 'text' },
  },
  {
    path: 'merge-pdf',
    loadComponent: () => import('./merge-pdf/merge-pdf.component').then((m) => m.MergePdfComponent),
  },
  {
    path: 'split-pdf',
    loadComponent: () => import('./split-pdf/split-pdf.component').then((m) => m.SplitPdfComponent),
  },
  {
    path: 'organize-pdf',
    loadComponent: () =>
      import('./page-organizer/page-organizer.component').then((m) => m.PageOrganizerComponent),
    data: { toolId: 'organize-pdf', mode: 'organize' },
  },
  {
    path: 'rotate-pdf',
    loadComponent: () =>
      import('./page-organizer/page-organizer.component').then((m) => m.PageOrganizerComponent),
    data: { toolId: 'rotate-pdf', mode: 'rotate' },
  },
  {
    path: 'delete-pages-from-pdf',
    loadComponent: () =>
      import('./page-organizer/page-organizer.component').then((m) => m.PageOrganizerComponent),
    data: { toolId: 'delete-pdf-pages', mode: 'delete' },
  },
  {
    path: 'reorder-pdf-pages',
    loadComponent: () =>
      import('./page-organizer/page-organizer.component').then((m) => m.PageOrganizerComponent),
    data: { toolId: 'reorder-pdf-pages', mode: 'reorder' },
  },
  {
    path: 'extract-pdf-pages',
    loadComponent: () =>
      import('./page-organizer/page-organizer.component').then((m) => m.PageOrganizerComponent),
    data: { toolId: 'extract-pdf-pages', mode: 'extract' },
  },
  {
    path: 'compress-pdf',
    loadComponent: () =>
      import('./compress-pdf/compress-pdf.component').then((m) => m.CompressPdfComponent),
  },
  {
    path: 'images-to-pdf',
    loadComponent: () =>
      import('./images-to-pdf/images-to-pdf.component').then((m) => m.ImagesToPdfComponent),
  },
  {
    path: 'pdf-to-images',
    loadComponent: () =>
      import('./pdf-to-images/pdf-to-images.component').then((m) => m.PdfToImagesComponent),
  },
  {
    path: 'add-watermark-to-pdf',
    loadComponent: () =>
      import('./watermark/watermark.component').then((m) => m.WatermarkComponent),
  },
  {
    path: 'remove-watermark-from-pdf',
    loadComponent: () =>
      import('./remove-watermark/remove-watermark.component').then(
        (m) => m.RemoveWatermarkComponent,
      ),
  },
  {
    path: 'protect-pdf',
    loadComponent: () =>
      import('./protect-pdf/protect-pdf.component').then((m) => m.ProtectPdfComponent),
  },
  {
    path: 'unlock-pdf',
    loadComponent: () =>
      import('./unlock-pdf/unlock-pdf.component').then((m) => m.UnlockPdfComponent),
  },
];
