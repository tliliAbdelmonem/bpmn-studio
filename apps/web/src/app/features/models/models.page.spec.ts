import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BpmnModelDto } from '@bpmn-studio/shared';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { ModelsPage } from './models.page';

const model = (overrides: Partial<BpmnModelDto> = {}): BpmnModelDto => ({
  id: 'm1',
  name: 'Order',
  description: null,
  processId: 'Process_1',
  currentVersionNumber: 2,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
  ...overrides,
});

async function render(api: Partial<ApiService>) {
  TestBed.configureTestingModule({
    imports: [ModelsPage],
    providers: [provideRouter([]), { provide: ApiService, useValue: api }],
  });
  const fixture = TestBed.createComponent(ModelsPage);
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('ModelsPage', () => {
  it('lists models and flags shared process ids', async () => {
    const el = await render({
      listModels: () =>
        of([
          model(),
          model({ id: 'm2', name: 'Order copy' }),
          model({ id: 'm3', name: 'Other', processId: 'P2' }),
        ]),
    });
    const rows = el.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(3);
    expect(rows[0].textContent).toContain('Order');
    expect(rows[0].textContent).toContain('v2');
    expect(el.querySelectorAll('tbody tr span[title^="Another model"]')).toHaveLength(2);
  });

  it('shows the empty state', async () => {
    const el = await render({ listModels: () => of([]) });
    expect(el.textContent).toContain('No models yet');
  });

  it('shows the API error with a retry button', async () => {
    const el = await render({
      listModels: () =>
        throwError(() => ({ type: 'about:blank', title: 'API unreachable', status: 0 })),
    });
    expect(el.textContent).toContain('Could not load models.');
    expect(el.textContent).toContain('API unreachable');
    expect(el.textContent).toContain('Retry');
  });
});
