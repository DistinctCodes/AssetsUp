"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useReceiveLineItems } from "@/lib/query/hooks/usePurchaseOrders";
import { PurchaseOrder } from "@/lib/api/purchase-orders";

interface Props {
  po: PurchaseOrder;
  onClose: () => void;
}

export function ReceiveModal({ po, onClose }: Props) {
  const receiveItems = useReceiveLineItems();
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(po.lineItems.map((li) => [li.id ?? li.description, li.quantity - (li.receivedQuantity ?? 0)]))
  );
  const [error, setError] = useState("");

  const handleChange = (key: string, value: number) => {
    setQuantities((prev) => ({ ...prev, [key]: Math.max(0, value) }));
  };

  const handleSubmit = async () => {
    const items = po.lineItems
      .filter((li) => {
        const key = li.id ?? li.description;
        return (quantities[key] ?? 0) > 0;
      })
      .map((li) => ({
        lineItemId: li.id ?? "",
        receivedQuantity: quantities[li.id ?? li.description] ?? 0,
      }));

    if (items.length === 0) {
      setError("Enter at least one quantity to receive");
      return;
    }

    try {
      await receiveItems.mutateAsync({ id: po.id, items });
      onClose();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to receive items");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-gray-900">Receive Items — {po.poNumber}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
          <p className="text-sm text-gray-500">
            Enter the quantity received for each line item. Received items will be created as assets.
          </p>
          <div className="space-y-3">
            {po.lineItems.map((li) => {
              const key = li.id ?? li.description;
              const remaining = li.quantity - (li.receivedQuantity ?? 0);
              return (
                <div key={key} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{li.description}</p>
                    <p className="text-xs text-gray-500">
                      Ordered: {li.quantity} | Received: {li.receivedQuantity ?? 0} | Remaining: {remaining}
                    </p>
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      min={0}
                      max={remaining}
                      value={quantities[key] ?? 0}
                      onChange={(e) => handleChange(key, Number(e.target.value))}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={receiveItems.isPending}>
              {receiveItems.isPending ? "Receiving..." : "Receive & Create Assets"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
