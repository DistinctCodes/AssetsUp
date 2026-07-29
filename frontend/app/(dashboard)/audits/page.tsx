"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuditSessions, useCreateAuditSession } from "@/lib/query/hooks/useAudits";
import { useDepartmentsList } from "@/lib/query/hooks/useAssets";
import { useLocations } from "@/lib/query/hooks/useLocations";
import { AuditSessionStatus } from "@/lib/api/audits";

const statusStyles: Record<AuditSessionStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
};

function errorMessage(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
  );
}

export default function AuditsPage() {
  const router = useRouter();
  const { data: sessions = [], isLoading } = useAuditSessions();
  const [showWizard, setShowWizard] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audits / Stocktake</h1>
          <p className="text-sm text-gray-500 mt-1">
            Verify physical assets exist where the system says they do
          </p>
        </div>
        <Button size="sm" onClick={() => setShowWizard(true)}>
          <Plus size={15} className="mr-1" />
          Start Audit
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-400 text-center py-16">Loading audit sessions...</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="flex justify-center mb-3">
            <ClipboardCheck size={32} className="text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-700">No audit sessions yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Click &quot;Start Audit&quot; to run your first stocktake.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => router.push(`/audits/${session.id}`)}
              className="text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-gray-900 truncate">{session.name}</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusStyles[session.status]}`}>
                  {session.status.replace("_", " ")}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gray-900 rounded-full" style={{ width: `${session.progressPercent}%` }} />
                </div>
                <span className="text-xs text-gray-500 flex-shrink-0">{session.progressPercent}%</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{session.checkedItems}/{session.totalItems} checked</span>
                {session.discrepancyCount > 0 && (
                  <span className="text-amber-600 font-medium">{session.discrepancyCount} discrepancies</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {showWizard && <StartAuditWizard onClose={() => setShowWizard(false)} />}
    </div>
  );
}

function StartAuditWizard({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { data: departments = [] } = useDepartmentsList();
  const { data: locations = [] } = useLocations();
  const createSession = useCreateAuditSession();

  const [name, setName] = useState("");
  const [scopeType, setScopeType] = useState<"department" | "location">("department");
  const [scopeId, setScopeId] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !scopeId) {
      setError("Name and scope are required");
      return;
    }
    setError("");
    try {
      const session = await createSession.mutateAsync({
        name: name.trim(),
        departmentId: scopeType === "department" ? scopeId : undefined,
        locationId: scopeType === "location" ? scopeId : undefined,
      });
      router.push(`/audits/${session.id}`);
    } catch (err) {
      setError(errorMessage(err, "Failed to start audit session."));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-gray-900">Start Audit</h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <Input
            id="audit-name"
            label="Audit Name *"
            placeholder="e.g. Q3 2026 HQ Stocktake"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            <button
              type="button"
              onClick={() => { setScopeType("department"); setScopeId(""); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                scopeType === "department" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              By Department
            </button>
            <button
              type="button"
              onClick={() => { setScopeType("location"); setScopeId(""); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                scopeType === "location" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              By Location
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              {scopeType === "department" ? "Department *" : "Location *"}
            </label>
            <select
              value={scopeId}
              onChange={(e) => setScopeId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="">Select {scopeType}</option>
              {scopeType === "department"
                ? departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)
                : locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          <p className="text-xs text-gray-400">
            The system will generate a checklist from every asset currently assigned to this scope.
          </p>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={createSession.isPending}>
              Generate Checklist
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
