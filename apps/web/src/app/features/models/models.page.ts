import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Placeholder; the model list is built in Phase 3. */
@Component({
  selector: 'bs-models-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="text-2xl font-semibold">Models</h1>
    <p class="mt-2 text-slate-600">The model list arrives in Phase 3.</p>
  `,
})
export class ModelsPage {}
