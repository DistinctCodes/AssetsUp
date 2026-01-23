'use client';
import React from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useTransferAsset, useDepartments, useUsers } from '@/lib/query/hooks/useAsset';
import { TransferAssetInput } from '@/lib/query/types/asset';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: string;
}

export function TransferModal({ isOpen, onClose, assetId }: TransferModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TransferAssetInput>();

  const { data: departments = [], isLoading: loadingDepartments } = useDepartments();
  const { data: users = [], isLoading: loadingUsers } = useUsers();

  const transfer = useTransferAsset(assetId, {
    onSuccess: () => {
      reset();
      onClose();
    },
  });

  const onSubmit = (data: TransferAssetInput) => {
    transfer.mutate(data);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Transfer Asset" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Department *
          </label>
          <select
            {...register('departmentId', { required: 'Department is required' })}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loadingDepartments}
          >
            <option value="">Select department...</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
          {errors.departmentId && (
            <p className="text-red-500 text-xs mt-1">
              {errors.departmentId.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assign To (Optional)
          </label>
          <select
            {...register('assignedToId')}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loadingUsers}
          >
            <option value="">No assignment</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New Location (Optional)
          </label>
          <input
            {...register('location')}
            type="text"
            placeholder="e.g., Building A, Floor 2"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            {...register('notes')}
            placeholder="Add any notes about this transfer..."
            className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={transfer.isPending}>
            {transfer.isPending ? 'Transferring...' : 'Transfer Asset'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
