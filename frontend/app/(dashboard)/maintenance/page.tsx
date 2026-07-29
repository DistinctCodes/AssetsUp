"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  Calendar as CalendarIcon,
  Columns3,
  Plus,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMaintenanceRecords, useCreateMaintenanceRecord, useUpdateMaintenanceStatus } from "@/lib/query/hooks/useMaintenance";
import { useAssets, useDepartmentsList } from "@/lib/query/hooks/useAssets";
import {
  MaintenanceRecord,
  MaintenanceStatus,
  MaintenanceType,
} from "@/lib/api/maintenance";

const COLUMNS: { status: MaintenanceStatus; label: string }[] = [
  { status: "SCHEDULED", label: "Scheduled" },
  { status: "IN_PROGRESS", label: "In Progress" },
  { status: "COMPLETED", label: "Completed" },
  { status: "CANCELLED", label: "Cancelled" },
];

const TYPES: MaintenanceType[] = ["PREVENTIVE", "CORRECTIVE", "SCHEDULED"];

function isOverdue(record: MaintenanceRecord): boolean {
  if (record.status !== "SCHEDULED" || !record.scheduledDate) return false;
  return new Date(record.scheduledDate) < new Date(new Date().toDateString());
}

export default function MaintenancePage() {
  const [view, setView] = useState<"board" | "calendar">("board");
  const [typeFilter, setTypeFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showModal, setShowModal] = useState(false);

  const { data: records = [], isLoading } = useMaintenanceRecords({
    type: (typeFilter as MaintenanceType) || undefined,
    departmentId: departmentFilter || undefined,
    from: from || undefined,
    to: to || undefined,
  });
  const { data: assetsPage } = useAssets({ limit: 500 });
  const { data: departments = [] } = useDepartmentsList();
  const assetMap = useMemo(() => {
    const map = new Map<string, string>();
    (assetsPage?.data ?? []).forEach((a) => map.set(a.id, a.name));
    return map;
  }, [assetsPage]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
          <p className="text-sm text-gray-500 mt-1">
            All scheduled, in-progress and completed work orders across assets
          </p>
        </div>
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus size={15} className="mr-1" />
          New Maintenance
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setView("board")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              view === "board" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            <Columns3 size={14} />
            Board
          </button>
          <button
            onClick={() => setView("calendar")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              view === "calendar" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            <CalendarIcon size={14} />
            Calendar
          </button>
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-700"
        >
          <option value="">All Types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
          ))}
        </select>

        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-700"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <Input id="mnt-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="!py-2" />
          <span className="text-gray-400 text-sm">to</span>
          <Input id="mnt-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="!py-2" />
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-400 text-center py-16">Loading maintenance records...</div>
      ) : view === "board" ? (
        <BoardView records={records} assetMap={assetMap} />
      ) : (
        <CalendarView records={records} assetMap={assetMap} />
      )}

      {showModal && (
        <NewMaintenanceModal onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}

function BoardView({
  records,
  assetMap,
}: {
  records: MaintenanceRecord[];
  assetMap: Map<string, string>;
}) {
  const updateStatus = useUpdateMaintenanceStatus();
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const byStatus = useMemo(() => {
    const grouped: Record<MaintenanceStatus, MaintenanceRecord[]> = {
      SCHEDULED: [],
      IN_PROGRESS: [],
      COMPLETED: [],
      CANCELLED: [],
    };
    records.forEach((r) => grouped[r.status]?.push(r));
    return grouped;
  }, [records]);

  const activeRecord = records.find((r) => r.id === activeId);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const record = records.find((r) => r.id === active.id);
    const newStatus = over.id as MaintenanceStatus;
    if (!record || record.status === newStatus) return;
    updateStatus.mutate({ id: record.id, status: newStatus });
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <BoardColumn
            key={col.status}
            status={col.status}
            label={col.label}
            records={byStatus[col.status]}
            assetMap={assetMap}
          />
        ))}
      </div>
      <DragOverlay>
        {activeRecord ? (
          <MaintenanceCard record={activeRecord} assetName={assetMap.get(activeRecord.assetId)} dragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function BoardColumn({
  status,
  label,
  records,
  assetMap,
}: {
  status: MaintenanceStatus;
  label: string;
  records: MaintenanceRecord[];
  assetMap: Map<string, string>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border p-3 min-h-[200px] transition-colors ${
        isOver ? "border-gray-400 bg-gray-50" : "border-gray-200 bg-gray-50/50"
      }`}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
        <span className="text-xs text-gray-400">{records.length}</span>
      </div>
      <div className="space-y-2">
        {records.map((record) => (
          <DraggableCard key={record.id} record={record} assetName={assetMap.get(record.assetId)} />
        ))}
      </div>
    </div>
  );
}

function DraggableCard({ record, assetName }: { record: MaintenanceRecord; assetName?: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: record.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.4 : 1 }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
      <MaintenanceCard record={record} assetName={assetName} />
    </div>
  );
}

const typeColors: Record<MaintenanceType, string> = {
  PREVENTIVE: "bg-blue-100 text-blue-700",
  CORRECTIVE: "bg-orange-100 text-orange-700",
  SCHEDULED: "bg-gray-100 text-gray-700",
};

function MaintenanceCard({
  record,
  assetName,
  dragging,
}: {
  record: MaintenanceRecord;
  assetName?: string;
  dragging?: boolean;
}) {
  const overdue = isOverdue(record);
  return (
    <div
      className={`bg-white border rounded-lg p-3 shadow-sm ${
        overdue ? "border-red-300" : "border-gray-200"
      } ${dragging ? "shadow-lg" : ""}`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${typeColors[record.type]}`}>
          {record.type}
        </span>
        {overdue && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-red-600">
            <AlertCircle size={11} />
            Overdue
          </span>
        )}
      </div>
      <Link
        href={`/assets/${record.assetId}`}
        onClick={(e) => e.stopPropagation()}
        className="text-sm font-medium text-gray-900 hover:underline block truncate"
      >
        {assetName || record.assetId}
      </Link>
      <p className="text-xs text-gray-500 truncate mt-0.5">{record.title}</p>
      <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
        <span>{record.scheduledDate ? format(new Date(record.scheduledDate), "MMM d, yyyy") : "—"}</span>
        {record.cost > 0 && <span>{record.currency} {record.cost.toLocaleString()}</span>}
      </div>
    </div>
  );
}

function CalendarView({
  records,
  assetMap,
}: {
  records: MaintenanceRecord[];
  assetMap: Map<string, string>;
}) {
  const [month, setMonth] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    return eachDayOfInterval({ start, end });
  }, [month]);

  const recordsByDay = useMemo(() => {
    const map = new Map<string, MaintenanceRecord[]>();
    records.forEach((r) => {
      if (!r.scheduledDate) return;
      const key = new Date(r.scheduledDate).toDateString();
      map.set(key, [...(map.get(key) ?? []), r]);
    });
    return map;
  }, [records]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setMonth((m) => subMonths(m, 1))} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
          <ChevronLeft size={16} />
        </button>
        <h3 className="text-sm font-semibold text-gray-900">{format(month, "MMMM yyyy")}</h3>
        <button onClick={() => setMonth((m) => addMonths(m, 1))} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-lg overflow-hidden">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="bg-gray-50 text-center text-xs font-medium text-gray-500 py-2">{d}</div>
        ))}
        {days.map((day) => {
          const dayRecords = recordsByDay.get(day.toDateString()) ?? [];
          return (
            <div
              key={day.toISOString()}
              className={`bg-white min-h-[90px] p-1.5 ${!isSameMonth(day, month) ? "opacity-40" : ""}`}
            >
              <span
                className={`inline-flex items-center justify-center w-5 h-5 text-xs rounded-full ${
                  isToday(day) ? "bg-gray-900 text-white font-medium" : "text-gray-500"
                }`}
              >
                {format(day, "d")}
              </span>
              <div className="mt-1 space-y-1">
                {dayRecords.slice(0, 3).map((r) => (
                  <Link
                    key={r.id}
                    href={`/assets/${r.assetId}`}
                    className={`block truncate text-[10px] px-1.5 py-0.5 rounded ${typeColors[r.type]} ${
                      isOverdue(r) ? "ring-1 ring-red-400" : ""
                    }`}
                    title={assetMap.get(r.assetId) || r.assetId}
                  >
                    {assetMap.get(r.assetId) || r.assetId}
                  </Link>
                ))}
                {dayRecords.length > 3 && (
                  <span className="text-[10px] text-gray-400 px-1.5">+{dayRecords.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NewMaintenanceModal({ onClose }: { onClose: () => void }) {
  const { data: assetsPage } = useAssets({ limit: 500 });
  const assets = assetsPage?.data ?? [];
  const createRecord = useCreateMaintenanceRecord();

  const [assetId, setAssetId] = useState("");
  const [type, setType] = useState<MaintenanceType>("SCHEDULED");
  const [title, setTitle] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [cost, setCost] = useState("0");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId || !scheduledDate) {
      setError("Asset and scheduled date are required");
      return;
    }
    setError("");
    try {
      await createRecord.mutateAsync({
        assetId,
        type,
        title: title.trim() || undefined,
        scheduledDate,
        cost: Number(cost) || 0,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to schedule maintenance.";
      setError(message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-gray-900">New Maintenance</h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Asset *</label>
            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="">Select asset</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as MaintenanceType)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>

          <Input id="mnt-title" label="Title" placeholder="e.g. Quarterly service" value={title} onChange={(e) => setTitle(e.target.value)} />

          <div className="grid grid-cols-2 gap-3">
            <Input id="mnt-date" label="Scheduled Date *" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
            <Input id="mnt-cost" label="Cost" type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="mnt-notes" className="text-sm font-medium text-gray-700">Notes</label>
            <textarea
              id="mnt-notes"
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
            <Button type="submit" className="flex-1" loading={createRecord.isPending}>Schedule</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
