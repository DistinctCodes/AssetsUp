import {
  Injectable,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AuditLoggingInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Add audit logging logic here
    // For now, just pass through the request
    return next.handle();
  }
}