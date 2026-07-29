"use client";

import { useState } from "react";
import { Plus, KeyRound, Eye, EyeOff, X, UserMinus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useLicenses,
  useCreateLicense,
  useUpdateLicense,
  useDeleteLicense,
  useRevealLicenseKey,
  useLicenseAssignments,
  useAssignSeat,
  useUnassignSeat,
} from "@/lib/query/hooks/useLicenses";
import { useUsers } from "@/lib/query/hooks/useAssets";
import { License, LicenseType, BillingPeriod } from "@/lib/api/licenses";

function errorMessage(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
  );
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export default function LicensesPage() {
  const { data: licenses = [], isLoading } = useLicenses();
  const [formTarget, setFormTarget] = useState<{ mode: "create" | "edit"; license?: License } | null>(
    null,
  );
  const [detailLicense, setDetailLicense] = useState<License | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<License | null>(null);
  const deleteLicense = useDeleteLicense();

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteLicense.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Licenses &amp; Subscriptions</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track software seats, costs and renewal dates
          </p>
        </div>
        <Button size="sm" onClick={() => setFormTarget({ mode: "create" })}>
          <Plus size={15} className="mr-1" />
          Add License
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Vendor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Seats</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Cost</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Renewal</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    Loading licenses...
                  </td>
                </tr>
              ) : licenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    No licenses yet. Click &quot;Add License&quot; to get started.
                  </td>
                </tr>
              ) : (
                licenses.map((lic) => {
                  const pct = lic.seatsTotal > 0 ? Math.round((lic.seatsUsed / lic.seatsTotal) * 100) : 0;
                  return (
                    <tr
                      key={lic.id}
                      onClick={() => setDetailLicense(lic)}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{lic.name}</td>
                      <td className="px-4 py-3 text-gray-600">{lic.vendorId || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 w-32">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct >= 100 ? "bg-red-500" : "bg-gray-900"}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {lic.seatsUsed}/{lic.seatsTotal}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {lic.currency} {lic.cost.toLocaleString()} / {lic.billingPeriod.toLowerCase()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs ${
                            lic.renewsSoon ? "text-amber-600 font-medium" : "text-gray-500"
                          }`}
                        >
                          {lic.renewsSoon && <AlertTriangle size={12} />}
                          {formatDate(lic.expiryDate)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {lic.type}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {formTarget && (
        <LicenseFormModal
          mode={formTarget.mode}
          license={formTarget.license}
          onClose={() => setFormTarget(null)}
        />
      )}

      {detailLicense && (
        <LicenseDetailDrawer
          license={licenses.find((l) => l.id === detailLicense.id) || detailLicense}
          onClose={() => setDetailLicense(null)}
          onEdit={() => {
            setFormTarget({ mode: "edit", license: detailLicense });
            setDetailLicense(null);
          }}
          onDelete={() => {
            setDeleteTarget(detailLicense);
            setDetailLicense(null);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete license?"
          message={`"${deleteTarget.name}" will be permanently deleted, including its seat assignment history.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLicense.isPending}
        />
      )}
    </div>
  );
}

function LicenseFormModal({
  mode,
  license,
  onClose,
}: {
  mode: "create" | "edit";
  license?: License;
  onClose: () => void;
}) {
  const [name, setName] = useState(license?.name || "");
  const [vendorId, setVendorId] = useState(license?.vendorId || "");
  const [licenseKey, setLicenseKey] = useState("");
  const [type, setType] = useState<LicenseType>(license?.type || LicenseType.SUBSCRIPTION);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(
    license?.billingPeriod || BillingPeriod.YEARLY,
  );
  const [seatsTotal, setSeatsTotal] = useState(String(license?.seatsTotal ?? 1));
  const [cost, setCost] = useState(String(license?.cost ?? 0));
  const [currency, setCurrency] = useState(license?.currency || "USD");
  const [startDate, setStartDate] = useState(license?.startDate?.slice(0, 10) || "");
  const [expiryDate, setExpiryDate] = useState(license?.expiryDate?.slice(0, 10) || "");
  const [notes, setNotes] = useState(license?.notes || "");
  const [error, setError] = useState("");

  const createLicense = useCreateLicense();
  const updateLicense = useUpdateLicense();
  const isPending = createLicense.isPending || updateLicense.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || (mode === "create" && !licenseKey.trim())) {
      setError("Name and license key are required");
      return;
    }
    setError("");
    const payload = {
      name: name.trim(),
      vendorId: vendorId.trim() || undefined,
      type,
      billingPeriod,
      seatsTotal: Number(seatsTotal) || 1,
      cost: Number(cost) || 0,
      currency,
      startDate: startDate || undefined,
      expiryDate: expiryDate || undefined,
      notes: notes.trim() || undefined,
    };
    try {
      if (mode === "create") {
        await createLicense.mutateAsync({ ...payload, licenseKey: licenseKey.trim() });
      } else if (license) {
        await updateLicense.mutateAsync({ id: license.id, data: payload });
      }
      onClose();
    } catch (err) {
      setError(errorMessage(err, "Failed to save license."));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-gray-900">
            {mode === "create" ? "Add License" : "Edit License"}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input id="lic-name" label="Name *" placeholder="e.g. Adobe Creative Cloud" value={name} onChange={(e) => setName(e.target.value)} />
            <Input id="lic-vendor" label="Vendor" placeholder="e.g. Adobe" value={vendorId} onChange={(e) => setVendorId(e.target.value)} />
          </div>

          {mode === "create" && (
            <Input
              id="lic-key"
              label="License Key *"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
            />
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as LicenseType)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
                {Object.values(LicenseType).map((t) => (
                  <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Billing Period</label>
              <select value={billingPeriod} onChange={(e) => setBillingPeriod(e.target.value as BillingPeriod)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
                {Object.values(BillingPeriod).map((p) => (
                  <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
            <Input id="lic-seats" label="Total Seats" type="number" min={1} value={seatsTotal} onChange={(e) => setSeatsTotal(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input id="lic-cost" label="Cost" type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
            <Input id="lic-currency" label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input id="lic-start" label="Purchase Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input id="lic-expiry" label="Renewal Date" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="lic-notes" className="text-sm font-medium text-gray-700">Notes</label>
            <textarea
              id="lic-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={isPending}>
              {mode === "create" ? "Add License" : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LicenseDetailDrawer({
  license,
  onClose,
  onEdit,
  onDelete,
}: {
  license: License;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { data: assignments = [] } = useLicenseAssignments(license.id);
  const { data: users = [] } = useUsers();
  const revealKey = useRevealLicenseKey();
  const assignSeat = useAssignSeat(license.id);
  const unassignSeat = useUnassignSeat(license.id);

  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [error, setError] = useState("");

  const assignedUserIds = new Set(assignments.map((a) => a.userId));
  const availableUsers = users.filter((u) => !assignedUserIds.has(u.id));
  const seatsFull = license.seatsUsed >= license.seatsTotal;

  const handleReveal = async () => {
    if (revealedKey) {
      setRevealedKey(null);
      return;
    }
    const { licenseKey } = await revealKey.mutateAsync(license.id);
    setRevealedKey(licenseKey);
  };

  const handleAssign = async () => {
    if (!selectedUserId) return;
    setError("");
    try {
      await assignSeat.mutateAsync(selectedUserId);
      setSelectedUserId("");
    } catch (err) {
      setError(errorMessage(err, "Failed to assign seat."));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-900">{license.name}</h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400">Vendor</p>
              <p className="text-gray-900">{license.vendorId || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Seats</p>
              <p className="text-gray-900">{license.seatsUsed} / {license.seatsTotal}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Cost</p>
              <p className="text-gray-900">{license.currency} {license.cost.toLocaleString()} / {license.billingPeriod.toLowerCase()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Renewal</p>
              <p className={license.renewsSoon ? "text-amber-600 font-medium" : "text-gray-900"}>
                {formatDate(license.expiryDate)}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1.5 flex items-center gap-1">
              <KeyRound size={12} /> License Key
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 font-mono truncate">
                {revealedKey ?? "••••••••••••••••"}
              </code>
              <Button type="button" variant="outline" size="sm" onClick={handleReveal} loading={revealKey.isPending}>
                {revealedKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </Button>
            </div>
          </div>

          {license.notes && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Notes</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{license.notes}</p>
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-gray-900 mb-2">Seat Assignments</p>

            {assignments.length === 0 ? (
              <p className="text-xs text-gray-400 mb-3">No seats assigned yet.</p>
            ) : (
              <ul className="space-y-1.5 mb-3">
                {assignments.map((a) => {
                  const user = users.find((u) => u.id === a.userId);
                  return (
                    <li
                      key={a.id}
                      className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                    >
                      <span className="text-sm text-gray-700">{user?.name || a.userId}</span>
                      <button
                        onClick={() => unassignSeat.mutate(a.id)}
                        disabled={unassignSeat.isPending}
                        className="text-gray-400 hover:text-red-500 p-1"
                        title="Unassign seat"
                      >
                        <UserMinus size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex gap-2">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={seatsFull}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">{seatsFull ? "No seats available" : "Select a user..."}</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                onClick={handleAssign}
                disabled={seatsFull || !selectedUserId}
                loading={assignSeat.isPending}
              >
                Assign
              </Button>
            </div>
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Button variant="outline" className="flex-1" onClick={onEdit}>Edit</Button>
            <Button variant="destructive" className="flex-1" onClick={onDelete}>Delete</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
