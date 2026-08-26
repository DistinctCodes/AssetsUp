import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  vendorApiClient,
  CreateVendorInput,
  UpdateVendorInput,
  Vendor,
} from '@/lib/api/vendors';
import { queryKeys } from '../keys';

export function useVendors() {
  return useQuery<Vendor[]>({
    queryKey: queryKeys.vendors.lists(),
    queryFn: () => vendorApiClient.getVendors(),
  });
}

export function useVendor(id: string) {
  return useQuery<Vendor>({
    queryKey: queryKeys.vendors.detail(id),
    queryFn: () => vendorApiClient.getVendor(id),
    enabled: !!id,
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVendorInput) => vendorApiClient.createVendor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all });
    },
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVendorInput }) =>
      vendorApiClient.updateVendor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all });
    },
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vendorApiClient.deleteVendor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all });
    },
  });
}
