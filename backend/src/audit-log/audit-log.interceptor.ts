import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditLogService } from './audit-log.service';
import { AuditAction } from './audit-log.entity';
import { Request } from 'express';
import { User } from '../users/user.entity';

const METHOD_ACTION_MAP: Record<string, AuditAction> = {
  POST: AuditAction.CREATE,
  PATCH: AuditAction.UPDATE,
  PUT: AuditAction.UPDATE,
  DELETE: AuditAction.DELETE,
  GET: AuditAction.READ,
};

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & { user?: User }>();
    const action = METHOD_ACTION_MAP[req.method] ?? AuditAction.READ;
    const entityType = req.path.split('/')[2] ?? 'unknown';
    const entityId = (req.params as Record<string, string>)['id'] ?? null;
    const user = req.user ?? null;
    const ipAddress = (req.headers['x-forwarded-for'] as string) ?? req.ip ?? null;

    return next.handle().pipe(
      tap({ next: () => { void this.auditLogService.log(action, entityType, entityId, user, ipAddress); } }),
    );
  }
}
