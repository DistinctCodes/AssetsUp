import { api } from '../api';

export type AuditSessionStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';
export type AuditItemResult = 'PENDING' | 'FOUND' | 'MISSING' | 'WRONG_LOCATION' | 'DAMAGED';

export interface AuditItem {
  id: string;
  auditSessionId: string;
  assetId: string;
  expectedLocationId?: string | null;
  result: AuditItemResult;
  note?: string | null;
  checkedAt?: string | null;
  createdAt: string;
}

export interface AuditSessionSummary {
  id: string;
  name: string;
  status: AuditSessionStatus;
  scopeDepartmentId?: string | null;
  scopeLocationId?: string | null;
  createdByUserId?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  totalItems: number;
  checkedItems: number;
  progressPercent: number;
  discrepancyCount: number;
}

export interface AuditSessionDetail extends AuditSessionSummary {
  items: AuditItem[];
}

export interface CreateAuditSessionInput {
  name: string;
  departmentId?: string;
  locationId?: string;
}

export interface RecordAuditItemInput {
  result: AuditItemResult;
  note?: string;
}

export const auditApiClient = {
  getAuditSessions: (): Promise<AuditSessionSummary[]> =>
    api.get<AuditSessionSummary[]>('/audits').then((r) => r.data),

  getAuditSession: (id: string): Promise<AuditSessionDetail> =>
    api.get<AuditSessionDetail>(`/audits/${id}`).then((r) => r.data),

  createAuditSession: (data: CreateAuditSessionInput): Promise<AuditSessionDetail> =>
    api.post<AuditSessionDetail>('/audits', data).then((r) => r.data),

  recordAuditItem: (
    sessionId: string,
    itemId: string,
    data: RecordAuditItemInput,
  ): Promise<AuditSessionDetail> =>
    api
      .patch<AuditSessionDetail>(`/audits/${sessionId}/items/${itemId}`, data)
      .then((r) => r.data),

  completeAuditSession: (id: string): Promise<AuditSessionDetail> =>
    api.post<AuditSessionDetail>(`/audits/${id}/complete`).then((r) => r.data),
};
