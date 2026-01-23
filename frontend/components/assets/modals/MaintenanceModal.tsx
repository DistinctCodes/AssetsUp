'use client';
import React from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useCreateMaintenanceRecord } from '@/lib/query/hooks/useAsset';
import { CreateMaintenanceInput, MaintenanceType } from '@/lib/query/types/asset';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: string;
}

const maintenanceTypes: { value: MaintenanceType; label: string }[] = [
  { value: 'PREVENTIVE', label: 'Preventive' },
  { value: 'CORRECTIVE', label: 'Corrective' },
  { value: 'SCHEDULED', label: 'Scheduled' },
];

export function MaintenanceModal({
  isOpen,
  onClose,
  assetId,
}: MaintenanceModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateMaintenanceInput>({
    defaultValues: {
      type: 'SCHEDULED',
    },
  });

  const createMaintenance = useCreateMaintenanceRecord(assetId, {
    onSuccess: () => {
      reset();
      onClose();
    },
  });

  const onSubmit = (data: CreateMaintenanceInput) => {
    createMaintenance.mutate(data);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Schedule Maintenance"
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Maintenance Type *
          </label>
          <select
            {...register('type', { required: 'Type is required' })}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {maintenanceTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          {errors.type && (
            <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description *
          </label>
          <textarea
            {...register('description', {
              required: 'Description is required',
              minLength: {
                value: 10,
                message: 'Description must be at least 10 characters',
              },
            })}
            placeholder="Describe the maintenance to be performed..."
            className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={3}
          />
          {errors.description && (
            <p className="text-red-500 text-xs mt-1">
              {errors.description.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Scheduled Date *
          </label>
          <input
            type="date"
            {...register('scheduledDate', {
              required: 'Scheduled date is required',
            })}
            min={today}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.scheduledDate && (
            <p className="text-red-500 text-xs mt-1">
              {errors.scheduledDate.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Additional Notes (Optional)
          </label>
          <textarea
            {...register('notes')}
            placeholder="Any additional notes..."
            className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={2}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMaintenance.isPending}>
            {createMaintenance.isPending ? 'Scheduling...' : 'Schedule Maintenance'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
