"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUpdateAssetStatus } from "@/lib/query/hooks/useAssets";
import { AssetStatus } from "@/lib/query/types/asset";

const schema = z.object({
  status: z.nativeEnum(AssetStatus, {
    errorMap: () => ({ message: "Please select a valid status" }),
  }),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  assetId: string;
  currentStatus?: AssetStatus;
  onClose: () => void;
  onSuccess?: () => void;
}

const selectClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900";

export function UpdateStatusModal({ assetId, currentStatus, onClose, onSuccess }: Props) {
  const updateStatus = useUpdateAssetStatus(assetId);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: currentStatus },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await updateStatus.mutateAsync({ status: values.status });
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Something went wrong.";
      setError("root", { message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Update Status</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <select {...register("status")} className={selectClass}>
              <option value="">Select status</option>
              {Object.values(AssetStatus).map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
            {errors.status && (
              <p className="text-xs text-red-500">{errors.status.message}</p>
            )}
          </div>

          {errors.root && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {errors.root.message}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={updateStatus.isPending}>
              Update
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
