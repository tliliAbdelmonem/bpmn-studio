import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'models' },
  {
    path: 'models',
    loadComponent: () => import('./features/models/models.page').then((m) => m.ModelsPage),
  },
  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found.page').then((m) => m.NotFoundPage),
  },
];
