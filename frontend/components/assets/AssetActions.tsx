'use client';
import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  ArrowRightLeft,
  Wrench,
  Upload,
  MessageSquare,
  Printer,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

interface AssetActionsProps {
  assetId: string;
  assetName: string;
  onTransfer: () => void;
  onScheduleMaintenance: () => void;
  onUploadDocument: () => void;
  onAddNote: () => void;
  onPrintLabel: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

export function AssetActions({
  assetName,
  onTransfer,
  onScheduleMaintenance,
  onUploadDocument,
  onAddNote,
  onPrintLabel,
  onDelete,
  isDeleting,
}: AssetActionsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    onDelete();
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onTransfer}>
          <ArrowRightLeft className="w-4 h-4 mr-2" /> Transfer
        </Button>
        <Button size="sm" onClick={onScheduleMaintenance}>
          <Wrench className="w-4 h-4 mr-2" /> Maintenance
        </Button>
        <Button size="sm" onClick={onUploadDocument}>
          <Upload className="w-4 h-4 mr-2" /> Document
        </Button>
        <Button size="sm" onClick={onAddNote}>
          <MessageSquare className="w-4 h-4 mr-2" /> Note
        </Button>
        <Button size="sm" variant="secondary" onClick={onPrintLabel}>
          <Printer className="w-4 h-4 mr-2" /> Print Label
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShowDeleteConfirm(true)}
          className="text-red-600 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4 mr-2" /> Delete
        </Button>
      </div>

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Asset"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete <strong>{assetName}</strong>? This
              action cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => setShowDeleteConfirm(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700"
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Asset'}
          </Button>
        </div>
      </Modal>
    </>
  );
}
