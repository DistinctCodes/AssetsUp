"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreatePO } from "@/lib/query/hooks/usePurchaseOrders";
import { useVendors } from "@/lib/query/hooks/useVendors";

const schema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  expectedDate: z.string().optional(),
  lineItems: z.array(
    z.object({
      description: z.string().min(1, "Description is required"),
      category: z.string().optional(),
      quantity: z.number().min(1, "Quantity must be at least 1"),
      unitPrice: z.number().min(0, "Price must be positive"),
    })
  ).min(1, "At least one line item is required"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onClose: () => void;
}

export function CreatePOModal({ onClose }: Props) {
  const { data: vendors = [] } = useVendors();
  const createPO = useCreatePO();
  const [error, setError] = useState("");

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      lineItems: [{ description: "", category: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lineItems" });
  const lineItems = watch("lineItems");
  const total = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  const onSubmit = async (values: FormValues) => {
    try {
      await createPO.mutateAsync({
        vendorId: values.vendorId,
        lineItems: values.lineItems,
        expectedDate: values.expectedDate || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to create PO");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-gray-900">Create Purchase Order</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor *</label>
            <select {...register("vendorId")} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Select vendor...</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            {errors.vendorId && <p className="text-xs text-red-500 mt-1">{errors.vendorId.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expected Date</label>
            <Input type="date" {...register("expectedDate")} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Line Items *</label>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ description: "", category: "", quantity: 1, unitPrice: 0 })}>
                <Plus className="w-3 h-3 mr-1" /> Add Item
              </Button>
            </div>
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-start bg-gray-50 p-3 rounded-lg">
                  <div className="col-span-4">
                    <Input placeholder="Description" {...register(`lineItems.${index}.description`)} />
                  </div>
                  <div className="col-span-2">
                    <Input placeholder="Category" {...register(`lineItems.${index}.category`)} />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" placeholder="Qty" {...register(`lineItems.${index}.quantity`, { valueAsNumber: true })} />
                  </div>
                  <div className="col-span-3">
                    <Input type="number" step="0.01" placeholder="Unit Price" {...register(`lineItems.${index}.unitPrice`, { valueAsNumber: true })} />
                  </div>
                  <div className="col-span-1 flex items-center justify-center">
                    {fields.length > 1 && (
                      <button type="button" onClick={() => remove(index)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {errors.lineItems && <p className="text-xs text-red-500 mt-1">{errors.lineItems.message}</p>}
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <span className="text-lg font-semibold text-gray-900">
              Total: {total.toLocaleString(undefined, { style: "currency", currency: "USD" })}
            </span>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={createPO.isPending}>
                {createPO.isPending ? "Creating..." : "Create PO"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
