import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ResponseDto } from '../dto/response.dto';

/**
 * Global response interceptor to standardize all API responses
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const path = request.path;

    return next.handle().pipe(
      map((data) => {
        // If data is already a ResponseDto, return it as-is
        if (data instanceof ResponseDto) {
          return data;
        }

        // Wrap data in ResponseDto
        return new ResponseDto(data, undefined, path);
      }),
    );
  }
}
