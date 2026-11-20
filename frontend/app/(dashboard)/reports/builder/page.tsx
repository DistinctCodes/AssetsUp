"use client";

import { useState } from "react";
import { Download, BarChart3, Table as TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DATASETS = ["assets", "maintenance", "transfers", "activity"] as const;
const GROUP_BY_OPTIONS = ["status", "category", "department", "month"] as const;

export default function ReportBuilderPage() {
  const [dataset, setDataset] = useState<string>("assets");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [groupBy, setGroupBy] = useState<string>("");
  const [viewMode, setViewMode] = useState<"table" | "chart">("table");

  const addFilter = () => setFilters((prev) => ({ ...prev, "": "" }));

  const exportCSV = () => {
    const blob = new Blob(["Not yet connected to live data"], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${dataset}-report.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    alert("PDF export coming soon");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Report Builder</h1>
          <p className="text-sm text-gray-500 mt-1">Compose custom filtered reports and export</p>
          {/* Saving reports is hidden until the backend has a saved-reports module. */}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}><Download className="w-4 h-4 mr-1" /> CSV</Button>
          <Button variant="outline" onClick={exportPDF}><Download className="w-4 h-4 mr-1" /> PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
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
    </div>
  );
}