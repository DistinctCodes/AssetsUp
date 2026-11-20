import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  poApiClient,
  CreatePOInput,
  ReceiveLineInput,
  PurchaseOrder,
} from '@/lib/api/purchase-orders';
import type { PageParams, Paginated } from '@/lib/api/paginated';
import { queryKeys } from '../keys';

export function usePurchaseOrders(params?: PageParams) {
  return useQuery<Paginated<PurchaseOrder>>({
    queryKey: queryKeys.purchaseOrders.page(params ?? {}),
    queryFn: () => poApiClient.getPOs(params),
    placeholderData: (previous) => previous,
  });
}

export function usePurchaseOrder(id?: string) {
  return useQuery<PurchaseOrder>({
    queryKey: queryKeys.purchaseOrders.detail(id ?? ''),
    queryFn: () => poApiClient.getPO(id as string),
    enabled: !!id,
  });
}

export function useCreatePO() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePOInput) => poApiClient.createPO(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
    },
  });
}

export function useReceiveLineItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, items }: { id: string; items: ReceiveLineInput[] }) =>
      poApiClient.receiveLineItems(id, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

export function useSubmitPO() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => poApiClient.submitPO(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
    },
  });
}

export function useApprovePO() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => poApiClient.approvePO(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
    },
  });
}

export function useCancelPO() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => poApiClient.cancelPO(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
    },
  });
}
