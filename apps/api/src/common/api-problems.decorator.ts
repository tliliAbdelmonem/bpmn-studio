import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { PROBLEM_JSON_CONTENT_TYPE, ProblemDetails, ProblemFieldError } from '@bpmn-studio/shared';

class ProblemFieldErrorResponse implements ProblemFieldError {
  @ApiPropertyOptional() field?: string;
  @ApiProperty() message!: string;
}

export class ProblemDetailsResponse implements ProblemDetails {
  @ApiProperty({ example: 'about:blank' }) type!: string;
  @ApiProperty({ example: 'Not Found' }) title!: string;
  @ApiProperty({ example: 404 }) status!: number;
  @ApiPropertyOptional() detail?: string;
  @ApiPropertyOptional() instance?: string;
  @ApiPropertyOptional({ type: [ProblemFieldErrorResponse] }) errors?: ProblemFieldError[];
}

/** Documents RFC 9457 error responses for the given HTTP statuses. */
export function ApiProblems(...statuses: HttpStatus[]) {
  return applyDecorators(
    ApiExtraModels(ProblemDetailsResponse, ProblemFieldErrorResponse),
    ...statuses.map((status) =>
      ApiResponse({
        status,
        description: HttpStatus[status],
        content: {
          [PROBLEM_JSON_CONTENT_TYPE]: { schema: { $ref: getSchemaPath(ProblemDetailsResponse) } },
        },
      }),
    ),
  );
}
