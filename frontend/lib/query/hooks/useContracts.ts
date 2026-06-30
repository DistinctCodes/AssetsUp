// frontend/lib/query/hooks/useContracts.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contractApiClient } from "@/lib/api/contracts";
import { queryKeys } from "../keys";
import {
  Contract,
  ContractListResponse,
  ContractListFilters,
  CreateContractInput,
  UpdateContractInput,
} from "../types/contract";
import { ApiError } from "../types";

export function useContracts(filters?: ContractListFilters) {
  return useQuery<ContractListResponse, ApiError>({
    queryKey: queryKeys.contracts.list(
      (filters as Record<string, unknown>) ?? {},
    ),
    queryFn: () => contractApiClient.getContracts(filters),
  });
}

export function useContract(id: string) {
  return useQuery<Contract, ApiError>({
    queryKey: queryKeys.contracts.detail(id),
    queryFn: () => contractApiClient.getContract(id),
    enabled: !!id,
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();
  return useMutation<Contract, ApiError, CreateContractInput>({
    mutationFn: (data) => contractApiClient.createContract(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all });
    },
  });
}

export function useUpdateContract(id: string) {
  const queryClient = useQueryClient();
  return useMutation<Contract, ApiError, UpdateContractInput>({
    mutationFn: (data) => contractApiClient.updateContract(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.contracts.detail(id),
      });
    },
  });
}

export function useUploadContractDocument(id: string) {
  const queryClient = useQueryClient();
  return useMutation<{ key: string; url: string }, ApiError, { file: File }>({
    mutationFn: ({ file }) =>
      contractApiClient.uploadContractDocument(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.contracts.detail(id),
      });
    },
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => contractApiClient.deleteContract(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all });
    },
  });
}
