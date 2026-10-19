import { BadRequestException, NotFoundException } from '@nestjs/common';
import { toProblemDetails } from './problem-details.filter';
import { validationExceptionFactory } from './validation';

describe('toProblemDetails', () => {
  it('maps unknown errors to 500 without leaking details', () => {
    expect(toProblemDetails(new Error('db password is x'), '/api/x')).toEqual({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      instance: '/api/x',
    });
  });

  it('maps Nest HTTP exceptions', () => {
    const p = toProblemDetails(new NotFoundException('Model 42 not found'), '/api/models/42');
    expect(p).toMatchObject({ status: 404, title: 'Not Found', detail: 'Model 42 not found' });
  });

  it('keeps explicit problem fields', () => {
    const p = toProblemDetails(
      new BadRequestException({ title: 'Invalid BPMN', detail: 'Not well-formed', type: 'urn:x' }),
    );
    expect(p).toMatchObject({
      status: 400,
      title: 'Invalid BPMN',
      detail: 'Not well-formed',
      type: 'urn:x',
    });
  });

  it('maps validation errors to field errors', () => {
    const ex = validationExceptionFactory([
      { property: 'name', constraints: { isNotEmpty: 'name should not be empty' }, children: [] },
    ]);
    expect(toProblemDetails(ex)).toMatchObject({
      status: 400,
      title: 'Validation failed',
      errors: [{ field: 'name', message: 'name should not be empty' }],
    });
  });
});
