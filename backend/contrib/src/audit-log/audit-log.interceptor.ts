import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogService } from './audit-log.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const method = request.method?.toUpperCase();

    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const userId = request.user?.userId ?? null;
    const path = request.originalUrl || request.url;
    const ipAddress =
      request.ip ||
      (request.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      null;
    const userAgent = request.get?.('user-agent') || request.headers?.['user-agent'] || null;

    return next.handle().pipe(
      tap({
        next: () => {
          const statusCode = response.statusCode;
          void this.auditLogService
            .create({ userId, method, path, statusCode, ipAddress, userAgent })
            .catch(() => undefined);
        },
        error: (error) => {
          const statusCode = error?.status ?? response.statusCode ?? 500;
          void this.auditLogService
            .create({ userId, method, path, statusCode, ipAddress, userAgent })
            .catch(() => undefined);
        },
      }),
    );
  }
}
