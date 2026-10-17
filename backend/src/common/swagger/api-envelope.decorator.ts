import { Type, applyDecorators } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';

/** Body of every error response (see `AllExceptionsFilter`). */
export class ErrorEnvelopeDto {
  @ApiProperty({ example: false })
  success: false;

  @ApiProperty({ example: 404 })
  statusCode: number;

  @ApiProperty({ example: 'Not Found' })
  error: string;

  @ApiProperty({
    description: 'A message, or a list of validation messages',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Asset ast-1 not found',
  })
  message: string | string[];

  @ApiProperty({ example: '/api/assets/ast-1' })
  path: string;

  @ApiProperty({ example: '2025-01-01T12:00:00.000Z' })
  timestamp: string;
}

/** Marker so the generic wrapper below can reference the success shape. */
export class SuccessEnvelopeDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiPropertyOptional()
  message?: string;
}

interface EnvelopeOptions {
  /** `data` is an array of `model`. */
  isArray?: boolean;
  /** `data` is `{ items, total, page, limit, totalPages }` of `model`. */
  paginated?: boolean;
  status?: number;
  description?: string;
}

/**
 * Documents a success response as it is actually sent:
 * `{ success: true, data: <model> }` (see `ResponseTransformInterceptor`).
 */
export function ApiEnvelope<T extends Type<unknown>>(
  model: T,
  options: EnvelopeOptions = {},
) {
  const ref = { $ref: getSchemaPath(model) };
  let data: Record<string, unknown> = ref;
  if (options.paginated) {
    data = {
      type: 'object',
      properties: {
        items: { type: 'array', items: ref },
        total: { type: 'number', example: 42 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 20 },
        totalPages: { type: 'number', example: 3 },
      },
    };
  } else if (options.isArray) {
    data = { type: 'array', items: ref };
  }

  return applyDecorators(
    ApiExtraModels(SuccessEnvelopeDto, model),
    ApiResponse({
      status: options.status ?? 200,
      description: options.description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(SuccessEnvelopeDto) },
          { type: 'object', properties: { data } },
        ],
      },
    }),
  );
}

/** Documents an error response using the shared error body. */
export function ApiErrorEnvelope(status: number, description: string) {
  return applyDecorators(
    ApiExtraModels(ErrorEnvelopeDto),
    ApiResponse({ status, description, type: ErrorEnvelopeDto }),
  );
}
