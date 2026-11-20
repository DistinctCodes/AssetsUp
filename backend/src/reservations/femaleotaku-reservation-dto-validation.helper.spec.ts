import { toReservationDtoSchema, validateCreateReservationInput } from './femaleotaku-reservation-dto-validation.helper';

describe('femaleotaku-reservation-dto-validation.helper', () => {
  it('returns field errors for invalid payloads', () => {
    const errors = validateCreateReservationInput({
      assetId: 'not-uuid',
      startsAt: 'bad',
      endsAt: '',
      purpose: 'x'.repeat(501),
    });
    const fields = errors.map((e) => e.field).sort();
    expect(fields).toEqual(['assetId', 'endsAt', 'purpose', 'startsAt']);
  });

  it('exposes DTO schema for Swagger documentation', () => {
    const schema = toReservationDtoSchema() as any;
    expect(schema.properties.assetId.format).toBe('uuid');
    expect(schema.required).toContain('startsAt');
  });
});
