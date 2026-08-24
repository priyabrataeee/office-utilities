import { Routes } from '@angular/router';

/**
 * Converters.
 *
 * Fourteen catalog entries over four components: the markup conversions all
 * share one pipeline, and the image conversions all share another.
 */
const docConvert = () =>
  import('./doc-convert/doc-convert.component').then((m) => m.DocConvertComponent);
const imageConvert = () =>
  import('./image-convert/image-convert.component').then((m) => m.ImageConvertComponent);
const dataConvert = () =>
  import('./data-convert/data-convert.component').then((m) => m.DataConvertComponent);

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../categories/category-page.component').then((m) => m.CategoryPageComponent),
    data: { categoryId: 'convert' },
  },

  {
    path: 'excel-to-pdf',
    loadComponent: () =>
      import('./sheet-to-pdf/sheet-to-pdf.component').then((m) => m.SheetToPdfComponent),
  },

  {
    path: 'markdown-to-pdf',
    loadComponent: docConvert,
    data: { toolId: 'markdown-to-pdf', source: 'markdown', target: 'pdf' },
  },
  {
    path: 'markdown-to-word',
    loadComponent: docConvert,
    data: { toolId: 'markdown-to-docx', source: 'markdown', target: 'docx' },
  },
  {
    path: 'markdown-to-html',
    loadComponent: docConvert,
    data: { toolId: 'markdown-to-html', source: 'markdown', target: 'html' },
  },
  {
    path: 'html-to-markdown',
    loadComponent: docConvert,
    data: { toolId: 'html-to-markdown', source: 'html', target: 'markdown' },
  },
  {
    path: 'html-to-pdf',
    loadComponent: docConvert,
    data: { toolId: 'html-to-pdf', source: 'html', target: 'pdf' },
  },
  {
    path: 'html-to-word',
    loadComponent: docConvert,
    data: { toolId: 'html-to-docx', source: 'html', target: 'docx' },
  },
  {
    path: 'text-to-pdf',
    loadComponent: docConvert,
    data: { toolId: 'txt-to-pdf', source: 'text', target: 'pdf' },
  },

  {
    path: 'csv-to-json',
    loadComponent: dataConvert,
    data: { toolId: 'csv-to-json', direction: 'csv-to-json' },
  },
  {
    path: 'json-to-csv',
    loadComponent: dataConvert,
    data: { toolId: 'json-to-csv', direction: 'json-to-csv' },
  },

  {
    path: 'image-converter',
    loadComponent: imageConvert,
    data: { toolId: 'image-converter', preset: 'any' },
  },
  {
    path: 'svg-to-png',
    loadComponent: imageConvert,
    data: { toolId: 'svg-to-png', preset: 'svg-to-png' },
  },
  {
    path: 'png-to-webp',
    loadComponent: imageConvert,
    data: { toolId: 'png-to-webp', preset: 'png-to-webp' },
  },
  {
    path: 'jpg-to-png',
    loadComponent: imageConvert,
    data: { toolId: 'jpg-to-png', preset: 'jpg-to-png' },
  },
];
