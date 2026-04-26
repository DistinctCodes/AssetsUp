"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpdateAsset, useCategories, useDepartmentsList } from "@/lib/query/hooks/useAssets";
import { Asset, AssetCondition } from "@/lib/query/types/asset";
import { CreateAssetInput } from "@/lib/api/assets";

const schema = z.object({
  name: z.string().min(1, "Asset name is required"),
  categoryId: z.string().min(1, "Category is required"),
  departmentId: z.string().min(1, "Department is required"),
  serialNumber: z.string().optional(),
  location: z.string().optional(),
  condition: z.nativeEnum(AssetCondition).optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.string().optional(),
  currentValue: z.string().optional(),
  warrantyExpiration: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  tags: z.string().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  asset: Asset;
  onClose: () => void;
  onSuccess?: () => void;
}

const TABS = ["Basic Info", "Additional Details"] as const;
type Tab = (typeof TABS)[number];

const selectClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900";

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
};

export function EditAssetModal({ asset, onClose, onSuccess }: Props) {
  const [tab, setTab] = useState<Tab>("Basic Info");
  const { data: categories = [] } = useCategories();
  const { data: departments = [] } = useDepartmentsList();
  const updateAsset = useUpdateAsset(asset.id);

  const defaultValues: FormValues = {
    name: asset.name,
    categoryId: asset.category?.id || "",
    departmentId: asset.department?.id || "",
    serialNumber: asset.serialNumber || "",
    location: asset.location || "",
    condition: asset.condition,
    purchaseDate: formatDate(asset.purchaseDate),
    purchasePrice: asset.purchasePrice?.toString() || "",
    currentValue: asset.currentValue?.toString() || "",
    warrantyExpiration: formatDate(asset.warrantyExpiration),
    manufacturer: asset.manufacturer || "",
    model: asset.model || "",
    tags: asset.tags?.join(", ") || "",
    description: asset.description || "",
  };

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const onSubmit = async (values: FormValues) => {
    const payload: Partial<CreateAssetInput> = {};

    if (values.name !== defaultValues.name) payload.name = values.name;
    if (values.categoryId !== defaultValues.categoryId) payload.categoryId = values.categoryId;
    if (values.departmentId !== defaultValues.departmentId) payload.departmentId = values.departmentId;
    if (values.serialNumber !== defaultValues.serialNumber) payload.serialNumber = values.serialNumber || undefined;
    if (values.location !== defaultValues.location) payload.location = values.location || undefined;
    if (values.condition !== defaultValues.condition) payload.condition = values.condition;
    if (values.purchaseDate !== defaultValues.purchaseDate) payload.purchaseDate = values.purchaseDate || undefined;
    
    if (values.purchasePrice !== defaultValues.purchasePrice) {
      payload.purchasePrice = values.purchasePrice ? parseFloat(values.purchasePrice) : undefined;
    }
    if (values.currentValue !== defaultValues.currentValue) {
      payload.currentValue = values.currentValue ? parseFloat(values.currentValue) : undefined;
    }
    
    if (values.warrantyExpiration !== defaultValues.warrantyExpiration) payload.warrantyExpiration = values.warrantyExpiration || undefined;
    if (values.manufacturer !== defaultValues.manufacturer) payload.manufacturer = values.manufacturer || undefined;
    if (values.model !== defaultValues.model) payload.model = values.model || undefined;
    
    if (values.tags !== defaultValues.tags) {
      payload.tags = values.tags ? values.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined;
    }
    
    if (values.description !== defaultValues.description) payload.description = values.description || undefined;

    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    try {
      await updateAsset.mutateAsync(payload);
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
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-gray-900">Edit Asset</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-gray-200 px-6">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`py-3 px-1 mr-6 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          {tab === "Basic Info" && (
            <>
              <Input
                id="name"
                label="Asset Name *"
                placeholder="e.g. MacBook Pro 16&quot;"
                {...register("name")}
                error={errors.name?.message}
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Category *</label>
                  <select {...register("categoryId")} className={selectClass}>
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {errors.categoryId && (
                    <p className="text-xs text-red-500">{errors.categoryId.message}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Department *</label>
                  <select {...register("departmentId")} className={selectClass}>
                    <option value="">Select department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  {errors.departmentId && (
                    <p className="text-xs text-red-500">{errors.departmentId.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="serialNumber"
                  label="Serial Number"
                  placeholder="SN-12345"
                  {...register("serialNumber")}
                />
                <Input
                  id="location"
                  label="Location"
                  placeholder="Floor 2, Room 204"
                  {...register("location")}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Condition</label>
                <select {...register("condition")} className={selectClass}>
                  {Object.values(AssetCondition).map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0) + c.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {tab === "Additional Details" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="purchaseDate"
                  label="Purchase Date"
                  type="date"
                  {...register("purchaseDate")}
                />
                <Input
                  id="warrantyExpiration"
                  label="Warranty Expiration"
                  type="date"
                  {...register("warrantyExpiration")}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="purchasePrice"
                  label="Purchase Price ($)"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register("purchasePrice")}
                />
                <Input
                  id="currentValue"
                  label="Current Value ($)"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register("currentValue")}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="manufacturer"
                  label="Manufacturer"
                  placeholder="Apple"
                  {...register("manufacturer")}
                />
                <Input
                  id="model"
                  label="Model"
                  placeholder="MacBook Pro"
                  {...register("model")}
                />
              </div>

              <Input
                id="tags"
                label="Tags (comma-separated)"
                placeholder="laptop, engineering, remote"
                {...register("tags")}
              />

              <div className="flex flex-col gap-1">
                <label htmlFor="description" className="text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={3}
                  placeholder="Additional details..."
                  {...register("description")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                />
              </div>
            </>
          )}

          {errors.root && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {errors.root.message}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={updateAsset.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
