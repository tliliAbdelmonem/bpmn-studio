import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_PREFIX, HealthDto, ProblemDetails } from '@bpmn-studio/shared';
import { Observable, catchError, throwError } from 'rxjs';

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
    return this.get<HealthDto>('/health');
  }

  private get<T>(path: string): Observable<T> {
    return this.http
      .get<T>(`${this.baseUrl}${path}`)
      .pipe(catchError((error: HttpErrorResponse) => throwError(() => toProblem(error))));
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
