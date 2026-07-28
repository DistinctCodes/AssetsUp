import { Injectable } from '@nestjs/common';

export interface AuditLogEntry {
  action: string;
  entityType: string;
  entityId: string;
  performedBy?: string;
  details?: Record<string, unknown>;
  createdAt: Date;
}

@Injectable()
export class AuditLogsService {
  private logs: AuditLogEntry[] = [];

  logAction(
    action: string,
    entityType: string,
    entityId: string,
    performedBy?: string,
    details?: Record<string, unknown>,
  ) {
    this.logs.unshift({
      action,
      entityType,
      entityId,
      performedBy,
      details,
      createdAt: new Date(),
    });
  }

  getRecent(limit = 100) {
    return this.logs.slice(0, limit);
  }
}
