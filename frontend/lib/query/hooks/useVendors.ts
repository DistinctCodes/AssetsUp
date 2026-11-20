import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  vendorApiClient,
  CreateVendorInput,
  UpdateVendorInput,
  Vendor,
} from '@/lib/api/vendors';
import type { PageParams, Paginated } from '@/lib/api/paginated';
import { queryKeys } from '../keys';

/** One page of vendors, for the vendors list. */
export function useVendors(params?: PageParams) {
  return useQuery<Paginated<Vendor>>({
    queryKey: queryKeys.vendors.page(params ?? {}),
    queryFn: () => vendorApiClient.getVendors(params),
    placeholderData: (previous) => previous,
  });
}

/** Up to 100 vendors as an array, for select boxes. */
export function useVendorOptions() {
  return useQuery<Vendor[]>({
    queryKey: [...queryKeys.vendors.all, 'options'],
    queryFn: () => vendorApiClient.getVendorOptions(),
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
