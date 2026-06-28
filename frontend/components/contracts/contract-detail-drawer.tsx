// frontend/components/contracts/contract-detail-drawer.tsx
"use client";

import { useState } from "react";
import { X, Upload, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContractStatus, ContractType } from "@/lib/query/types/contract";
import { ContractStatusBadge } from "./status-badge";
import { ContractTypeBadge } from "./type-badge";
import { useUploadContractDocument } from "@/lib/query/hooks/useContracts";

interface Props {
  contract: {
    id: string;
    contractId: string;
    title: string;
    vendor: string;
    contractType?: ContractType;
    startDate: string | null;
    endDate: string | null;
    value: number | null;
    status: ContractStatus;
    description: string | null;
    documentUrl: string | null;
    renewalAlertDays: number;
    notes: string | null;
    createdBy?: {
      id: string;
      name: string;
      email: string;
    } | null;
    assignedTo?: {
      id: string;
      name: string;
      email: string;
    } | null;
    createdAt: string;
    updatedAt: string;
  };
  onClose: () => void;
  onUpdate?: () => void;
}

export function ContractDetailDrawer({ contract, onClose, onUpdate }: Props) {
  const [uploading, setUploading] = useState(false);
  const uploadDocument = useUploadContractDocument(contract.id);

  const handleDocumentUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadDocument.mutateAsync({ file });
      onUpdate?.();
    } catch (error) {
      console.error("Failed to upload document:", error);
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const getDaysUntilExpiry = () => {
    if (!contract.endDate) return null;
    const end = new Date(contract.endDate);
    const now = new Date();
    const diff = Math.ceil(
      (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    return diff;
  };

  const daysUntilExpiry = getDaysUntilExpiry();

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-2xl bg-white shadow-xl h-full overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {contract.title}
            </h2>
            <p className="text-sm text-gray-500 font-mono mt-0.5">
              {contract.contractId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-6">
          {/* Status & Type */}
          <div className="flex gap-3">
            <ContractStatusBadge status={contract.status} />
            {contract.contractType && (
              <ContractTypeBadge type={contract.contractType} />
            )}
          </div>

          {/* Key Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Vendor
              </label>
              <p className="mt-1 text-sm text-gray-900 font-medium">
                {contract.vendor}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Contract Value
              </label>
              <p className="mt-1 text-sm text-gray-900 font-medium">
                {formatCurrency(contract.value)}
              </p>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Start Date
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {formatDate(contract.startDate)}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                End Date
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {formatDate(contract.endDate)}
              </p>
            </div>
          </div>

          {/* Days Until Expiry */}
          {daysUntilExpiry !== null && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Days Until Expiry
              </label>
              <div className="mt-1">
                {daysUntilExpiry < 0 ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    Expired {Math.abs(daysUntilExpiry)} days ago
                  </span>
                ) : daysUntilExpiry <= 30 ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                    Expires in {daysUntilExpiry} days
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    {daysUntilExpiry} days remaining
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Renewal Alert */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Renewal Alert
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {contract.renewalAlertDays || 30} days before expiry
            </p>
          </div>

          {/* People */}
          {(contract.createdBy || contract.assignedTo) && (
            <div className="grid grid-cols-2 gap-4">
              {contract.createdBy && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Created By
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {contract.createdBy.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {contract.createdBy.email}
                  </p>
                </div>
              )}
              {contract.assignedTo && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Assigned To
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {contract.assignedTo.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {contract.assignedTo.email}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {contract.description && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Description
              </label>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                {contract.description}
              </p>
            </div>
          )}

          {/* Notes */}
          {contract.notes && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Notes
              </label>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                {contract.notes}
              </p>
            </div>
          )}

          {/* Document */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Contract Document
            </label>
            <div className="mt-2 space-y-3">
              {contract.documentUrl ? (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Download size={16} className="text-gray-500" />
                  <a
                    href={contract.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    Download Document
                    <ExternalLink size={12} />
                  </a>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No document uploaded</p>
              )}

              {/* Upload New Document */}
              <div>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg cursor-pointer hover:bg-gray-800 transition-colors">
                  <Upload size={16} />
                  {uploading ? "Uploading..." : "Upload Document"}
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleDocumentUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
              <div>
                <span className="font-medium">Created:</span>{" "}
                {new Date(contract.createdAt).toLocaleString()}
              </div>
              <div>
                <span className="font-medium">Last Updated:</span>{" "}
                {new Date(contract.updatedAt).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
