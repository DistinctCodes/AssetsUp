import { useMutation, useQueryClient } from "@tanstack/react-query";

export type EditAssetPayload = Partial<{
  name: string;
  category: string;
  serialNumber: string;
  description: string;
  departmentId: string;
  locationId: string;
  assignedUserId: string;
  purchaseDate: string;
  purchaseValue: number;
  condition: string;
  status: string;
}>;

async function editAsset({
  id,
  payload,
}: {
  id: string;
  payload: EditAssetPayload;
}) {
  const res = await fetch(`/api/assets/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw err;
  }
  return res.json();
}

export function useEditAssetMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EditAssetPayload) => editAsset({ id, payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset", id] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}