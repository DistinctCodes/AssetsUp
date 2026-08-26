"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Plus, BarChart3, Table as TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const DATASETS = ["assets", "maintenance", "transfers", "activity"] as const;
const GROUP_BY_OPTIONS = ["status", "category", "department", "month"] as const;

interface SavedReport {
  id: string;
  name: string;
  dataset: string;
  filters: Record<string, string>;
  groupBy: string;
}

export default function ReportBuilderPage() {
  const [dataset, setDataset] = useState<string>("assets");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [groupBy, setGroupBy] = useState<string>("");
  const [reportName, setReportName] = useState("");
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [showSave, setShowSave] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "chart">("table");

  const addFilter = () => setFilters((prev) => ({ ...prev, "": "" }));

  const saveReport = () => {
    if (!reportName) return;
    setSavedReports((prev) => [...prev, {
      id: Date.now().toString(),
      name: reportName,
      dataset,
      filters: { ...filters },
      groupBy,
    }]);
    setShowSave(false);
    setReportName("");
  };

  const exportCSV = () => {
    // Placeholder — would generate CSV from preview data
    const blob = new Blob(["Not yet connected to live data"], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${dataset}-report.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    // Placeholder — would use jsPDF to render preview
    alert("PDF export coming soon");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Report Builder</h1>
          <p className="text-sm text-gray-500 mt-1">Compose custom filtered reports and export</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}><Download className="w-4 h-4 mr-1" /> CSV</Button>
          <Button variant="outline" onClick={exportPDF}><Download className="w-4 h-4 mr-1" /> PDF</Button>
          <Button onClick={() => setShowSave(true)}><Plus className="w-4 h-4 mr-1" /> Save Report</Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar — compose */}
        <div className="col-span-3 bg-white border rounded-xl p-4 space-y-4">
          <h3 className="font-medium text-sm text-gray-700">Dataset</h3>
          <select value={dataset} onChange={(e) => setDataset(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
            {DATASETS.map((d) => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
          </select>

          <h3 className="font-medium text-sm text-gray-700 mt-4">Filters</h3>
          {Object.entries(filters).map(([key, val], i) => (
            <div key={i} className="flex gap-2">
              <Input placeholder="Field" value={key} onChange={(e) => {
                const newFilters = { ...filters };
                delete newFilters[key];
                newFilters[e.target.value] = val;
                setFilters(newFilters);
              }} className="flex-1" />
              <Input placeholder="Value" value={val} onChange={(e) => setFilters((p) => ({ ...p, [key]: e.target.value }))} className="flex-1" />
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addFilter}>+ Add Filter</Button>

          <h3 className="font-medium text-sm text-gray-700 mt-4">Group By</h3>
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">None</option>
            {GROUP_BY_OPTIONS.map((g) => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
          </select>
        </div>

        {/* Main — preview */}
        <div className="col-span-9 space-y-4">
          <div className="flex items-center gap-2">
            <Button variant={viewMode === "table" ? "default" : "outline"} size="sm" onClick={() => setViewMode("table")}><TableIcon className="w-4 h-4 mr-1" /> Table</Button>
            <Button variant={viewMode === "chart" ? "default" : "outline"} size="sm" onClick={() => setViewMode("chart")}><BarChart3 className="w-4 h-4 mr-1" /> Chart</Button>
          </div>
          <div className="bg-white border rounded-xl p-6 min-h-[400px] flex items-center justify-center text-gray-400 text-sm">
            {viewMode === "table" ? "Preview table will render here with TanStack Table" : "Chart preview will render here with Recharts"}
          </div>
        </div>
      </div>

      {/* Saved reports list */}
      {savedReports.length > 0 && (
        <div className="mt-8">
          <h3 className="font-medium text-gray-700 mb-3">Saved Reports</h3>
          <div className="grid grid-cols-3 gap-3">
            {savedReports.map((r) => (
              <div key={r.id} className="bg-white border rounded-lg p-3 hover:shadow-sm cursor-pointer">
                <p className="font-medium text-sm">{r.name}</p>
                <p className="text-xs text-gray-500">{r.dataset} · {Object.keys(r.filters).length} filters</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save dialog */}
      {showSave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSave(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold mb-3">Save Report</h3>
            <Input placeholder="Report name" value={reportName} onChange={(e) => setReportName(e.target.value)} className="mb-4" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSave(false)}>Cancel</Button>
              <Button onClick={saveReport}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
