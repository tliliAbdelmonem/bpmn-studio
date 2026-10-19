import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiService, toProblem } from './api.service';

describe('ApiService', () => {
  let api: ApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests /api/health', () => {
    let status: string | undefined;
    api.getHealth().subscribe((h) => (status = h.status));
    http.expectOne('/api/health').flush({
      status: 'up',
      timestamp: '2026-01-01T00:00:00Z',
      components: { database: { status: 'up' }, camunda: { status: 'up' } },
    });
    expect(status).toBe('up');
  });

  it('keeps problem+json bodies', () => {
    const problem = toProblem(
      new HttpErrorResponse({
        status: 404,
        error: { type: 'about:blank', title: 'Not Found', status: 404, detail: 'x' },
      }),
    );
    expect(problem).toMatchObject({ title: 'Not Found', status: 404, detail: 'x' });
  });

  it('maps network errors to "API unreachable"', () => {
    expect(toProblem(new HttpErrorResponse({ status: 0 })).title).toBe('API unreachable');
  });
});
