import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BpmnModelDto, ProblemDetails } from '@bpmn-studio/shared';
import { Observable } from 'rxjs';
import { ApiService, problemMessage } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Button } from '../../shared/ui/button';
import { ConfirmDialog } from '../../shared/ui/confirm-dialog';
import { ModelFormDialog, ModelFormValue } from './model-form-dialog';

type FormState = { kind: 'create' } | { kind: 'rename'; model: BpmnModelDto };

@Component({
  selector: 'bs-models-page',
  imports: [DatePipe, RouterLink, Button, ConfirmDialog, ModelFormDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-center gap-3">
      <h1 class="me-auto text-2xl font-semibold">Models</h1>
      <label
        bsButton="secondary"
        class="has-[:disabled]:pointer-events-none has-[:disabled]:opacity-50"
      >
        Import .bpmn
        <input
          type="file"
          accept=".bpmn,.xml"
          class="sr-only"
          [disabled]="busy()"
          (change)="importFile($event)"
        />
      </label>
      <button type="button" bsButton (click)="form.set({ kind: 'create' })">New model</button>
    </div>

    @if (loading()) {
      <p class="mt-8 text-slate-500">Loading models…</p>
    } @else if (loadError(); as error) {
      <div class="mt-8 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
        <p class="font-medium">Could not load models.</p>
        <p class="mt-1">{{ error }}</p>
        <button type="button" bsButton="secondary" class="mt-3" (click)="load()">Retry</button>
      </div>
    } @else if (models().length === 0) {
      <div class="mt-8 rounded-lg border border-dashed border-slate-300 p-10 text-center">
        <p class="font-medium">No models yet</p>
        <p class="mt-1 text-sm text-slate-500">Create a new model or import a .bpmn file.</p>
      </div>
    } @else {
      <div class="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table class="w-full text-left text-sm">
          <thead
            class="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"
          >
            <tr>
              <th class="px-4 py-3 font-medium">Name</th>
              <th class="px-4 py-3 font-medium">Process id</th>
              <th class="px-4 py-3 font-medium">Version</th>
              <th class="px-4 py-3 font-medium">Updated</th>
              <th class="px-4 py-3"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            @for (model of models(); track model.id) {
              <tr class="hover:bg-slate-50">
                <td class="px-4 py-3">
                  <a
                    [routerLink]="['/models', model.id, 'versions']"
                    class="font-medium text-slate-900 hover:text-indigo-600"
                    >{{ model.name }}</a
                  >
                  @if (model.description) {
                    <p class="mt-0.5 line-clamp-1 text-slate-500">{{ model.description }}</p>
                  }
                </td>
                <td class="px-4 py-3 font-mono text-xs text-slate-600">
                  {{ model.processId }}
                  @if (model.processId && sharedProcessIds().has(model.processId)) {
                    <span
                      class="ms-1 rounded bg-amber-100 px-1.5 py-0.5 font-sans text-amber-800"
                      title="Another model uses the same process id. Camunda treats deployments of both as versions of one process."
                      >shared</span
                    >
                  }
                </td>
                <td class="px-4 py-3 text-slate-600">v{{ model.currentVersionNumber }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-slate-600">
                  {{ model.updatedAt | date: 'medium' }}
                </td>
                <td class="px-4 py-3">
                  <div class="flex justify-end gap-1">
                    <a bsButton="ghost" [routerLink]="['/models', model.id, 'versions']">History</a>
                    <button
                      type="button"
                      bsButton="ghost"
                      (click)="form.set({ kind: 'rename', model })"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      bsButton="ghost"
                      [disabled]="busy()"
                      (click)="duplicate(model)"
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      bsButton="ghost"
                      class="hover:text-rose-600"
                      (click)="pendingDelete.set(model)"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <bs-model-form-dialog
      [open]="form() !== null"
      [heading]="formHeading()"
      [submitLabel]="form()?.kind === 'rename' ? 'Save' : 'Create'"
      [initial]="formInitial()"
      [busy]="busy()"
      (submitted)="submitForm($event)"
      (cancelled)="form.set(null)"
    />

    <bs-confirm-dialog
      [open]="pendingDelete() !== null"
      heading="Delete model?"
      [message]="deleteMessage()"
      confirmLabel="Delete"
      [danger]="true"
      [busy]="busy()"
      (confirmed)="confirmDelete()"
      (cancelled)="pendingDelete.set(null)"
    />
  `,
})
export class ModelsPage {
  private readonly api = inject(ApiService);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly models = signal<BpmnModelDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly form = signal<FormState | null>(null);
  protected readonly pendingDelete = signal<BpmnModelDto | null>(null);

  protected readonly formHeading = computed(() =>
    this.form()?.kind === 'rename' ? 'Rename model' : 'New model',
  );
  protected readonly formInitial = computed((): ModelFormValue => {
    const state = this.form();
    return state?.kind === 'rename'
      ? { name: state.model.name, description: state.model.description ?? '' }
      : { name: '', description: '' };
  });
  protected readonly deleteMessage = computed(
    () => `"${this.pendingDelete()?.name}" and all its versions will be permanently deleted.`,
  );
  /** Process ids used by more than one model. */
  protected readonly sharedProcessIds = computed(() => {
    const counts = new Map<string, number>();
    for (const m of this.models()) {
      if (m.processId) counts.set(m.processId, (counts.get(m.processId) ?? 0) + 1);
    }
    return new Set([...counts].filter(([, n]) => n > 1).map(([id]) => id));
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.listModels().subscribe({
      next: (models) => {
        this.models.set(models);
        this.loading.set(false);
      },
      error: (problem: ProblemDetails) => {
        this.loadError.set(problemMessage(problem));
        this.loading.set(false);
      },
    });
  }

  protected submitForm(value: ModelFormValue): void {
    const state = this.form();
    if (!state) return;
    if (state.kind === 'create') {
      this.run(
        this.api.createModel({ name: value.name, description: value.description || undefined }),
        (model) => {
          this.form.set(null);
          this.toasts.success(`Created "${model.name}".`);
          void this.router.navigate(['/models', model.id, 'versions']);
        },
      );
    } else {
      this.run(
        this.api.updateModel(state.model.id, {
          name: value.name,
          description: value.description || null,
        }),
        (model) => {
          this.form.set(null);
          this.replace(model);
          this.toasts.success(`Saved "${model.name}".`);
        },
      );
    }
  }

  protected duplicate(model: BpmnModelDto): void {
    this.run(this.api.duplicateModel(model.id), (copy) => {
      this.models.update((list) => [copy, ...list]);
      this.toasts.success(`Created "${copy.name}".`);
    });
  }

  protected confirmDelete(): void {
    const model = this.pendingDelete();
    if (!model) return;
    this.run(this.api.deleteModel(model.id), () => {
      this.pendingDelete.set(null);
      this.models.update((list) => list.filter((m) => m.id !== model.id));
      this.toasts.success(`Deleted "${model.name}".`);
    });
  }

  protected importFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.run(this.api.importModel(file), (model) => {
      this.models.update((list) => [model, ...list]);
      this.toasts.success(`Imported "${model.name}".`);
    });
  }

  private replace(model: BpmnModelDto): void {
    this.models.update((list) => list.map((m) => (m.id === model.id ? model : m)));
  }

  private run<T>(request: Observable<T>, onSuccess: (value: T) => void): void {
    this.busy.set(true);
    request.subscribe({
      next: (value) => {
        this.busy.set(false);
        onSuccess(value);
      },
      error: (problem: ProblemDetails) => {
        this.busy.set(false);
        this.toasts.error(problemMessage(problem));
      },
    });
  }
}
