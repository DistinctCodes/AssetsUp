"use client";

import React, { useEffect, useRef } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  title?: string;
  message?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  title = "Confirm",
  message = "Are you sure?",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // save previously focused element to restore later
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // lock scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // focus first focusable element in dialog
    const node = dialogRef.current;
    const focusable = node?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable) focusable.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }

      if (e.key === "Tab") {
        // simple focus trap
        const container = dialogRef.current;
        if (!container) return;
        const focusableEls = Array.from(
          container.querySelectorAll<HTMLElement>(
            'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"]), [contenteditable]'
          )
        ).filter((el) => el.offsetWidth || el.offsetHeight || el.getClientRects().length);

        if (focusableEls.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusableEls[0];
        const last = focusableEls[focusableEls.length - 1];

        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      // restore focus
      try {
        previouslyFocused.current?.focus();
      } catch (err) {
        // ignore
      }
    };
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        tabIndex={-1}
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl mx-auto p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="confirm-dialog-title" className="text-lg font-semibold text-gray-900">
              {title}
            </h2>
            <p id="confirm-dialog-description" className="mt-2 text-sm text-gray-600">
              {message}
            </p>
          </div>

          <button
            type="button"
            aria-label="Close dialog"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onCancel} className="px-4 py-2">
            Cancel
          </Button>

          <Button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 flex items-center"
            variant="destructive"
          >
            {loading && <Loader2 size={16} className="animate-spin mr-2" />}
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
