import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  API_PREFIX,
  BpmnModelDto,
  BpmnModelVersionDto,
  BpmnModelVersionSummaryDto,
  CreateModelRequest,
  HealthDto,
  ProblemDetails,
  UpdateModelRequest,
} from '@bpmn-studio/shared';
import { Observable, catchError, map, throwError } from 'rxjs';

export interface DownloadedFile {
  blob: Blob;
  fileName: string;
}

/**
 * The single entry point for HTTP in the web app.
 * Components and features never inject HttpClient directly (see CLAUDE.md).
 * Errors are normalized to RFC 9457 ProblemDetails.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `/${API_PREFIX}`;

  getHealth(): Observable<HealthDto> {
    return this.request(this.http.get<HealthDto>(this.url('/health')));
  }

  // --- models ---

  listModels(): Observable<BpmnModelDto[]> {
    return this.request(this.http.get<BpmnModelDto[]>(this.url('/models')));
  }

  getModel(id: string): Observable<BpmnModelDto> {
    return this.request(this.http.get<BpmnModelDto>(this.url(`/models/${id}`)));
  }

  createModel(body: CreateModelRequest): Observable<BpmnModelDto> {
    return this.request(this.http.post<BpmnModelDto>(this.url('/models'), body));
  }

  updateModel(id: string, body: UpdateModelRequest): Observable<BpmnModelDto> {
    return this.request(this.http.patch<BpmnModelDto>(this.url(`/models/${id}`), body));
  }

  deleteModel(id: string): Observable<void> {
    return this.request(this.http.delete<void>(this.url(`/models/${id}`)));
  }

  duplicateModel(id: string): Observable<BpmnModelDto> {
    return this.request(this.http.post<BpmnModelDto>(this.url(`/models/${id}/duplicate`), {}));
  }

  importModel(file: File, name?: string): Observable<BpmnModelDto> {
    const form = new FormData();
    form.append('file', file, file.name);
    if (name) form.append('name', name);
    return this.request(this.http.post<BpmnModelDto>(this.url('/models/import'), form));
  }

  // --- versions ---

  listVersions(modelId: string): Observable<BpmnModelVersionSummaryDto[]> {
    return this.request(
      this.http.get<BpmnModelVersionSummaryDto[]>(this.url(`/models/${modelId}/versions`)),
    );
  }

  getVersion(modelId: string, versionNumber: number): Observable<BpmnModelVersionDto> {
    return this.request(
      this.http.get<BpmnModelVersionDto>(this.url(`/models/${modelId}/versions/${versionNumber}`)),
    );
  }

  restoreVersion(modelId: string, versionNumber: number): Observable<BpmnModelVersionDto> {
    return this.request(
      this.http.post<BpmnModelVersionDto>(
        this.url(`/models/${modelId}/versions/${versionNumber}/restore`),
        {},
      ),
    );
  }

  exportVersion(modelId: string, versionNumber: number): Observable<DownloadedFile> {
    return this.request(
      this.http
        .get(this.url(`/models/${modelId}/versions/${versionNumber}/export`), {
          responseType: 'blob',
          observe: 'response',
        })
        .pipe(
          map((res: HttpResponse<Blob>) => ({
            blob: res.body ?? new Blob(),
            fileName:
              fileNameFromContentDisposition(res.headers.get('Content-Disposition')) ??
              `model-v${versionNumber}.bpmn`,
          })),
        ),
    );
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  private request<T>(source: Observable<T>): Observable<T> {
    return source.pipe(
      catchError((error: HttpErrorResponse) => throwError(() => toProblem(error))),
    );
  }
}

export function toProblem(error: HttpErrorResponse): ProblemDetails {
  const body = error.error as Partial<ProblemDetails> | null;
  if (body && typeof body === 'object' && typeof body.title === 'string') {
    return {
      type: body.type ?? 'about:blank',
      title: body.title,
      status: body.status ?? error.status,
      detail: body.detail,
      instance: body.instance,
      errors: body.errors,
    };
  }
  return {
    type: 'about:blank',
    title: error.status === 0 ? 'API unreachable' : error.statusText || 'Request failed',
    status: error.status,
    detail: error.message,
  };
}

/** Prefers the RFC 5987 `filename*` form, falls back to `filename`. */
export function fileNameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const extended = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (extended) {
    try {
      return decodeURIComponent(extended[1].trim());
    } catch {
      // fall through to the plain form
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain ? plain[1].trim() : null;
}

/** A readable one-liner for toasts. */
export function problemMessage(problem: ProblemDetails): string {
  const first = problem.errors?.[0]?.message;
  return [problem.detail ?? problem.title, first].filter(Boolean).join(' ');
}
