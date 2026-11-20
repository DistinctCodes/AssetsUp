export interface CreateReservationInput {
  assetId: string;
  startsAt: string;
  endsAt: string;
  purpose?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateCreateReservationInput(input: Partial<CreateReservationInput>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!input.assetId || !UUID_RE.test(input.assetId)) {
    errors.push({ field: 'assetId', message: 'assetId must be a valid UUID' });
  }
  if (!input.startsAt || Number.isNaN(Date.parse(input.startsAt))) {
    errors.push({ field: 'startsAt', message: 'startsAt must be a valid ISO8601 date' });
  }
  if (!input.endsAt || Number.isNaN(Date.parse(input.endsAt))) {
    errors.push({ field: 'endsAt', message: 'endsAt must be a valid ISO8601 date' });
  }
  if (input.purpose !== undefined && input.purpose !== null && String(input.purpose).length > 500) {
    errors.push({ field: 'purpose', message: 'purpose must be at most 500 characters' });
  }
  return errors;
}

export function toReservationDtoSchema(): Record<string, unknown> {
  return {
    type: 'object',
    required: ['assetId', 'startsAt', 'endsAt'],
    properties: {
      assetId: { type: 'string', format: 'uuid' },
      startsAt: { type: 'string', format: 'date-time' },
      endsAt: { type: 'string', format: 'date-time' },
      purpose: { type: 'string', maxLength: 500 },
    },
  };
}
