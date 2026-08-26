"use client";

import { useState } from "react";
import { Search, Check, X, ArrowRightLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useTransfers,
  useApproveTransfer,
  useRejectTransfer,
  useCancelTransfer,
} from "@/lib/query/hooks/useTransfers";
import { TransferStatus } from "@/lib/api/transfers";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

type Tab = "pending" | "my-requests" | "history";

export default function TransfersPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [rejectTarget, setRejectTarget] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data, isLoading } = useTransfers({ page: 1, limit: 100 });
  const approveMutation = useApproveTransfer();
  const rejectMutation = useRejectTransfer();
  const cancelMutation = useCancelTransfer();

  const transfers = data?.items ?? [];
  const pending = transfers.filter((t) => t.status === TransferStatus.PENDING);
  const history = transfers.filter((t) => t.status !== TransferStatus.PENDING);

  const currentList = tab === "pending" ? pending : history;

  const handleApprove = (id: string) => {
    approveMutation.mutate(id);
  };

  const handleReject = () => {
    if (!rejectTarget) return;
    rejectMutation.mutate(
      { id: rejectTarget.id, data: { reason: rejectReason } },
      {
        onSuccess: () => {
          setRejectTarget(null);
          setRejectReason("");
        },
      }
    );
  };

  const handleCancel = (id: string) => {
    cancelMutation.mutate(id);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Transfers</h1>
        <p className="text-sm text-gray-500 mt-1">Manage asset transfer requests</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button onClick={() => setTab("pending")} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${
          tab === "pending" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
        }`}>
          <Clock className="w-3.5 h-3.5" /> Pending
          {pending.length > 0 && <span className="ml-1 bg-yellow-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{pending.length}</span>}
        </button>
        <button onClick={() => setTab("history")} className={`px-4 py-2 rounded-md text-sm font-medium ${
          tab === "history" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
        }`}>
          History
        </button>
      </div>

      {/* Transfers list */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-white border rounded-xl p-12 text-center">
            <p className="text-gray-500">Loading transfers...</p>
          </div>
        ) : currentList.length === 0 ? (
          <div className="bg-white border rounded-xl p-12 text-center">
            <ArrowRightLeft className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No transfers to show</p>
          </div>
        ) : (
          currentList.map((t) => (
            <div key={t.id} className="bg-white border rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900">Asset {t.assetId.slice(0, 8)}</p>
                    <Badge variant="outline" className={STATUS_COLORS[t.status]}>
                      {t.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">
                    {t.fromDepartmentId.slice(0, 8)} → {t.toDepartmentId.slice(0, 8)} · {new Date(t.createdAt).toLocaleDateString()}
                  </p>
                  {t.rejectionReason && <p className="text-xs text-red-500 mt-1">Rejection reason: {t.rejectionReason}</p>}
                </div>
                <div className="flex gap-2">
                  {tab === "pending" && (
                    <>
                      <Button size="sm" onClick={() => handleApprove(t.id)} disabled={approveMutation.isPending}>
                        <Check className="w-3 h-3 mr-1" /> Approve
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setRejectTarget({ id: t.id })} disabled={rejectMutation.isPending}>
                        <X className="w-3 h-3 mr-1" /> Reject
                      </Button>
                    </>
                  )}
                  {tab === "history" && t.status === TransferStatus.PENDING && (
                    <Button variant="outline" size="sm" onClick={() => handleCancel(t.id)} disabled={cancelMutation.isPending}>Cancel</Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reject dialog */}
      <ConfirmDialog
        open={!!rejectTarget}
        onConfirm={handleReject}
        onCancel={() => { setRejectTarget(null); setRejectReason(""); }}
        title="Reject Transfer"
        description={
          <div>
            <p className="mb-2">Provide a reason for rejecting this transfer:</p>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm" rows={3} placeholder="Rejection reason..." />
          </div>
        }
      />
    </div>
  );
}
