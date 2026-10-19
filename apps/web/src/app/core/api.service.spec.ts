import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ProblemDetails } from '@bpmn-studio/shared';
import {
  ApiService,
  DownloadedFile,
  fileNameFromContentDisposition,
  problemMessage,
  toProblem,
} from './api.service';

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

  it('uses the documented model and version endpoints', () => {
    api.listModels().subscribe();
    api.createModel({ name: 'A' }).subscribe();
    api.updateModel('m1', { name: 'B' }).subscribe();
    api.deleteModel('m1').subscribe();
    api.duplicateModel('m1').subscribe();
    api.listVersions('m1').subscribe();
    api.getVersion('m1', 2).subscribe();
    api.restoreVersion('m1', 1).subscribe();

    const calls = [
      ['GET', '/api/models'],
      ['POST', '/api/models'],
      ['PATCH', '/api/models/m1'],
      ['DELETE', '/api/models/m1'],
      ['POST', '/api/models/m1/duplicate'],
      ['GET', '/api/models/m1/versions'],
      ['GET', '/api/models/m1/versions/2'],
      ['POST', '/api/models/m1/versions/1/restore'],
    ];
    for (const [method, url] of calls) {
      http.expectOne({ method, url }).flush({});
    }
  });

  it('uploads imports as multipart with a "file" field', () => {
    api.importModel(new File(['<xml />'], 'order.bpmn')).subscribe();
    const req = http.expectOne({ method: 'POST', url: '/api/models/import' });
    const body = req.request.body as FormData;
    expect((body.get('file') as File).name).toBe('order.bpmn');
    expect(body.has('name')).toBe(false);
    req.flush({});
  });

  it('downloads exports with the server file name', () => {
    let file: DownloadedFile | undefined;
    api.exportVersion('m1', 3).subscribe((f) => (file = f));
    http.expectOne('/api/models/m1/versions/3/export').flush(new Blob(['<xml />']), {
      headers: {
        'Content-Disposition': `attachment; filename="Equipe-v3.bpmn"; filename*=UTF-8''%C3%89quipe-v3.bpmn`,
      },
    });
    expect(file?.fileName).toBe('Équipe-v3.bpmn');
  });

  it('turns HTTP errors into problem details', () => {
    let problem: ProblemDetails | undefined;
    api.getModel('x').subscribe({ error: (p: ProblemDetails) => (problem = p) });
    http
      .expectOne('/api/models/x')
      .flush(
        { type: 'about:blank', title: 'Not Found', status: 404, detail: 'Model x not found.' },
        { status: 404, statusText: 'Not Found' },
      );
    expect(problem).toMatchObject({ status: 404, detail: 'Model x not found.' });
  });
});

describe('toProblem', () => {
  it('maps network errors to "API unreachable"', () => {
    expect(toProblem(new HttpErrorResponse({ status: 0 })).title).toBe('API unreachable');
  });
});

describe('fileNameFromContentDisposition', () => {
  it.each([
    [null, null],
    ['attachment', null],
    ['attachment; filename="a-v1.bpmn"', 'a-v1.bpmn'],
    [`attachment; filename="a.bpmn"; filename*=UTF-8''caf%C3%A9.bpmn`, 'café.bpmn'],
  ])('%s -> %s', (header, expected) => {
    expect(fileNameFromContentDisposition(header)).toBe(expected);
  });
});

describe('problemMessage', () => {
  it('joins detail and the first field error', () => {
    expect(
      problemMessage({
        type: 'about:blank',
        title: 'Invalid BPMN',
        status: 422,
        detail: 'Not well-formed.',
        errors: [{ message: 'unparsable content' }],
      }),
    ).toBe('Not well-formed. unparsable content');
  });
});
