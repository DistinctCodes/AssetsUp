import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogsService } from './audit-logs.service';

@Injectable()
export class AuditLoggingInterceptor implements NestInterceptor {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();

    const user = req.user; // Assumes authentication middleware adds user info
    const userId = user ? user.id : null;

    const method = req.method;
    const url = req.url;

    // Customize this logic to map HTTP verbs to action names:
    const actionMap = {
      GET: 'Read',
      POST: 'Create',
      PATCH: 'Update',
      PUT: 'Replace',
      DELETE: 'Delete',
    };
    const action = actionMap[method] || method;

    // Extract entity info from URL, e.g., /branches, /assets/123
    const entity = url.split('/')[1] || 'unknown';

    return next.handle().pipe(
      tap(async () => {
        // Optionally, you can add more metadata like request params or body here
        await this.auditLogsService.createLog({
          action,
          entity,
          userId,
          timestamp: new Date(),
          metadata: {
            params: req.params,
            query: req.query,
            body: req.body,
          },
        });
      }),
    );
  }
}
