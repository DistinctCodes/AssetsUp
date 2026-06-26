'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUsers, useDepartments } from '@/lib/query/hooks/useAsset';
import type { Asset } from '@/lib/query/types/asset';
import { useCategories } from '@/lib/query';
import { useUpdateAsset } from '@/lib/query/hooks/useAssets';

// Keep money fields as optional number in the schema.
// The empty-string case is handled in defaultValues by using undefined instead.
const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required'),
  departmentId: z.string().min(1, 'Department is required'),
  serialNumber: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.number().positive().optional(),
  currentValue: z.number().positive().optional(),
  warrantyExpiration: z.string().optional(),
  status: z.string().optional(),
  condition: z.string().optional(),
  location: z.string().optional(),
  assignedToId: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  asset: Asset;
  onClose: () => void;
}

function toDateInputValue(iso?: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

// Safely convert asset price fields to number | undefined (never '')
function toMoneyValue(val: unknown): number | undefined {
  if (val == null || val === '') return undefined;
  const n = Number(val);
  return isNaN(n) ? undefined : n;
}

export function EditAssetModal({ asset, onClose }: Props) {
  const { data: users = [] } = useUsers();
  const { data: departments = [] } = useDepartments();
  const { data: categories = [] } = useCategories();

  const { mutate: updateAsset, isPending, error: apiError } = useUpdateAsset(asset.id, {
    onSuccess: onClose,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: asset.name ?? '',
      description: asset.description ?? '',
      categoryId: asset.category?.id ?? '',
      departmentId: asset.department?.id ?? '',
      serialNumber: asset.serialNumber ?? '',
      purchaseDate: toDateInputValue(asset.purchaseDate),
      purchasePrice: toMoneyValue(asset.purchasePrice),   // number | undefined, never ''
      currentValue: toMoneyValue(asset.currentValue),     // number | undefined, never ''
      warrantyExpiration: toDateInputValue(asset.warrantyExpiration),
      status: asset.status ?? '',
      condition: asset.condition ?? '',
      location: asset.location ?? '',
      assignedToId: asset.assignedTo?.id ?? '',
      manufacturer: asset.manufacturer ?? '',
      model: asset.model ?? '',
      notes: asset.notes ?? '',
    },
  });

  useEffect(() => {
    reset({
      name: asset.name ?? '',
      description: asset.description ?? '',
      categoryId: asset.category?.id ?? '',
      departmentId: asset.department?.id ?? '',
      serialNumber: asset.serialNumber ?? '',
      purchaseDate: toDateInputValue(asset.purchaseDate),
      purchasePrice: toMoneyValue(asset.purchasePrice),
      currentValue: toMoneyValue(asset.currentValue),
      warrantyExpiration: toDateInputValue(asset.warrantyExpiration),
      status: asset.status ?? '',
      condition: asset.condition ?? '',
      location: asset.location ?? '',
      assignedToId: asset.assignedTo?.id ?? '',
      manufacturer: asset.manufacturer ?? '',
      model: asset.model ?? '',
      notes: asset.notes ?? '',
    });
  }, [asset, reset]);

  // values.purchasePrice is already number | undefined — no '' guard needed
  const onSubmit = (values: FormValues) => {
    updateAsset({
      name: values.name,
      description: values.description || undefined,
      categoryId: values.categoryId,
      departmentId: values.departmentId,
      serialNumber: values.serialNumber || undefined,
      purchaseDate: values.purchaseDate || undefined,
      purchasePrice: values.purchasePrice,
      currentValue: values.currentValue,
      warrantyExpiration: values.warrantyExpiration || undefined,
      status: values.status || undefined,
      condition: values.condition || undefined,
      location: values.location || undefined,
      assignedToId: values.assignedToId || undefined,
      manufacturer: values.manufacturer || undefined,
      model: values.model || undefined,
      notes: values.notes || undefined,
    });
  };

  const apiMessage =
    (apiError as any)?.response?.data?.message ?? (apiError ? 'Failed to update asset.' : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Edit Asset</h3>
            <p className="text-xs text-gray-500 mt-0.5">{asset.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        <form
          id="edit-asset-form"
          onSubmit={handleSubmit(onSubmit)}
          className="overflow-y-auto px-6 py-5 space-y-5"
        >
          <section>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Basic Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input id="name" label="Name" {...register('name')} error={errors.name?.message} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-gray-900"
                  rows={2}
                  {...register('description')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-900"
                  {...register('categoryId')}
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors.categoryId && (
                  <p className="text-xs text-red-500 mt-1">{errors.categoryId.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-900"
                  {...register('departmentId')}
                >
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                {errors.departmentId && (
                  <p className="text-xs text-red-500 mt-1">{errors.departmentId.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-900"
                  {...register('assignedToId')}
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <Input id="location" label="Location" {...register('location')} />
            </div>
          </section>

          <section>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Hardware
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input id="serialNumber" label="Serial Number" {...register('serialNumber')} />
              <Input id="manufacturer" label="Manufacturer" {...register('manufacturer')} />
              <Input id="model" label="Model" {...register('model')} />
            </div>
          </section>

          <section>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Status & Condition
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-900"
                  {...register('status')}
                >
                  <option value="">Select status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="RETIRED">Retired</option>
                  <option value="DISPOSED">Disposed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-900"
                  {...register('condition')}
                >
                  <option value="">Select condition</option>
                  <option value="EXCELLENT">Excellent</option>
                  <option value="GOOD">Good</option>
                  <option value="FAIR">Fair</option>
                  <option value="POOR">Poor</option>
                </select>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Financial & Dates
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="purchasePrice"
                label="Purchase Price ($)"
                type="number"
                step="0.01"
                min="0"
                {...register('purchasePrice', { valueAsNumber: true })}
                error={errors.purchasePrice?.message}
              />
              <Input
                id="currentValue"
                label="Current Value ($)"
                type="number"
                step="0.01"
                min="0"
                {...register('currentValue', { valueAsNumber: true })}
                error={errors.currentValue?.message}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-900"
                  {...register('purchaseDate')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Expires</label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-900"
                  {...register('warrantyExpiration')}
                />
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Notes
            </h4>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-gray-900"
              rows={3}
              placeholder="Additional notes about this asset…"
              {...register('notes')}
            />
          </section>

          {apiMessage && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {apiMessage}
            </p>
          )}
        </form>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-white rounded-b-2xl">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button form="edit-asset-form" type="submit" className="flex-1" loading={isPending}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}