import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows and auto-dismisses toasts, errors staying longer', () => {
    const toasts = TestBed.inject(ToastService);
    toasts.success('saved');
    toasts.error('failed');
    expect(toasts.toasts().map((t) => t.message)).toEqual(['saved', 'failed']);

    vi.advanceTimersByTime(4000);
    expect(toasts.toasts().map((t) => t.message)).toEqual(['failed']);
    vi.advanceTimersByTime(4000);
    expect(toasts.toasts()).toEqual([]);
  });

  it('dismisses on demand', () => {
    const toasts = TestBed.inject(ToastService);
    toasts.info('hello');
    toasts.dismiss(toasts.toasts()[0].id);
    expect(toasts.toasts()).toEqual([]);
  });
});
