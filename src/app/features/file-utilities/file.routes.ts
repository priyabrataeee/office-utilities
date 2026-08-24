import { Routes } from '@angular/router';

/** File inspection and organisation utilities. */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../categories/category-page.component').then((m) => m.CategoryPageComponent),
    data: { categoryId: 'file' },
  },
  {
    path: 'file-metadata-viewer',
    loadComponent: () =>
      import('./file-metadata/file-metadata.component').then((m) => m.FileMetadataComponent),
  },
  {
    path: 'file-size-analyzer',
    loadComponent: () =>
      import('./size-analyzer/size-analyzer.component').then((m) => m.SizeAnalyzerComponent),
  },
  {
    path: 'file-hash-generator',
    loadComponent: () =>
      import('./hash-generator/hash-generator.component').then((m) => m.HashGeneratorComponent),
  },
  {
    path: 'file-signature-checker',
    loadComponent: () =>
      import('./signature-checker/signature-checker.component').then(
        (m) => m.SignatureCheckerComponent,
      ),
  },
  {
    path: 'duplicate-file-detector',
    loadComponent: () =>
      import('./duplicate-detector/duplicate-detector.component').then(
        (m) => m.DuplicateDetectorComponent,
      ),
  },
  {
    path: 'batch-file-rename',
    loadComponent: () =>
      import('./batch-rename/batch-rename.component').then((m) => m.BatchRenameComponent),
  },
];
