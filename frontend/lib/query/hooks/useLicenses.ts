import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  licenseApiClient,
  CreateLicenseInput,
  UpdateLicenseInput,
  License,
  SeatAssignment,
} from '@/lib/api/licenses';
import { queryKeys } from '../keys';

export function useLicenses() {
  return useQuery<License[]>({
    queryKey: queryKeys.licenses.list(),
    queryFn: () => licenseApiClient.getLicenses(),
  });
}

export function useLicense(id?: string) {
  return useQuery<License>({
    queryKey: queryKeys.licenses.detail(id ?? ''),
    queryFn: () => licenseApiClient.getLicense(id as string),
    enabled: !!id,
  });
}

export function useLicenseAssignments(id?: string) {
  return useQuery<SeatAssignment[]>({
    queryKey: queryKeys.licenses.assignments(id ?? ''),
    queryFn: () => licenseApiClient.getAssignments(id as string),
    enabled: !!id,
  });
}

export function useCreateLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLicenseInput) => licenseApiClient.createLicense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.licenses.all });
    },
  });
}

export function useUpdateLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLicenseInput }) =>
      licenseApiClient.updateLicense(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.licenses.all });
    },
  });
}

export function useDeleteLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => licenseApiClient.deleteLicense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.licenses.all });
    },
  });
}

export function useRevealLicenseKey() {
  return useMutation({
    mutationFn: (id: string) => licenseApiClient.revealKey(id),
  });
}

export function useAssignSeat(licenseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => licenseApiClient.assignSeat(licenseId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.licenses.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.licenses.assignments(licenseId) });
    },
  });
}

export function useUnassignSeat(licenseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => licenseApiClient.unassignSeat(licenseId, assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.licenses.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.licenses.assignments(licenseId) });
    },
  });
}
