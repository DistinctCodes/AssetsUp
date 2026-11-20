import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface IbinolaEnvelope<T> {
  success: boolean;
  data: T;
}

export function isIbinolaPassThroughValue(value: unknown): boolean {
  return value instanceof StreamableFile || Buffer.isBuffer(value);
}

@Injectable()
export class IbinolaStreamableFilePassthroughInterceptor<T>
  implements NestInterceptor<T, IbinolaEnvelope<T> | T>
{
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<IbinolaEnvelope<T> | T> {
    return next.handle().pipe(
      map((data) => {
        if (isIbinolaPassThroughValue(data)) return data;
        return { success: true, data };
      }),
    );
  }
}
