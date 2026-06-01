'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import { useDeleteAsset } from '@/lib/query/hooks/useAsset';

interface DeleteAssetDialogProps {
  assetId: string;
  assetName: string;
  onDeleted?: () => void;
  variant?: 'icon' | 'button';
}

export function DeleteAssetDialog({
  assetId,
  assetName,
  onDeleted,
  variant = 'icon',
}: DeleteAssetDialogProps) {
  const [open, setOpen] = useState(false);

  const { mutate: deleteAsset, isPending } = useDeleteAsset(assetId, {
    onSuccess: () => {
      toast.success(`"${assetName}" has been deleted`);
      onDeleted?.();
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const message = (err as { message?: string })?.message;
      if (status === 403) {
        toast.error('You do not have permission to delete this asset.');
      } else if (status === 404) {
        toast.error('Asset not found. It may have already been deleted.');
      } else {
        toast.error(`Failed to delete asset: ${message || 'Unknown error'}`);
      }
    },
  });

  const handleDelete = () => {
    deleteAsset();
  };

  return (
    <>
      {variant === 'icon' ? (
        <Button
          size="sm"
          variant="outline"
          className="!text-red-600 !border-red-200 hover:!bg-red-50"
          onClick={() => setOpen(true)}
        >
          <Trash2 size={14} className="mr-1.5" />
          Delete
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="!text-red-600 !border-red-200 hover:!bg-red-50"
          onClick={() => setOpen(true)}
        >
          <Trash2 size={14} className="mr-1.5" />
          Delete Asset
        </Button>
      )}

      {open && (
        <ConfirmDialog
          title="Delete Asset"
          message={`Are you sure you want to delete "${assetName}"? This will permanently delete the asset and all associated records. This action cannot be undone.`}
          confirmLabel="Delete"
          loading={isPending}
          onConfirm={handleDelete}
          onCancel={() => setOpen(false)}
        />
      )}
    </>
  );
}
