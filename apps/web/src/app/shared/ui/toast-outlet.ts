import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'bs-toast-outlet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end sm:pe-6"
      aria-live="polite"
    >
      @for (toast of toasts.toasts(); track toast.id) {
        <div
          role="status"
          [attr.data-kind]="toast.kind"
          class="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-white px-4 py-3 text-sm shadow-lg data-[kind=error]:border-rose-200 data-[kind=error]:bg-rose-50 data-[kind=error]:text-rose-900 data-[kind=success]:border-emerald-200 data-[kind=success]:bg-emerald-50 data-[kind=success]:text-emerald-900"
        >
          <p class="flex-1">{{ toast.message }}</p>
          <button
            type="button"
            class="text-current opacity-60 hover:opacity-100"
            aria-label="Dismiss"
            (click)="toasts.dismiss(toast.id)"
          >
            ✕
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastOutlet {
  protected readonly toasts = inject(ToastService);
}
