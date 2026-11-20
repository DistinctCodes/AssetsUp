import { of, lastValueFrom } from 'rxjs';
import { StreamableFile } from '@nestjs/common';
import {
  IbinolaStreamableFilePassthroughInterceptor,
  isIbinolaPassThroughValue,
} from './ibinola-streamable-file-passthrough.interceptor';

describe('IbinolaStreamableFilePassthroughInterceptor', () => {
  const interceptor = new IbinolaStreamableFilePassthroughInterceptor();

  it('passes StreamableFile through unchanged', async () => {
    const file = new StreamableFile(Buffer.from('png'));
    const result = await lastValueFrom(
      interceptor.intercept({} as any, { handle: () => of(file) } as any),
    );
    expect(result).toBe(file);
    expect(isIbinolaPassThroughValue(result)).toBe(true);
  });

  it('passes Buffer through unchanged', async () => {
    const buf = Buffer.from('hello');
    const result = await lastValueFrom(
      interceptor.intercept({} as any, { handle: () => of(buf) } as any),
    );
    expect(result).toBe(buf);
  });

  it('wraps plain JSON data in the success envelope', async () => {
    const payload = { id: 'asset-1' };
    const result = await lastValueFrom(
      interceptor.intercept({} as any, { handle: () => of(payload) } as any),
    );
    expect(result).toEqual({ success: true, data: payload });
  });
});
