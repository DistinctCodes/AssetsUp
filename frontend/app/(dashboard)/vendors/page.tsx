"use client";

import { useState } from "react";
import { Plus, Search, Pencil, Trash2, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { VendorModal } from "@/components/vendors/vendor-modal";
import {
  useVendors,
  useDeleteVendor,
} from "@/lib/query/hooks/useVendors";
import { Vendor } from "@/lib/api/vendors";

export default function VendorsPage() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const { data: vendors = [], isLoading } = useVendors();
  const deleteVendor = useDeleteVendor();

  const filtered = vendors.filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      v.code.toLowerCase().includes(q) ||
      v.contactName?.toLowerCase().includes(q)
    );
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError("");
    try {
      await deleteVendor.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err: unknown) {
      setDeleteError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to delete vendor."
      );
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage suppliers and service providers for your assets
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={16} className="mr-1.5" />
          Add Vendor
        </Button>
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
          <input
            id="vendor-search"
            type="text"
            placeholder="Search by name, code, or contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Name
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Code
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Contact
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Email
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Phone
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Status
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    Loading vendors...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    {search
                      ? "No vendors match your search."
                      : 'No vendors yet. Click "Add Vendor" to get started.'}
                  </td>
                </tr>
              ) : (
                filtered.map((vendor) => (
                  <tr
                    key={vendor.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Store size={15} className="text-gray-400 flex-shrink-0" />
                        <span className="font-medium text-gray-900">
                          {vendor.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {vendor.code}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {vendor.contactName || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {vendor.email || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {vendor.phone || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={vendor.isActive ? undefined : "outline"}
                        className={
                          vendor.isActive
                            ? "bg-green-100 text-green-700"
                            : "text-gray-400"
                        }
                      >
                        {vendor.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditVendor(vendor)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                          title="Edit vendor"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteError("");
                            setDeleteTarget(vendor);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                          title="Delete vendor"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              {filtered.length} vendor{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <VendorModal mode="create" onClose={() => setShowModal(false)} />
      )}

      {editVendor && (
        <VendorModal
          mode="edit"
          vendor={editVendor}
          onClose={() => setEditVendor(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete vendor?"
          message={
            deleteError ||
            `"${deleteTarget.name}" will be permanently deleted. This is blocked if assets are still linked to this vendor.`
          }
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteVendor.isPending}
        />
      )}
    </div>
  );
}
