import { Route } from '@angular/router';

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
    path: '**',
    loadComponent: () => import('./features/not-found/not-found.page').then((m) => m.NotFoundPage),
  },
];
