import { Routes } from '@angular/router';

/**
 * Excel & CSV routes.
 *
 * Ten catalog entries, five components: the conversion, cleaning and profiling
 * tools each differ only by a mode supplied in route data.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../categories/category-page.component').then((m) => m.CategoryPageComponent),
    data: { categoryId: 'excel' },
  },
  {
    path: 'xlsx-creator',
    loadComponent: () =>
      import('./sheet-creator/sheet-creator.component').then((m) => m.SheetCreatorComponent),
  },
  {
    path: 'excel-to-csv',
    loadComponent: () =>
      import('./sheet-export/sheet-export.component').then((m) => m.SheetExportComponent),
    data: { toolId: 'excel-to-csv', target: 'csv' },
  },
  {
    path: 'excel-to-json',
    loadComponent: () =>
      import('./sheet-export/sheet-export.component').then((m) => m.SheetExportComponent),
    data: { toolId: 'excel-to-json', target: 'json' },
  },
  {
    path: 'csv-to-excel',
    loadComponent: () =>
      import('./sheet-import/sheet-import.component').then((m) => m.SheetImportComponent),
    data: { toolId: 'csv-to-excel', source: 'csv' },
  },
  {
    path: 'json-to-excel',
    loadComponent: () =>
      import('./sheet-import/sheet-import.component').then((m) => m.SheetImportComponent),
    data: { toolId: 'json-to-excel', source: 'json' },
  },
  {
    path: 'spreadsheet-cleaner',
    loadComponent: () =>
      import('./sheet-clean/sheet-clean.component').then((m) => m.SheetCleanComponent),
    data: { toolId: 'spreadsheet-cleaner', mode: 'clean' },
  },
  {
    path: 'remove-duplicate-rows',
    loadComponent: () =>
      import('./sheet-clean/sheet-clean.component').then((m) => m.SheetCleanComponent),
    data: { toolId: 'remove-duplicate-rows', mode: 'duplicates' },
  },
  {
    path: 'remove-blank-rows',
    loadComponent: () =>
      import('./sheet-clean/sheet-clean.component').then((m) => m.SheetCleanComponent),
    data: { toolId: 'remove-blank-rows', mode: 'blanks' },
  },
  {
    path: 'excel-formula-viewer',
    loadComponent: () =>
      import('./formula-viewer/formula-viewer.component').then((m) => m.FormulaViewerComponent),
  },
  {
    path: 'column-statistics',
    loadComponent: () =>
      import('./column-profile/column-profile.component').then((m) => m.ColumnProfileComponent),
    data: { toolId: 'column-statistics', mode: 'stats' },
  },
  {
    path: 'data-type-detection',
    loadComponent: () =>
      import('./column-profile/column-profile.component').then((m) => m.ColumnProfileComponent),
    data: { toolId: 'data-type-detection', mode: 'types' },
  },
];
