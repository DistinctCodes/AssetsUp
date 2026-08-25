"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateVendor,
  useUpdateVendor,
} from "@/lib/query/hooks/useVendors";
import { Vendor, CreateVendorInput } from "@/lib/api/vendors";

const schema = z.object({
  name: z.string().min(1, "Vendor name is required"),
  code: z.string().min(1, "Vendor code is required"),
  contactName: z.string().optional(),
  email: z
    .string()
    .optional()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: "Invalid email address",
    }),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  taxId: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  mode: "create" | "edit";
  vendor?: Vendor;
  onClose: () => void;
}

export function VendorModal({ mode, vendor, onClose }: Props) {
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();
  const isPending = createVendor.isPending || updateVendor.isPending;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: vendor
      ? {
          name: vendor.name,
          code: vendor.code,
          contactName: vendor.contactName ?? "",
          email: vendor.email ?? "",
          phone: vendor.phone ?? "",
          address: vendor.address ?? "",
          website: vendor.website ?? "",
          taxId: vendor.taxId ?? "",
          notes: vendor.notes ?? "",
        }
      : undefined,
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const payload: CreateVendorInput = {
        name: values.name.trim(),
        code: values.code.trim(),
        contactName: values.contactName?.trim() || undefined,
        email: values.email?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        address: values.address?.trim() || undefined,
        website: values.website?.trim() || undefined,
        taxId: values.taxId?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
      };

      if (mode === "create") {
        await createVendor.mutateAsync(payload);
      } else if (vendor) {
        await updateVendor.mutateAsync({ id: vendor.id, data: payload });
      }
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to save vendor.";
      setError("root", { message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-gray-900">
            {mode === "create" ? "New Vendor" : "Edit Vendor"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close vendor modal"
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="vendor-name"
              label="Vendor Name *"
              placeholder="e.g. Acme Supplies"
              {...register("name")}
              error={errors.name?.message}
            />
            <Input
              id="vendor-code"
              label="Vendor Code *"
              placeholder="e.g. VND-001"
              {...register("code")}
              error={errors.code?.message}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              id="vendor-contact"
              label="Contact Person"
              placeholder="e.g. Jane Smith"
              {...register("contactName")}
            />
            <Input
              id="vendor-email"
              label="Email"
              type="email"
              placeholder="e.g. jane@acme.com"
              {...register("email")}
              error={errors.email?.message}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              id="vendor-phone"
              label="Phone"
              placeholder="e.g. +1 234 567 890"
              {...register("phone")}
            />
            <Input
              id="vendor-website"
              label="Website"
              placeholder="e.g. https://acme.com"
              {...register("website")}
            />
          </div>

          <Input
            id="vendor-address"
            label="Address"
            placeholder="e.g. 123 Main St, Lagos, Nigeria"
            {...register("address")}
          />

          <Input
            id="vendor-taxId"
            label="Tax ID"
            placeholder="e.g. 12345678-0001"
            {...register("taxId")}
          />

          <div className="flex flex-col gap-1">
            <label
              htmlFor="vendor-notes"
              className="text-sm font-medium text-gray-700"
            >
              Notes
            </label>
            <Textarea
              id="vendor-notes"
              rows={3}
              placeholder="Any additional notes about this vendor..."
              {...register("notes")}
            />
          </div>

          {errors.root && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {errors.root.message}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={isPending}>
              {mode === "create" ? "Create Vendor" : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
