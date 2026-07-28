import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface AuditLogActor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: AuditLogActor;
  entityType: string;
  entityId: string;
  action: 'CREATED' | 'UPDATED' | 'DELETED';
  summary: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
}

export interface AuditLogFilters {
  entityType?: string;
  actorId?: string;
  action?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogResponse {
  data: AuditLog[];
  total: number;
  page: number;
  totalPages: number;
}

export function useAuditLogs(filters: AuditLogFilters) {
  return useQuery<AuditLogResponse>({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      const response = await api.get('/audit-logs', { params: filters });
      return response.data;
    },
  });
}