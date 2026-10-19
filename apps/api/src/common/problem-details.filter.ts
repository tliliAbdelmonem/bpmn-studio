import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { PROBLEM_JSON_CONTENT_TYPE, ProblemDetails, ProblemFieldError } from '@bpmn-studio/shared';
import type { Request, Response } from 'express';

/** Renders every error as RFC 9457 `application/problem+json`. */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const problem = toProblemDetails(exception, request.originalUrl);

    if (problem.status >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    response.status(problem.status).type(PROBLEM_JSON_CONTENT_TYPE).json(problem);
  }
}

export function toProblemDetails(exception: unknown, instance?: string): ProblemDetails {
  if (!(exception instanceof HttpException)) {
    return {
      type: 'about:blank',
      title: 'Internal Server Error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      instance,
    };
  }

  const status = exception.getStatus();
  const body = exception.getResponse();
  const problem: ProblemDetails = {
    type: 'about:blank',
    title: defaultTitle(status, exception),
    status,
    instance,
  };

  if (typeof body === 'string') {
    problem.detail = body;
  } else if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    if (typeof b['type'] === 'string') problem.type = b['type'];
    if (typeof b['title'] === 'string') problem.title = b['title'];
    if (typeof b['detail'] === 'string') problem.detail = b['detail'];
    if (Array.isArray(b['errors'])) problem.errors = b['errors'] as ProblemFieldError[];
    // Nest's default shape: { message: string | string[], error, statusCode }
    if (!problem.detail && typeof b['message'] === 'string' && b['message'] !== problem.title) {
      problem.detail = b['message'];
    }
    if (!problem.errors && Array.isArray(b['message'])) {
      problem.errors = (b['message'] as unknown[]).map((m) => ({ message: String(m) }));
    }
  }
  return problem;
}

function defaultTitle(status: number, exception: HttpException): string {
  const name = HttpStatus[status];
  if (!name) return exception.message;
  return name
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
