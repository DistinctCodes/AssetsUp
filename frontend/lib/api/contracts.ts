// frontend/lib/api/contracts.ts
import { api } from "@/lib/api";
import {
  Contract,
  ContractListResponse,
  ContractListFilters,
  CreateContractInput,
  UpdateContractInput,
  ContractUploadResponse,
} from "@/lib/query/types/contract";

export const contractApiClient = {
  getContracts: async (
    filters?: ContractListFilters,
  ): Promise<ContractListResponse> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append("search", filters.search);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.vendor) params.append("vendor", filters.vendor);
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.limit) params.append("limit", filters.limit.toString());

    const { data } = await api.get<ContractListResponse>(
      `/contracts?${params.toString()}`,
    );
    return data;
  },

  getContract: async (id: string): Promise<Contract> => {
    const { data } = await api.get<Contract>(`/contracts/${id}`);
    return data;
  },

  createContract: async (input: CreateContractInput): Promise<Contract> => {
    const { data } = await api.post<Contract>("/contracts", input);
    return data;
  },

  updateContract: async (
    id: string,
    input: UpdateContractInput,
  ): Promise<Contract> => {
    const { data } = await api.put<Contract>(`/contracts/${id}`, input);
    return data;
  },

  uploadContractDocument: async (
    id: string,
    file: File,
  ): Promise<ContractUploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await api.post<ContractUploadResponse>(
      `/contracts/${id}/document`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return data;
  },

  deleteContract: async (id: string): Promise<void> => {
    await api.delete(`/contracts/${id}`);
  },
};
