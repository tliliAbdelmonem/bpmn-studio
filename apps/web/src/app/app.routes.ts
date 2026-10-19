import { Route } from '@angular/router';
import { unsavedChangesGuard } from './features/model-editor/unsaved-changes.guard';

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'models' },
  {
    path: 'models',
    loadComponent: () => import('./features/models/models.page').then((m) => m.ModelsPage),
  },
  {
    path: 'models/:id/versions',
    loadComponent: () =>
      import('./features/model-versions/model-versions.page').then((m) => m.ModelVersionsPage),
  },
  {
    path: 'models/:id/edit',
    loadComponent: () =>
      import('./features/model-editor/model-editor.page').then((m) => m.ModelEditorPage),
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found.page').then((m) => m.NotFoundPage),
  },
];
