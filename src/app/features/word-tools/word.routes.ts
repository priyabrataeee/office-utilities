import { Routes } from '@angular/router';

/** Word toolkit. The four conversions share one component. */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../categories/category-page.component').then((m) => m.CategoryPageComponent),
    data: { categoryId: 'word' },
  },
  {
    path: 'docx-creator',
    loadComponent: () =>
      import('./docx-creator/docx-creator.component').then((m) => m.DocxCreatorComponent),
  },
  {
    path: 'word-to-pdf',
    loadComponent: () =>
      import('./docx-convert/docx-convert.component').then((m) => m.DocxConvertComponent),
    data: { toolId: 'docx-to-pdf', target: 'pdf' },
  },
  {
    path: 'word-to-html',
    loadComponent: () =>
      import('./docx-convert/docx-convert.component').then((m) => m.DocxConvertComponent),
    data: { toolId: 'docx-to-html', target: 'html' },
  },
  {
    path: 'word-to-markdown',
    loadComponent: () =>
      import('./docx-convert/docx-convert.component').then((m) => m.DocxConvertComponent),
    data: { toolId: 'docx-to-markdown', target: 'markdown' },
  },
  {
    path: 'word-to-text',
    loadComponent: () =>
      import('./docx-convert/docx-convert.component').then((m) => m.DocxConvertComponent),
    data: { toolId: 'docx-to-txt', target: 'text' },
  },
  {
    path: 'extract-images-from-word',
    loadComponent: () =>
      import('./docx-images/docx-images.component').then((m) => m.DocxImagesComponent),
  },
  {
    path: 'extract-text-from-word',
    loadComponent: () =>
      import('./docx-text/docx-text.component').then((m) => m.DocxTextComponent),
  },
  {
    path: 'word-metadata-viewer',
    loadComponent: () =>
      import('./docx-metadata/docx-metadata.component').then((m) => m.DocxMetadataComponent),
  },
  {
    path: 'word-count',
    loadComponent: () =>
      import('./word-count/word-count.component').then((m) => m.WordCountComponent),
  },
  {
    path: 'compare-word-documents',
    loadComponent: () =>
      import('./docx-compare/docx-compare.component').then((m) => m.DocxCompareComponent),
  },
];
