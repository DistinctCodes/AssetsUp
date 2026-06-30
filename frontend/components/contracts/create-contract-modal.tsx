// frontend/components/contracts/create-contract-modal.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateContract } from "@/lib/query/hooks/useContracts";
import { ContractStatus, ContractType } from "@/lib/query/types/contract";

const schema = z.object({
  title: z.string().min(1, "Contract title is required"),
  vendor: z.string().min(1, "Vendor name is required"),
  contractType: z.nativeEnum(ContractType).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  value: z.string().optional(),
  status: z.nativeEnum(ContractStatus).optional(),
  renewalAlertDays: z.string().optional(),
  notes: z.string().optional(),
  document: z.any().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateContractModal({ onClose, onSuccess }: Props) {
  const createContract = useCreateContract();
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: ContractStatus.DRAFT,
      renewalAlertDays: "30",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const contract = await createContract.mutateAsync({
        title: values.title,
        vendor: values.vendor,
        contractType: values.contractType,
        startDate: values.startDate || undefined,
        endDate: values.endDate || undefined,
        value: values.value ? Number(values.value) : undefined,
        status: values.status,
        renewalAlertDays: values.renewalAlertDays
          ? Number(values.renewalAlertDays)
          : undefined,
        notes: values.notes || undefined,
      });

      // Upload document if provided
      if (values.document && values.document.length > 0) {
        setUploading(true);
        try {
          const formData = new FormData();
          formData.append("file", values.document[0]);

          const { api } = await import("@/lib/api");
          await api.post(`/contracts/${contract.id}/document`, formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });
        } catch (err) {
          console.error("Failed to upload document:", err);
        } finally {
          setUploading(false);
        }
      }

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to create contract.";
      setError("root", { message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-gray-900">
            Create New Contract
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <Input
            id="title"
            label="Contract Title *"
            placeholder="e.g. Annual Maintenance Agreement"
            {...register("title")}
            error={errors.title?.message}
          />

          <Input
            id="vendor"
            label="Vendor *"
            placeholder="e.g. Acme Corporation"
            {...register("vendor")}
            error={errors.vendor?.message}
          />

          <div className="grid grid-cols-2 gap-3">
            {/* Contract Type */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Contract Type
              </label>
              <select
                {...register("contractType")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">Select type</option>
                {Object.values(ContractType).map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                {...register("status")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                {Object.values(ContractStatus).map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0) + s.slice(1).toLowerCase().replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              id="startDate"
              label="Start Date"
              type="date"
              {...register("startDate")}
            />
            <Input
              id="endDate"
              label="End Date"
              type="date"
              {...register("endDate")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              id="value"
              label="Contract Value ($)"
              type="number"
              placeholder="0.00"
              {...register("value")}
            />
            <Input
              id="renewalAlertDays"
              label="Renewal Alert (Days Before)"
              type="number"
              placeholder="30"
              {...register("renewalAlertDays")}
            />
          </div>

          {/* Document Upload */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Contract Document (PDF)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex-1 flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
                <Upload size={20} className="text-gray-400 mr-2" />
                <span className="text-sm text-gray-600">Choose PDF file</span>
                <input
                  type="file"
                  accept=".pdf"
                  {...register("document")}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="notes"
              className="text-sm font-medium text-gray-700"
            >
              Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              placeholder="Any additional notes about this contract..."
              {...register("notes")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            />
          </div>

          {errors.root && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {errors.root.message}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              loading={createContract.isPending || uploading}
            >
              Create Contract
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
