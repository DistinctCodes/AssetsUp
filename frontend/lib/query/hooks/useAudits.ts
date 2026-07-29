import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  auditApiClient,
  AuditSessionDetail,
  AuditSessionSummary,
  CreateAuditSessionInput,
  RecordAuditItemInput,
} from '@/lib/api/audits';
import { queryKeys } from '../keys';

export function useAuditSessions() {
  return useQuery<AuditSessionSummary[]>({
    queryKey: queryKeys.audits.list(),
    queryFn: () => auditApiClient.getAuditSessions(),
  });
}

export function useAuditSession(id?: string) {
  return useQuery<AuditSessionDetail>({
    queryKey: queryKeys.audits.detail(id ?? ''),
    queryFn: () => auditApiClient.getAuditSession(id as string),
    enabled: !!id,
  });
}

export function useCreateAuditSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAuditSessionInput) => auditApiClient.createAuditSession(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.audits.all });
    },
  });
}

export function useRecordAuditItem(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: RecordAuditItemInput }) =>
      auditApiClient.recordAuditItem(sessionId, itemId, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.audits.detail(sessionId), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.audits.list() });
    },
  });
}

export function useCompleteAuditSession(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => auditApiClient.completeAuditSession(sessionId),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.audits.detail(sessionId), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.audits.list() });
    },
  });
}
