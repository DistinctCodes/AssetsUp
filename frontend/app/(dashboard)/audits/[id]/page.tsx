"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Search, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CsvExportButton } from "@/components/ui/csv";
import {
  useAuditSession,
  useRecordAuditItem,
  useCompleteAuditSession,
} from "@/lib/query/hooks/useAudits";
import { useAssets } from "@/lib/query/hooks/useAssets";
import { useLocations } from "@/lib/query/hooks/useLocations";
import { AuditItem, AuditItemResult } from "@/lib/api/audits";

const RESULT_OPTIONS: { value: AuditItemResult; label: string; className: string }[] = [
  { value: "FOUND", label: "Found", className: "bg-green-100 text-green-700 border-green-200" },
  { value: "MISSING", label: "Missing", className: "bg-red-100 text-red-700 border-red-200" },
  { value: "WRONG_LOCATION", label: "Wrong Location", className: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "DAMAGED", label: "Damaged", className: "bg-orange-100 text-orange-700 border-orange-200" },
];

const resultLabel: Record<AuditItemResult, string> = {
  PENDING: "Pending",
  FOUND: "Found",
  MISSING: "Missing",
  WRONG_LOCATION: "Wrong Location",
  DAMAGED: "Damaged",
};

export default function AuditSessionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session, isLoading } = useAuditSession(params.id);
  const { data: assetsPage } = useAssets({ limit: 500 });
  const { data: locations = [] } = useLocations();
  const recordItem = useRecordAuditItem(params.id);
  const completeSession = useCompleteAuditSession(params.id);

  const [search, setSearch] = useState("");
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const assetMap = useMemo(() => {
    const map = new Map<string, string>();
    (assetsPage?.data ?? []).forEach((a) => map.set(a.id, a.name));
    return map;
  }, [assetsPage]);

  const locationMap = useMemo(() => {
    const map = new Map<string, string>();
    locations.forEach((l) => map.set(l.id, l.name));
    return map;
  }, [locations]);

  if (isLoading || !session) {
    return <div className="text-sm text-gray-400 text-center py-16">Loading audit session...</div>;
  }

  const isCompleted = session.status === "COMPLETED";
  const filteredItems = session.items.filter((item) => {
    if (!search.trim()) return true;
    const assetName = assetMap.get(item.assetId) || "";
    return assetName.toLowerCase().includes(search.trim().toLowerCase());
  });

  const discrepancies = session.items.filter((i) => i.result !== "PENDING" && i.result !== "FOUND");

  const handleRecord = (item: AuditItem, result: AuditItemResult) => {
    recordItem.mutate({
      itemId: item.id,
      data: { result, note: noteDrafts[item.id] ?? item.note ?? undefined },
    });
  };

  return (
    <div>
      <button
        onClick={() => router.push("/audits")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4"
      >
        <ArrowLeft size={15} />
        Back to audits
      </button>

      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">{session.name}</h1>
        <div className="flex items-center gap-2">
          {isCompleted && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
              <Lock size={12} />
              Immutable
            </span>
          )}
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              isCompleted ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
            }`}
          >
            {session.status.replace("_", " ")}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-md">
          <div className="h-full bg-gray-900 rounded-full" style={{ width: `${session.progressPercent}%` }} />
        </div>
        <span className="text-sm text-gray-500">
          {session.checkedItems}/{session.totalItems} checked ({session.progressPercent}%)
        </span>
      </div>

      {isCompleted && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Discrepancy Report</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {discrepancies.length} item{discrepancies.length !== 1 ? "s" : ""} not matching expectations
              </p>
            </div>
            <CsvExportButton
              filename={`audit-${session.id}-discrepancies`}
              rows={discrepancies.map((d) => ({
                asset: assetMap.get(d.assetId) || d.assetId,
                expectedLocation: d.expectedLocationId ? locationMap.get(d.expectedLocationId) || "" : "",
                result: resultLabel[d.result],
                note: d.note || "",
                checkedAt: d.checkedAt || "",
              }))}
              columns={[
                { key: "asset", label: "Asset" },
                { key: "expectedLocation", label: "Expected Location" },
                { key: "result", label: "Result" },
                { key: "note", label: "Note" },
                { key: "checkedAt", label: "Checked At" },
              ]}
            />
          </div>

          {discrepancies.length === 0 ? (
            <p className="text-sm text-gray-500 flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-green-500" />
              No discrepancies — every asset was found where expected.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {discrepancies.map((d) => (
                <li key={d.id} className="py-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-900">{assetMap.get(d.assetId) || d.assetId}</span>
                  <span className="text-gray-500">{resultLabel[d.result]}{d.note ? ` — ${d.note}` : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!isCompleted && (
        <div className="flex items-center justify-between mb-4">
          <div className="relative max-w-sm flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets to verify..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <Button size="sm" onClick={() => setShowCompleteConfirm(true)}>
            Complete Audit
          </Button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {filteredItems.map((item) => (
          <div key={item.id} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium text-gray-900">{assetMap.get(item.assetId) || item.assetId}</p>
                <p className="text-xs text-gray-400">
                  Expected: {item.expectedLocationId ? locationMap.get(item.expectedLocationId) || "—" : "No location set"}
                </p>
              </div>
              <span className="text-xs font-medium text-gray-500">{resultLabel[item.result]}</span>
            </div>

            {!isCompleted && (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {RESULT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleRecord(item, opt.value)}
                    disabled={recordItem.isPending}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-opacity ${opt.className} ${
                      item.result === opt.value ? "opacity-100 ring-1 ring-offset-1 ring-current" : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                <input
                  placeholder="Add a note..."
                  value={noteDrafts[item.id] ?? item.note ?? ""}
                  onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  onBlur={() => {
                    if (item.result !== "PENDING") handleRecord(item, item.result);
                  }}
                  className="flex-1 min-w-[140px] text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            )}
            {isCompleted && item.note && (
              <p className="text-xs text-gray-500 mt-1">{item.note}</p>
            )}
          </div>
        ))}
        {filteredItems.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-10">No assets match your search.</p>
        )}
      </div>

      {showCompleteConfirm && (
        <ConfirmDialog
          title="Complete this audit?"
          message="Once completed, results become read-only and cannot be edited. Any unchecked assets will stay unresolved in the discrepancy report."
          confirmLabel="Complete Audit"
          onConfirm={async () => {
            await completeSession.mutateAsync();
            setShowCompleteConfirm(false);
          }}
          onCancel={() => setShowCompleteConfirm(false)}
          loading={completeSession.isPending}
        />
      )}
    </div>
  );
}
