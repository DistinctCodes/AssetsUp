'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from './modal';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  isOpen: boolean;
  variant?: 'danger' | 'default';
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isOpen,
  variant = 'default',
}: ConfirmDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);

    try {
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title={title}
      onClose={onCancel}
      footer={(
        <>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            loading={isSubmitting}
            onClick={handleConfirm}
            className={
              variant === 'danger'
                ? '!bg-red-600 !text-white hover:!bg-red-700 focus:!ring-red-500'
                : undefined
            }
          >
            {confirmLabel}
          </Button>
        </>
      )}
    >
      <p className="text-sm leading-6 text-slate-600">{message}</p>
    </Modal>
  );
}
