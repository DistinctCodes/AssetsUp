import type { AxiosError, AxiosResponse } from 'axios';
import {
  describeEnvelopeError,
  isErrorEnvelope,
  isSuccessEnvelope,
  unwrapEnvelope,
} from '@/lib/api-envelope';

const response = (data: unknown) => ({ data, status: 200 }) as AxiosResponse;

describe('unwrapEnvelope', () => {
  it('returns the inner payload of a success envelope', () => {
    const asset = { id: 'a-1', name: 'Laptop' };
    expect(unwrapEnvelope(response({ success: true, data: asset })).data).toEqual(asset);
  });

  it('keeps a paginated payload intact', () => {
    const page = { items: [{ id: 1 }], total: 1, page: 1, limit: 20, totalPages: 1 };
    expect(unwrapEnvelope(response({ success: true, data: page })).data).toEqual(page);
  });

  it('unwraps null and falsy payloads', () => {
    expect(unwrapEnvelope(response({ success: true, data: null })).data).toBeNull();
    expect(unwrapEnvelope(response({ success: true, data: 0 })).data).toBe(0);
  });

  it.each([
    ['a plain object', { id: 1 }],
    ['an array', [1, 2]],
    ['a string', 'text'],
    ['a blob-like value', new Blob(['x'])],
    ['an envelope without data', { success: true }],
    ['a success:false body', { success: false, data: 1 }],
    ['undefined', undefined],
  ])('leaves %s untouched', (_label, body) => {
    expect(unwrapEnvelope(response(body)).data).toBe(body);
  });
});

describe('describeEnvelopeError', () => {
  const failure = (data: unknown) =>
    ({ message: 'Request failed with status code 400', response: { status: 400, data } }) as AxiosError;

  it('uses the server message for an error envelope and rejects', async () => {
    const error = failure({ success: false, statusCode: 400, message: 'Email already in use' });
    await expect(describeEnvelopeError(error)).rejects.toBe(error);
    expect(error.message).toBe('Email already in use');
  });

  it('joins validation message arrays', async () => {
    const error = failure({ success: false, message: ['name must be a string', 'cost must be positive'] });
    await expect(describeEnvelopeError(error)).rejects.toBe(error);
    expect(error.message).toBe('name must be a string, cost must be positive');
  });

  it('keeps the response as the server sent it', async () => {
    const body = { success: false, statusCode: 404, message: 'Not found' };
    const error = failure(body);
    await expect(describeEnvelopeError(error)).rejects.toBe(error);
    expect(error.response?.data).toBe(body);
  });

  it('leaves the axios message alone for non-envelope errors', async () => {
    const error = failure('Bad Gateway');
    await expect(describeEnvelopeError(error)).rejects.toBe(error);
    expect(error.message).toBe('Request failed with status code 400');
  });

  it('copes with a network error that has no response', async () => {
    const error = { message: 'Network Error' } as AxiosError;
    await expect(describeEnvelopeError(error)).rejects.toBe(error);
    expect(error.message).toBe('Network Error');
  });
});

describe('envelope guards', () => {
  it('distinguishes success and error envelopes', () => {
    expect(isSuccessEnvelope({ success: true, data: 1 })).toBe(true);
    expect(isSuccessEnvelope({ success: false, message: 'x' })).toBe(false);
    expect(isErrorEnvelope({ success: false })).toBe(true);
    expect(isErrorEnvelope({ success: true, data: 1 })).toBe(false);
    expect(isErrorEnvelope(null)).toBe(false);
  });
});
