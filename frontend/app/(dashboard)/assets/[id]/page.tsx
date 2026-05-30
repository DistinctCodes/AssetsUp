// frontend/app/(dashboard)/assets/[id]/page.tsx
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  FileText,
  Hash,
  Wrench,
  FolderOpen,
  StickyNote,
  Pencil,
  ArrowRightLeft,
  RefreshCw,
  CheckCircle,
  Upload,
  Plus,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/assets/status-badge";
import { ConditionBadge } from "@/components/assets/condition-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AssetQRCode } from "@/opsce/features/assets/AssetQRCode";
import { AssetHistoryTimeline } from "@/opsce/features/assets/AssetHistoryTimeline";
import { DeleteAssetDialog } from "@/opsce/features/assets/DeleteAssetDialog";
import { DownloadAssetReportButton } from "@/opsce/features/assets/DownloadAssetReportButton";
import {
  useAsset,
  useAssetDocuments,
  useMaintenanceRecords,
  useAssetNotes,
  useDeleteAsset,
  useUploadDocument,
  useDeleteDocument,
  useCreateMaintenanceRecord,
  useUpdateMaintenanceStatus,
  useCreateNote,
  useDeleteNote,
} from "@/lib/query/hooks/useAsset";
import type { MaintenanceType } from "@/lib/query/types/asset";

type Tab = "overview" | "history" | "maintenance" | "documents" | "notes";

// ── Skeleton ────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-100 rounded-md ${className ?? ""}`} />
  );
}

// ── DetailRow ────────────────────────────────────────────────────────────────
function DetailRow({
  label,
  value,
  fallback = "—",
}: {
  label: string;
  value?: string | null;
  fallback?: string;
}) {
  return (
    <div className="flex justify-between text-sm">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-900 font-medium text-right">{value || fallback}</dd>
    </div>
  );
}

// ── MaintenanceStatusBadge ───────────────────────────────────────────────────
const maintenanceStatusColors: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

function MaintenanceStatusBadge({ status }: { status: string }) {
  const cls = maintenanceStatusColors[status] ?? "bg-gray-100 text-gray-500";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ── ScheduleMaintenanceModal ─────────────────────────────────────────────────
function ScheduleMaintenanceModal({
  assetId,
  onClose,
}: {
  assetId: string;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    type: "PREVENTIVE" as MaintenanceType,
    description: "",
    scheduledDate: "",
    notes: "",
  });
  const { mutate, isPending } = useCreateMaintenanceRecord(assetId, {
    onSuccess: onClose,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Schedule Maintenance
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as MaintenanceType })}
            >
              <option value="PREVENTIVE">Preventive</option>
              <option value="CORRECTIVE">Corrective</option>
              <option value="SCHEDULED">Scheduled</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Scheduled Date</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.scheduledDate}
              onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            loading={isPending}
            onClick={() =>
              mutate({
                type: form.type,
                description: form.description,
                scheduledDate: form.scheduledDate,
                notes: form.notes || undefined,
              })
            }
          >
            Schedule
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── UploadDocumentModal ──────────────────────────────────────────────────────
function UploadDocumentModal({
  assetId,
  onClose,
}: {
  assetId: string;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const { mutate: upload, isPending: uploading } = useUploadDocument(assetId, {
    onSuccess: onClose,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Upload Document</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name (optional)</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">File</label>
            <input
              type="file"
              className="w-full text-sm"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            loading={uploading}
            disabled={!file}
            onClick={() => file && upload({ file, name: name || undefined })}
          >
            Upload
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");

  // Confirm dialogs
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<string | null>(null);
  const [confirmDeleteNote, setConfirmDeleteNote] = useState<string | null>(null);

  // Modals
  const [showScheduleMaintenance, setShowScheduleMaintenance] = useState(false);
  const [showUploadDoc, setShowUploadDoc] = useState(false);

  // Note form
  const [noteContent, setNoteContent] = useState("");

  // Queries
  const { data: asset, isLoading } = useAsset(id);
  const { data: maintenance = [], isLoading: maintenanceLoading } = useMaintenanceRecords(id);
  const { data: documents = [], isLoading: documentsLoading } = useAssetDocuments(id);
  const { data: notes = [], isLoading: notesLoading } = useAssetNotes(id);

  // Mutations
  const { mutate: deleteDoc, isPending: deletingDoc } = useDeleteDocument(id);
  const { mutate: deleteNote, isPending: deletingNote } = useDeleteNote(id);
  const { mutate: addNote, isPending: addingNote } = useCreateNote(id, {
    onSuccess: () => setNoteContent(""),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-500 mb-4">Asset not found.</p>
        <Button variant="outline" onClick={() => router.push("/assets")}>
          Back to Assets
        </Button>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <FileText size={15} /> },
    { key: "history", label: "History", icon: <Clock size={15} /> },
    { key: "maintenance", label: "Maintenance", icon: <Wrench size={15} /> },
    { key: "documents", label: "Documents", icon: <FolderOpen size={15} /> },
    { key: "notes", label: "Notes", icon: <StickyNote size={15} /> },
  ];

  return (
    <div>
      {/* Back */}
      <button
        onClick={() => router.push("/assets")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5 transition-colors print:hidden"
      >
        <ArrowLeft size={16} />
        Back to Assets
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5 mb-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-gray-400 flex items-center gap-1">
                <Hash size={12} /> {asset.assetId}
              </span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">{asset.name}</h1>
            {asset.description && (
              <p className="text-sm text-gray-500 mt-1">{asset.description}</p>
            )}
            <div className="flex items-center gap-2 mt-3">
              <StatusBadge status={asset.status} />
              <ConditionBadge condition={asset.condition} />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap print:hidden">
            <Button size="sm" variant="outline">
              <ArrowRightLeft size={14} className="mr-1.5" /> Transfer
            </Button>
            <Button size="sm" variant="outline">
              <RefreshCw size={14} className="mr-1.5" /> Update Status
            </Button>
            <Button size="sm" variant="outline">
              <Pencil size={14} className="mr-1.5" /> Edit
            </Button>
            <DeleteAssetDialog assetId={id} assetName={asset.name} variant="button" />
            <DownloadAssetReportButton assetId={id} assetName={asset.name} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 overflow-x-auto print:hidden">
        {tabs.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              tab === key
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Asset Details</h2>
            <dl className="space-y-3">
              <DetailRow label="Asset ID" value={asset.assetId} />
              <DetailRow label="Category" value={asset.category?.name} />
              <DetailRow label="Department" value={asset.department?.name} />
              <DetailRow
                label="Assigned To"
                value={asset.assignedTo ? asset.assignedTo.name : undefined}
                fallback="Unassigned"
              />
              <DetailRow label="Location" value={asset.location} />
              <DetailRow label="Serial Number" value={asset.serialNumber} />
              <DetailRow label="Manufacturer" value={asset.manufacturer} />
              <DetailRow label="Model" value={asset.model} />
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Financial & Dates</h2>
            <dl className="space-y-3">
              <DetailRow
                label="Purchase Price"
                value={
                  asset.purchasePrice != null
                    ? `$${Number(asset.purchasePrice).toLocaleString()}`
                    : undefined
                }
              />
              <DetailRow
                label="Current Value"
                value={
                  asset.currentValue != null
                    ? `$${Number(asset.currentValue).toLocaleString()}`
                    : undefined
                }
              />
              <DetailRow
                label="Purchase Date"
                value={
                  asset.purchaseDate
                    ? format(new Date(asset.purchaseDate), "MMM d, yyyy")
                    : undefined
                }
              />
              <DetailRow
                label="Warranty Expires"
                value={
                  asset.warrantyExpiration
                    ? format(new Date(asset.warrantyExpiration), "MMM d, yyyy")
                    : undefined
                }
              />
              <DetailRow
                label="Registered"
                value={format(new Date(asset.createdAt), "MMM d, yyyy")}
              />
              <DetailRow
                label="Last Updated"
                value={format(new Date(asset.updatedAt), "MMM d, yyyy")}
              />
            </dl>
          </div>

          {/* QR Code */}
          <AssetQRCode assetId={id} assetName={asset.name} />

          {(asset.tags?.length || asset.notes) && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
              {asset.tags && asset.tags.length > 0 && (
                <div className="mb-4">
                  <h2 className="text-sm font-semibold text-gray-900 mb-2 print:hidden">Tags</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {asset.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {asset.notes && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 mb-2 print:hidden">Notes</h2>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{asset.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── History ── */}
      {tab === "history" && (
        <AssetHistoryTimeline assetId={id} />
      )}

      {/* ── Maintenance ── */}
      {tab === "maintenance" && (
        <MaintenanceTabContent
          assetId={id}
          maintenance={maintenance}
          loading={maintenanceLoading}
          onSchedule={() => setShowScheduleMaintenance(true)}
        />
      )}

      {/* ── Documents ── */}
      {tab === "documents" && (
        <DocumentsTabContent
          documents={documents}
          loading={documentsLoading}
          onUpload={() => setShowUploadDoc(true)}
          onDelete={(docId) => setConfirmDeleteDoc(docId)}
        />
      )}

      {/* ── Notes ── */}
      {tab === "notes" && (
        <NotesTabContent
          notes={notes}
          loading={notesLoading}
          noteContent={noteContent}
          onNoteContentChange={setNoteContent}
          addingNote={addingNote}
          onAddNote={() => addNote({ content: noteContent.trim() })}
          onDeleteNote={(noteId) => setConfirmDeleteNote(noteId)}
        />
      )}

      {/* ── Confirm Dialogs ── */}
      {confirmDeleteDoc && (
        <ConfirmDialog
          title="Delete Document"
          message="Are you sure you want to delete this document?"
          confirmLabel="Delete"
          loading={deletingDoc}
          onConfirm={() => {
            deleteDoc(confirmDeleteDoc);
            setConfirmDeleteDoc(null);
          }}
          onCancel={() => setConfirmDeleteDoc(null)}
        />
      )}

      {confirmDeleteNote && (
        <ConfirmDialog
          title="Delete Note"
          message="Are you sure you want to delete this note?"
          confirmLabel="Delete"
          loading={deletingNote}
          onConfirm={() => {
            deleteNote(confirmDeleteNote);
            setConfirmDeleteNote(null);
          }}
          onCancel={() => setConfirmDeleteNote(null)}
        />
      )}

      {/* ── Modals ── */}
      {showScheduleMaintenance && (
        <ScheduleMaintenanceModal
          assetId={id}
          onClose={() => setShowScheduleMaintenance(false)}
        />
      )}

      {showUploadDoc && (
        <UploadDocumentModal assetId={id} onClose={() => setShowUploadDoc(false)} />
      )}
    </div>
  );
}

// ── Maintenance Tab ───────────────────────────────────────────
function MaintenanceTabContent({
  assetId,
  maintenance,
  loading,
  onSchedule,
}: {
  assetId: string;
  maintenance: any[];
  loading: boolean;
  onSchedule: () => void;
}) {
  const { mutate: markComplete, isPending: markingComplete } = useUpdateMaintenanceStatus(assetId);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Maintenance Records</h2>
        <Button size="sm" onClick={onSchedule}>
          <Plus size={14} className="mr-1.5" /> Schedule Maintenance
        </Button>
      </div>
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : maintenance.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No maintenance records.</p>
      ) : (
        <div className="space-y-3">
          {maintenance.map((record) => (
            <div
              key={record.id}
              className="flex items-start justify-between border border-gray-100 rounded-lg p-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{record.type}</span>
                  <MaintenanceStatusBadge status={record.status} />
                </div>
                <p className="text-sm text-gray-600">{record.description}</p>
                <p className="text-xs text-gray-400">
                  Scheduled: {format(new Date(record.scheduledDate), "MMM d, yyyy")}
                  {record.cost != null && ` · $${Number(record.cost).toLocaleString()}`}
                </p>
              </div>
              {record.status !== "COMPLETED" && record.status !== "CANCELLED" && (
                <Button
                  size="sm"
                  variant="outline"
                  loading={markingComplete}
                  onClick={() =>
                    markComplete({ maintenanceId: record.id, status: "COMPLETED" })
                  }
                >
                  <CheckCircle size={14} className="mr-1.5" /> Mark Complete
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Documents Tab ─────────────────────────────────────────────
function DocumentsTabContent({
  documents,
  loading,
  onUpload,
  onDelete,
}: {
  documents: any[];
  loading: boolean;
  onUpload: () => void;
  onDelete: (docId: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Documents</h2>
        <Button size="sm" onClick={onUpload}>
          <Upload size={14} className="mr-1.5" /> Upload Document
        </Button>
      </div>
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : documents.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No documents uploaded.</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                <p className="text-xs text-gray-400">
                  {doc.type} · {(doc.size / 1024).toFixed(1)} KB ·{" "}
                  {format(new Date(doc.createdAt), "MMM d, yyyy")}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="!text-red-500"
                onClick={() => onDelete(doc.id)}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Notes Tab ─────────────────────────────────────────────────
function NotesTabContent({
  notes,
  loading,
  noteContent,
  onNoteContentChange,
  addingNote,
  onAddNote,
  onDeleteNote,
}: {
  notes: any[];
  loading: boolean;
  noteContent: string;
  onNoteContentChange: (content: string) => void;
  addingNote: boolean;
  onAddNote: () => void;
  onDeleteNote: (noteId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Add Note</h2>
        <textarea
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
          rows={3}
          placeholder="Write a note..."
          value={noteContent}
          onChange={(e) => onNoteContentChange(e.target.value)}
        />
        <div className="flex justify-end mt-2">
          <Button
            size="sm"
            loading={addingNote}
            disabled={!noteContent.trim()}
            onClick={onAddNote}
          >
            Add Note
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Notes</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : notes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No notes yet.</p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="border border-gray-100 rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap flex-1">
                    {note.content}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="!text-red-500 shrink-0"
                    onClick={() => onDeleteNote(note.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  {note.createdBy.name} ·{" "}
                  {format(new Date(note.createdAt), "MMM d, yyyy · h:mm a")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

