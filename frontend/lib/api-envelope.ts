import type { AxiosError, AxiosResponse } from 'axios';

/** The shape `ResponseTransformInterceptor` wraps every successful backend response in. */
interface SuccessEnvelope {
  success: true;
  data: unknown;
}

/** The shape `AllExceptionsFilter` answers errors with. */
interface ErrorEnvelope {
  success: false;
  statusCode?: number;
  message?: string | string[];
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isSuccessEnvelope = (body: unknown): body is SuccessEnvelope =>
  isObject(body) && body.success === true && 'data' in body;

export const isErrorEnvelope = (body: unknown): body is ErrorEnvelope =>
  isObject(body) && body.success === false;

/**
 * Response interceptor: replaces `response.data` with the inner payload so every
 * client's `.then((r) => r.data)` gets the resource itself. Bodies that are not
 * envelopes (blobs, text, third-party endpoints) pass through untouched.
 */
export function unwrapEnvelope<T extends AxiosResponse>(response: T): T {
  if (isSuccessEnvelope(response.data)) {
    response.data = response.data.data;
  }
  return response;
}

/**
 * Error interceptor: surfaces the server's message as `error.message` (axios would
 * otherwise say "Request failed with status code 400") and leaves `error.response`
 * as the server sent it, so existing `error.response.data.message` reads still work.
 */
export function describeEnvelopeError(error: AxiosError): Promise<never> {
  const body = error.response?.data;
  if (isErrorEnvelope(body) && body.message) {
    error.message = Array.isArray(body.message)
      ? body.message.join(', ')
      : body.message;
  }
  return Promise.reject(error);
}
