import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'bs-not-found-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="text-2xl font-semibold">Page not found</h1>
    <a routerLink="/models" class="mt-4 inline-block text-indigo-600 hover:underline"
      >Back to models</a
    >
  `,
})
export class NotFoundPage {}
