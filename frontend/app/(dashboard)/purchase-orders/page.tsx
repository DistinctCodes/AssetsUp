"use client";

import { useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CreatePOModal } from "@/components/purchase-orders/create-po-modal";
import { ReceiveModal } from "@/components/purchase-orders/receive-modal";
import {
  usePurchaseOrders,
  useCancelPO,
} from "@/lib/query/hooks/usePurchaseOrders";
import { PurchaseOrder, POStatus } from "@/lib/api/purchase-orders";

const STATUS_COLORS: Record<string, string> = {
  [POStatus.DRAFT]: "bg-gray-100 text-gray-700",
  [POStatus.ORDERED]: "bg-blue-100 text-blue-700",
  [POStatus.PARTIALLY_RECEIVED]: "bg-yellow-100 text-yellow-700",
  [POStatus.RECEIVED]: "bg-green-100 text-green-700",
  [POStatus.CANCELLED]: "bg-red-100 text-red-700",
};

export default function PurchaseOrdersPage() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [receiveTarget, setReceiveTarget] = useState<PurchaseOrder | null>(null);
  const [cancelTarget, setCancelTarget] = useState<PurchaseOrder | null>(null);

  const { data: orders = [], isLoading } = usePurchaseOrders();
  const cancelPO = useCancelPO();

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.poNumber.toLowerCase().includes(q) ||
      o.vendor?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage purchase orders and receive items as assets
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New PO
        </Button>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by PO number or vendor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">PO Number</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Vendor</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Items</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Expected</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No purchase orders found</td></tr>
            ) : (
              filtered.map((po) => (
                <tr key={po.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{po.poNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{po.vendor?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-center">{po.lineItems.length}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                    {po.totalAmount.toLocaleString(undefined, { style: "currency", currency: po.currency || "USD" })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[po.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {po.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {(po.status === POStatus.ORDERED || po.status === POStatus.PARTIALLY_RECEIVED) && (
                        <Button variant="outline" size="sm" onClick={() => setReceiveTarget(po)}>
                          Receive
                        </Button>
                      )}
                      {po.status === POStatus.DRAFT && (
                        <Button variant="outline" size="sm" onClick={() => setCancelTarget(po)}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreate && <CreatePOModal onClose={() => setShowCreate(false)} />}
      {receiveTarget && (
        <ReceiveModal po={receiveTarget} onClose={() => setReceiveTarget(null)} />
      )}
      <ConfirmDialog
        open={!!cancelTarget}
        onConfirm={async () => {
          if (cancelTarget) await cancelPO.mutateAsync(cancelTarget.id);
          setCancelTarget(null);
        }}
        onCancel={() => setCancelTarget(null)}
        title="Cancel Purchase Order"
        description={`Are you sure you want to cancel ${cancelTarget?.poNumber}? This cannot be undone.`}
      />
    </div>
  );
}
