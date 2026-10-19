import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';
import { ProblemFieldError } from '@bpmn-studio/shared';

export function validationExceptionFactory(errors: ValidationError[]): BadRequestException {
  return new BadRequestException({
    title: 'Validation failed',
    detail: 'One or more fields are invalid.',
    errors: flatten(errors),
  });
}

function flatten(errors: ValidationError[], parent?: string): ProblemFieldError[] {
  return errors.flatMap((e) => {
    const field = parent ? `${parent}.${e.property}` : e.property;
    const own = Object.values(e.constraints ?? {}).map((message) => ({ field, message }));
    return [...own, ...flatten(e.children ?? [], field)];
  });
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: validationExceptionFactory,
  });
}
