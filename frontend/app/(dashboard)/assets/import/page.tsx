"use client";

import { useState, useRef, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { Upload, Download, ArrowLeft, ArrowRight, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ParsedRow {
  row: number;
  data: Record<string, string>;
  valid: boolean;
  errors: string[];
}

const ASSET_FIELDS = [
  { key: "name", label: "Asset Name", required: true },
  { key: "serialNumber", label: "Serial Number" },
  { key: "manufacturer", label: "Manufacturer" },
  { key: "model", label: "Model" },
  { key: "category", label: "Category" },
  { key: "department", label: "Department" },
  { key: "status", label: "Status" },
  { key: "condition", label: "Condition" },
  { key: "purchaseDate", label: "Purchase Date" },
  { key: "purchasePrice", label: "Purchase Price" },
  { key: "location", label: "Location" },
  { key: "notes", label: "Notes" },
];

export default function BulkImportPage() {
  const router = useRouter();
  const [step, setStep] = useState<"upload" | "map" | "dryrun" | "commit">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [dryRunResult, setDryRunResult] = useState<{ valid: number; errors: ParsedRow[] } | null>(null);
  const [commitResult, setCommitResult] = useState<{ created: number; failed: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter(Boolean);
      if (lines.length < 2) return;
      const hdrs = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
      const dataLines = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
        const row: Record<string, string> = {};
        hdrs.forEach((h, i) => { row[h] = values[i] || ""; });
        return row;
      });
      setHeaders(hdrs);
      setRows(dataLines);
      // Auto-map by header name similarity
      const autoMap: Record<string, string> = {};
      ASSET_FIELDS.forEach((f) => {
        const match = hdrs.find((h) => h.toLowerCase().replace(/[_\s]/g, "") === f.key.toLowerCase());
        if (match) autoMap[f.key] = match;
      });
      setMapping(autoMap);
    };
    reader.readAsText(f);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] },
    maxFiles: 1,
  });

  const autoMap = () => {
    const newMap: Record<string, string> = {};
    ASSET_FIELDS.forEach((f) => {
      const match = headers.find((h) => h.toLowerCase().replace(/[_\s]/g, "") === f.key.toLowerCase());
      if (match) newMap[f.key] = match;
    });
    setMapping(newMap);
  };

  const runDryRun = async () => {
    setLoading(true);
    const errors: ParsedRow[] = [];
    rows.forEach((row, idx) => {
      const rowErrors: string[] = [];
      ASSET_FIELDS.filter((f) => f.required).forEach((f) => {
        const col = mapping[f.key];
        if (!col || !row[col]?.trim()) rowErrors.push(`${f.label} is required`);
      });
      errors.push({ row: idx + 2, data: row, valid: rowErrors.length === 0, errors: rowErrors });
    });
    setDryRunResult({ valid: errors.filter((e) => e.valid).length, errors: errors.filter((e) => !e.valid) });
    setLoading(false);
    setStep("dryrun");
  };

  const commitImport = async () => {
    setLoading(true);
    // In real implementation, this calls POST /api/assets/bulk-import
    setCommitResult({ created: rows.length, failed: 0 });
    setLoading(false);
    setStep("commit");
  };

  const STEPS = ["upload", "map", "dryrun", "commit"];
  const currentIdx = STEPS.indexOf(step);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bulk Import Assets</h1>
        <p className="text-sm text-gray-500 mt-1">Import assets from a CSV or Excel file</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              i < currentIdx ? "bg-green-500 text-white" : i === currentIdx ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
            }`}>
              {i < currentIdx ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-sm capitalize ${i === currentIdx ? "font-medium text-gray-900" : "text-gray-500"}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-gray-300" />}
          </div>
        ))}
      </div>

      {/* Upload Step */}
      {step === "upload" && (
        <div className="space-y-4">
          <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
          }`}>
            <input {...getInputProps()} />
            <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            {file ? (
              <p className="text-sm text-gray-700">{file.name} ({rows.length} rows)</p>
            ) : (
              <p className="text-sm text-gray-500">Drop a CSV or Excel file here, or click to browse</p>
            )}
          </div>
          <Button variant="outline" onClick={() => window.open("/api/assets/import-template", "_blank")}>
            <Download className="w-4 h-4 mr-2" /> Download Template
          </Button>
          {file && <Button onClick={() => setStep("map")}>Next: Map Columns <ArrowRight className="w-4 h-4 ml-2" /></Button>}
        </div>
      )}

      {/* Map Step */}
      {step === "map" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Map Columns</h2>
            <Button variant="outline" size="sm" onClick={autoMap}>Auto-Map</Button>
          </div>
          <div className="bg-white border rounded-xl divide-y">
            {ASSET_FIELDS.map((field) => (
              <div key={field.key} className="flex items-center gap-4 px-4 py-3">
                <span className="w-40 text-sm font-medium text-gray-700">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </span>
                <select
                  value={mapping[field.key] || ""}
                  onChange={(e) => setMapping((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                >
                  <option value="">— Not mapped —</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("upload")}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
            <Button onClick={() => setStep("dryrun")}>Next: Dry Run <ArrowRight className="w-4 h-4 ml-2" /></Button>
          </div>
        </div>
      )}

      {/* Dry Run Step */}
      {step === "dryrun" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Dry Run Results</h2>
          {dryRunResult ? (
            <>
              <div className="flex gap-4">
                <Badge className="bg-green-100 text-green-700">{dryRunResult.valid} valid</Badge>
                <Badge className="bg-red-100 text-red-700">{dryRunResult.errors.length} errors</Badge>
              </div>
              {dryRunResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 max-h-64 overflow-y-auto">
                  {dryRunResult.errors.map((e) => (
                    <div key={e.row} className="text-sm text-red-700 mb-2">
                      <strong>Row {e.row}:</strong> {e.errors.join(", ")}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("map")}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
                <Button onClick={commitImport} disabled={dryRunResult.errors.length > 0 || loading}>
                  {loading ? "Importing..." : "Commit Import"}
                </Button>
              </div>
            </>
          ) : (
            <Button onClick={runDryRun} disabled={loading}>{loading ? "Running..." : "Run Dry Run"}</Button>
          )}
        </div>
      )}

      {/* Commit Step */}
      {step === "commit" && commitResult && (
        <div className="text-center py-12">
          <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Import Complete</h2>
          <p className="text-gray-500 mb-6">{commitResult.created} assets created, {commitResult.failed} failed</p>
          <Button onClick={() => router.push("/assets")}>View Assets</Button>
        </div>
      )}
    </div>
  );
}
