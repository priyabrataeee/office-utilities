import { Routes } from '@angular/router';

/**
 * Document generators.
 *
 * Ten documents, one component: each route supplies the generator id, and the
 * template definition drives the form, the preview and the export.
 */
const page = () =>
  import('./generator-page/generator-page.component').then((m) => m.GeneratorPageComponent);

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../categories/category-page.component').then((m) => m.CategoryPageComponent),
    data: { categoryId: 'generate' },
  },
  { path: 'invoice-generator', loadComponent: page, data: { toolId: 'invoice-generator' } },
  { path: 'resume-builder', loadComponent: page, data: { toolId: 'resume-builder' } },
  { path: 'quotation-generator', loadComponent: page, data: { toolId: 'quotation-generator' } },
  { path: 'certificate-generator', loadComponent: page, data: { toolId: 'certificate-generator' } },
  {
    path: 'meeting-minutes-generator',
    loadComponent: page,
    data: { toolId: 'meeting-minutes-generator' },
  },
  {
    path: 'business-proposal-generator',
    loadComponent: page,
    data: { toolId: 'business-proposal-generator' },
  },
  {
    path: 'salary-slip-generator',
    loadComponent: page,
    data: { toolId: 'salary-slip-generator' },
  },
  { path: 'offer-letter-generator', loadComponent: page, data: { toolId: 'offer-letter-generator' } },
  {
    path: 'experience-letter-generator',
    loadComponent: page,
    data: { toolId: 'experience-letter-generator' },
  },
  { path: 'cover-letter-generator', loadComponent: page, data: { toolId: 'cover-letter-generator' } },
];
