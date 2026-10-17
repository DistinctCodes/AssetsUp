import 'reflect-metadata';
import { ApiEnvelope, ApiErrorEnvelope, ErrorEnvelopeDto } from './api-envelope.decorator';

class Thing {}

class Probe {
  @ApiEnvelope(Thing)
  one() {}

  @ApiEnvelope(Thing, { isArray: true })
  many() {}

  @ApiEnvelope(Thing, { paginated: true, status: 200 })
  page() {}

  @ApiErrorEnvelope(404, 'Not found')
  missing() {}
}

const responses = (name: keyof Probe) =>
  Reflect.getMetadata('swagger/apiResponse', Probe.prototype[name]);

describe('ApiEnvelope', () => {
  it('wraps the model in { success, data }', () => {
    const schema = responses('one')[200].schema;
    expect(schema.allOf[0].$ref).toContain('SuccessEnvelopeDto');
    expect(schema.allOf[1].properties.data.$ref).toContain('Thing');
  });

  it('documents arrays', () => {
    const data = responses('many')[200].schema.allOf[1].properties.data;
    expect(data.type).toBe('array');
    expect(data.items.$ref).toContain('Thing');
  });

  it('documents the paginated shape', () => {
    const data = responses('page')[200].schema.allOf[1].properties.data;
    expect(Object.keys(data.properties)).toEqual([
      'items',
      'total',
      'page',
      'limit',
      'totalPages',
    ]);
  });

  it('documents errors with the shared error body', () => {
    expect(responses('missing')[404].type).toBe(ErrorEnvelopeDto);
  });
});
