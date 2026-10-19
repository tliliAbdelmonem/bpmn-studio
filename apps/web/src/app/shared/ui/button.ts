import { Directive, computed, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ' +
  'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ' +
  'disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-500',
  secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  danger: 'bg-rose-600 text-white hover:bg-rose-500',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
};

/** Tailwind button styles: `<button bsButton="secondary">`. Works on <button>, <a> and <label>. */
@Directive({
  selector: '[bsButton]',
  host: { '[class]': 'classes()' },
})
export class Button {
  readonly variant = input<ButtonVariant | ''>('primary', { alias: 'bsButton' });
  protected readonly classes = computed(() => `${BASE} ${VARIANTS[this.variant() || 'primary']}`);
}
