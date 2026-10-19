import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from './button';
import { Dialog } from './dialog';

@Component({
  selector: 'bs-confirm-dialog',
  imports: [Dialog, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <bs-dialog [open]="open()" [heading]="heading()" (closed)="cancelled.emit()">
      <p>{{ message() }}</p>
      <ng-container actions>
        <button type="button" bsButton="secondary" (click)="cancelled.emit()">Cancel</button>
        <button
          type="button"
          [bsButton]="danger() ? 'danger' : 'primary'"
          [disabled]="busy()"
          (click)="confirmed.emit()"
        >
          {{ confirmLabel() }}
        </button>
      </ng-container>
    </bs-dialog>
  `,
})
export class ConfirmDialog {
  readonly open = input.required<boolean>();
  readonly heading = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirm');
  readonly danger = input(false);
  readonly busy = input(false);
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
