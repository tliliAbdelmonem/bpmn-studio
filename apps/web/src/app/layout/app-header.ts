import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ApiService } from '../core/api.service';

type ApiState = 'checking' | 'up' | 'degraded' | 'down';

@Component({
  selector: 'bs-app-header',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="border-b border-slate-200 bg-white">
      <div class="mx-auto flex h-14 max-w-7xl items-center gap-8 px-6">
        <a routerLink="/" class="text-lg font-semibold tracking-tight">BPMN Studio</a>
        <nav class="flex gap-4 text-sm">
          <a
            routerLink="/models"
            routerLinkActive
            ariaCurrentWhenActive="page"
            class="text-slate-600 hover:text-slate-900 aria-[current=page]:font-medium aria-[current=page]:text-indigo-600"
            >Models</a
          >
        </nav>
        <span
          class="group ms-auto inline-flex items-center gap-2 text-xs text-slate-500"
          [attr.data-state]="apiState()"
        >
          <span
            class="size-2 rounded-full bg-slate-300 group-data-[state=up]:bg-emerald-500 group-data-[state=degraded]:bg-amber-500 group-data-[state=down]:bg-rose-500"
          ></span>
          @switch (apiState()) {
            @case ('checking') {
              Checking API…
            }
            @case ('up') {
              API connected
            }
            @case ('degraded') {
              API up, Camunda unreachable
            }
            @case ('down') {
              API unreachable
            }
          }
        </span>
      </div>
    </header>
  `,
})
export class AppHeader {
  private readonly api = inject(ApiService);

  protected readonly apiState = toSignal(
    this.api.getHealth().pipe(
      map(
        (health): ApiState =>
          health.status !== 'up'
            ? 'down'
            : health.components.camunda.status === 'up'
              ? 'up'
              : 'degraded',
      ),
      catchError(() => of<ApiState>('down')),
    ),
    { initialValue: 'checking' as ApiState },
  );
}
