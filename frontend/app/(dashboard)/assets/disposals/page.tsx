"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  ExternalLink,
  Package,
  Clock,
  DollarSign,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  usePendingDisposals,
  useApproveDisposal,
  useRejectDisposal,
} from "@/lib/query/hooks/useAsset";
import type { DisposalRequest, DisposalMethod } from "@/lib/query/types/asset";

const methodColors: Record<DisposalMethod, string> = {
  SOLD: "bg-green-100 text-green-700",
  DONATED: "bg-blue-100 text-blue-700",
  SCRAPPED: "bg-gray-100 text-gray-600",
  RECYCLED: "bg-teal-100 text-teal-700",
  LOST: "bg-red-100 text-red-700",
  STOLEN: "bg-red-100 text-red-800",
};

function DisposalMethodBadge({ method }: { method: DisposalMethod }) {
  const cls = methodColors[method] ?? "bg-gray-100 text-gray-600";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${cls}`}
    >
      {method.charAt(0) + method.slice(1).toLowerCase()}
    </span>
  );
}

function RejectModal({
  disposal,
  onClose,
}: {
  disposal: DisposalRequest;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const { mutate, isPending } = useRejectDisposal(
    disposal.assetId,
    disposal.id,
    { onSuccess: onClose },
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Reject Disposal Request
        </h3>
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Rejection Reason
          </label>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            rows={3}
            placeholder="Provide a reason for rejection..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            loading={isPending}
            disabled={!reason.trim()}
            onClick={() => mutate({ reason: reason.trim() })}
          >
            Reject Request
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function DisposalsPage() {
  const router = useRouter();
  const { data: disposals = [], isLoading } = usePendingDisposals();
  const [rejectTarget, setRejectTarget] = useState<DisposalRequest | null>(
    null,
  );
  const [approveTarget, setApproveTarget] = useState<DisposalRequest | null>(
    null,
  );

  const { mutate: approveDisposal, isPending: approving } = useApproveDisposal(
    approveTarget?.assetId ?? "",
    approveTarget?.id ?? "",
    {
      onSuccess: () => setApproveTarget(null),
    },
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-gray-100 rounded-md h-8 w-48" />
        <div className="animate-pulse bg-gray-100 rounded-md h-64 w-full" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Asset Disposal Requests
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Review and approve asset retirement requests
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="text-orange-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Pending Requests</p>
              <p className="text-2xl font-bold text-gray-900">
                {disposals.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      {disposals.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Package className="mx-auto text-gray-300 mb-3" size={48} />
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            No Pending Requests
          </h3>
          <p className="text-sm text-gray-500">
            All disposal requests have been processed.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {disposals.map((disposal) => (
            <div
              key={disposal.id}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <DisposalMethodBadge method={disposal.method} />
                    <span className="text-xs text-gray-400">
                      {format(
                        new Date(disposal.requestedAt),
                        "MMM d, yyyy · h:mm a",
                      )}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">
                    {disposal.asset?.name ?? "Unknown Asset"}
                  </h3>
                  <p className="text-xs text-gray-500 mb-2">
                    Asset ID: {disposal.asset?.assetId ?? disposal.assetId}
                  </p>
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <FileText size={14} className="mt-0.5 shrink-0" />
                    <p className="flex-1">{disposal.reason}</p>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Requested by:</span>
                      <span>{disposal.requestedBy.name}</span>
                    </div>
                    {disposal.method === "SOLD" && disposal.salePrice && (
                      <div className="flex items-center gap-1">
                        <DollarSign size={12} />
                        <span className="font-medium">Sale Price:</span>
                        <span className="text-green-600">
                          ${disposal.salePrice.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => setRejectTarget(disposal)}
                  >
                    <XCircle size={14} className="mr-1.5" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    loading={approving && approveTarget?.id === disposal.id}
                    onClick={() => setApproveTarget(disposal)}
                  >
                    <CheckCircle size={14} className="mr-1.5" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/assets/${disposal.assetId}`)}
                  >
                    <ExternalLink size={14} className="mr-1.5" />
                    View Asset
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve Confirm Dialog */}
      {approveTarget && (
        <ConfirmDialog
          title="Approve Disposal Request"
          message={`This will retire asset "${approveTarget.asset?.name}" and mark it as RETIRED. This action cannot be undone.`}
          confirmLabel="Approve"
          loading={approving}
          onConfirm={() => approveDisposal()}
          onCancel={() => setApproveTarget(null)}
        />
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <RejectModal
          disposal={rejectTarget}
          onClose={() => setRejectTarget(null)}
        />
      )}
    </div>
  );
}
