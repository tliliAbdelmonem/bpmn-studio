import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppHeader } from './layout/app-header';
import { ToastOutlet } from './shared/ui/toast-outlet';

@Component({
  selector: 'bs-root',
  imports: [RouterOutlet, AppHeader, ToastOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-full flex-col' },
  template: `
    <bs-app-header />
    <main class="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
      <router-outlet />
    </main>
    <bs-toast-outlet />
  `,
})
export class App {}
