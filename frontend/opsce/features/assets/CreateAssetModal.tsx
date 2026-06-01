import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface CreateAssetPayload {
  name: string;
  category: string;
  serialNumber: string;
  description?: string;
  departmentId?: string;
  locationId?: string;
  assignedUserId?: string;
  purchaseDate?: string;
  purchaseValue?: number;
  condition: string;
}

async function createAsset(payload: CreateAssetPayload) {
  const res = await fetch("/api/assets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw err;
  }
  return res.json();
}

export function useCreateAssetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}