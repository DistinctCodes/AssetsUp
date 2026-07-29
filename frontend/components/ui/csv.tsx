"use client";

import { Download } from "lucide-react";
import { Button } from "./button";

function toCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Converts an array of flat objects into CSV text (header row + one row per record). */
export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T; label: string }[],
): string {
  const header = columns.map((c) => toCsvValue(c.label)).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => toCsvValue(row[c.key])).join(","),
  );
  return [header, ...lines].join("\n");
}

/** Triggers a browser download of the given CSV text. */
export function downloadCsv(filename: string, csvText: string) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToCsv<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  columns: { key: keyof T; label: string }[],
) {
  downloadCsv(filename, toCsv(rows, columns));
}

interface CsvExportButtonProps<T extends Record<string, unknown>> {
  filename: string;
  rows: T[];
  columns: { key: keyof T; label: string }[];
  label?: string;
  disabled?: boolean;
}

export function CsvExportButton<T extends Record<string, unknown>>({
  filename,
  rows,
  columns,
  label = "Export CSV",
  disabled,
}: CsvExportButtonProps<T>) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled || rows.length === 0}
      onClick={() => exportToCsv(filename, rows, columns)}
    >
      <Download size={15} className="mr-1.5" />
      {label}
    </Button>
  );
}
