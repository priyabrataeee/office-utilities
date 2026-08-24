import { Routes } from '@angular/router';

/**
 * Diagram Studio routes.
 *
 * The plain studio route opens a fresh canvas (or restores the autosave), and
 * the type-specific routes hand the same component a starter template.
 */
const studio = () =>
  import('./studio/studio.component').then((m) => m.StudioComponent);

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../categories/category-page.component').then((m) => m.CategoryPageComponent),
    data: { categoryId: 'diagram' },
  },
  { path: 'diagram-studio', loadComponent: studio, data: { toolId: 'diagram-studio' } },
  {
    path: 'text-to-diagram',
    loadComponent: () =>
      import('./text-to-diagram/text-to-diagram.component').then((m) => m.TextToDiagramComponent),
  },
  { path: 'flowchart-maker', loadComponent: studio, data: { toolId: 'flowchart-maker' } },
  { path: 'uml-diagram-tool', loadComponent: studio, data: { toolId: 'uml-diagram' } },
  { path: 'er-diagram-tool', loadComponent: studio, data: { toolId: 'er-diagram' } },
  {
    path: 'aws-architecture-diagram',
    loadComponent: studio,
    data: { toolId: 'aws-architecture-diagram' },
  },
  { path: 'network-diagram-tool', loadComponent: studio, data: { toolId: 'network-diagram' } },
  { path: 'mind-map-maker', loadComponent: studio, data: { toolId: 'mind-map' } },
  { path: 'org-chart-maker', loadComponent: studio, data: { toolId: 'org-chart' } },
  {
    path: 'process-diagram-maker',
    loadComponent: studio,
    data: { toolId: 'process-diagram' },
  },
];
