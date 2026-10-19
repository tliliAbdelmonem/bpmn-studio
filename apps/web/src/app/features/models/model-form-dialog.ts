import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { MODEL_DESCRIPTION_MAX_LENGTH, MODEL_NAME_MAX_LENGTH } from '@bpmn-studio/shared';
import { Button } from '../../shared/ui/button';
import { Dialog } from '../../shared/ui/dialog';

export interface ModelFormValue {
  name: string;
  description: string;
}

/** Create / rename form. Signal state, no ngModel. */
@Component({
  selector: 'bs-model-form-dialog',
  imports: [Dialog, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <bs-dialog [open]="open()" [heading]="heading()" (closed)="cancelled.emit()">
      <form id="model-form" class="flex flex-col gap-4" (submit)="submit($event)">
        <label class="flex flex-col gap-1">
          <span class="font-medium text-slate-700">Name</span>
          <input
            name="name"
            required
            autocomplete="off"
            [maxLength]="nameMax"
            [value]="name()"
            (input)="name.set($any($event.target).value)"
            class="rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none user-invalid:border-rose-500"
          />
        </label>
        <label class="flex flex-col gap-1">
          <span class="font-medium text-slate-700"
            >Description <span class="font-normal text-slate-400">(optional)</span></span
          >
          <textarea
            name="description"
            rows="3"
            [maxLength]="descriptionMax"
            [value]="description()"
            (input)="description.set($any($event.target).value)"
            class="rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none"
          ></textarea>
        </label>
      </form>
      <ng-container actions>
        <button type="button" bsButton="secondary" (click)="cancelled.emit()">Cancel</button>
        <button type="submit" form="model-form" bsButton [disabled]="!valid() || busy()">
          {{ submitLabel() }}
        </button>
      </ng-container>
    </bs-dialog>
  `,
})
export class ModelFormDialog {
  readonly open = input.required<boolean>();
  readonly heading = input.required<string>();
  readonly submitLabel = input('Save');
  readonly initial = input<ModelFormValue>({ name: '', description: '' });
  readonly busy = input(false);
  readonly submitted = output<ModelFormValue>();
  readonly cancelled = output<void>();

  protected readonly nameMax = MODEL_NAME_MAX_LENGTH;
  protected readonly descriptionMax = MODEL_DESCRIPTION_MAX_LENGTH;
  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly valid = computed(() => this.name().trim().length > 0);

  constructor() {
    // Reset the fields each time the dialog opens.
    effect(() => {
      if (this.open()) {
        const { name, description } = this.initial();
        this.name.set(name);
        this.description.set(description);
      }
    });
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (!this.valid() || this.busy()) return;
    this.submitted.emit({ name: this.name().trim(), description: this.description().trim() });
  }
}
