import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';

/**
 * A native <dialog> shown modally while `open` is true. Esc, the backdrop and the
 * close button emit `closed`; the parent decides whether to flip `open`.
 */
@Component({
  selector: 'bs-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Backdrop clicks are a mouse shortcut; keyboard users close with Esc (native cancel event).
  template: `
    <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
    <dialog
      #dialog
      class="m-auto w-full max-w-md rounded-xl p-0 shadow-xl backdrop:bg-slate-900/40"
      [attr.aria-labelledby]="titleId"
      (cancel)="$event.preventDefault(); closed.emit()"
      (click)="onBackdropClick($event)"
    >
      <div class="p-6">
        <h2 [id]="titleId" class="text-lg font-semibold">{{ heading() }}</h2>
        <div class="mt-3 text-sm text-slate-600">
          <ng-content />
        </div>
        <div class="mt-6 flex justify-end gap-2">
          <ng-content select="[actions]" />
        </div>
      </div>
    </dialog>
  `,
})
export class Dialog {
  private static nextId = 0;

  readonly open = input.required<boolean>();
  readonly heading = input.required<string>();
  readonly closed = output<void>();

  protected readonly titleId = `bs-dialog-title-${Dialog.nextId++}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const el = this.dialog().nativeElement;
      if (this.open() && !el.open) el.showModal();
      if (!this.open() && el.open) el.close();
    });
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.closed.emit();
  }
}
