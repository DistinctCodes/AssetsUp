'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateAsset } from '@/lib/query/hooks/useAssets';
import { useDepartments } from '@/lib/query/hooks/useAsset';
import { useCategories } from '@/lib/query/hooks/useAssets';
import { AssetStatus, AssetCondition } from '@/lib/query/types/asset';

const schema = z.object({
  name: z.string().min(1, 'Asset name is required'),
  categoryId: z.string().min(1, 'Category is required'),
  departmentId: z.string().min(1, 'Department is required'),
  serialNumber: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  location: z.string().optional(),
  condition: z.nativeEnum(AssetCondition).optional(),
  status: z.nativeEnum(AssetStatus).optional(),
  purchasePrice: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateAssetModal({ onClose, onSuccess }: Props) {
  const { data: departments = [] } = useDepartments();
  const { data: categories = [] } = useCategories();
  const createAsset = useCreateAsset();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { condition: AssetCondition.NEW, status: AssetStatus.ACTIVE },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await createAsset.mutateAsync({
        name: values.name,
        categoryId: values.categoryId,
        departmentId: values.departmentId,
        serialNumber: values.serialNumber || undefined,
        manufacturer: values.manufacturer || undefined,
        model: values.model || undefined,
        location: values.location || undefined,
        condition: values.condition,
        status: values.status,
        purchasePrice: values.purchasePrice ? Number(values.purchasePrice) : undefined,
        notes: values.notes || undefined,
      });
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to register asset.';
      setError('root', { message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-gray-900">Register New Asset</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <Input id="name" label="Asset Name *" placeholder='e.g. MacBook Pro 16"' {...register('name')} error={errors.name?.message} />

          <div className="grid grid-cols-2 gap-3">
            {/* Category */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Category *</label>
              <select
                {...register('categoryId')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.categoryId && <p className="text-xs text-red-500">{errors.categoryId.message}</p>}
            </div>

            {/* Department */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Department *</label>
              <select
                {...register('departmentId')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {errors.departmentId && <p className="text-xs text-red-500">{errors.departmentId.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input id="serialNumber" label="Serial Number" placeholder="SN-12345" {...register('serialNumber')} />
            <Input id="location" label="Location" placeholder="Floor 2, Room 204" {...register('location')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input id="manufacturer" label="Manufacturer" placeholder="Apple" {...register('manufacturer')} />
            <Input id="model" label="Model" placeholder="MacBook Pro" {...register('model')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Condition */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Condition</label>
              <select
                {...register('condition')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                {Object.values(AssetCondition).map((c) => (
                  <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>

            <Input id="purchasePrice" label="Purchase Price ($)" type="number" placeholder="0.00" {...register('purchasePrice')} />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="notes" className="text-sm font-medium text-gray-700">Notes</label>
            <textarea
              id="notes"
              rows={3}
              placeholder="Any additional notes..."
              {...register('notes')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            />
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
            <Button type="submit" className="flex-1" loading={createAsset.isPending}>
              Register Asset
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
