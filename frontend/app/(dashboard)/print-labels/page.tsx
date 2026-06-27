"use client";

import { useState } from "react";
import { Printer, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PrintAsset {
  id: string;
  assetId: string;
  name: string;
  category: string;
  department: string;
}

const MOCK: PrintAsset[] = [
  {
    id: "1",
    assetId: "AST-001",
    name: "Dell Laptop #1",
    category: "IT",
    department: "Engineering",
  },
  {
    id: "2",
    assetId: "AST-002",
    name: "HP Monitor",
    category: "IT",
    department: "Design",
  },
  {
    id: "3",
    assetId: "AST-003",
    name: "Office Chair",
    category: "Furniture",
    department: "HR",
  },
  {
    id: "4",
    assetId: "AST-004",
    name: "Canon Printer",
    category: "IT",
    department: "Admin",
  },
];

export default function QRLabelPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggleAll = () =>
    setSelected((prev) =>
      prev.size === MOCK.length ? new Set() : new Set(MOCK.map((a) => a.id)),
    );
  const toggle = (id: string) =>
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Label &amp; QR Code Printing
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Select assets and print asset labels
          </p>
        </div>
        <Button disabled={selected.size === 0} onClick={() => window.print()}>
          <Printer size={16} className="mr-1.5" />
          Print {selected.size > 0 ? `${selected.size} Label` : "Labels"}
        </Button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 w-8">
                <input
                  type="checkbox"
                  checked={selected.size === MOCK.length}
                  onChange={toggleAll}
                  className="rounded"
                />
              </th>
              {["Asset ID", "Name", "Category", "Department"].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 font-medium text-gray-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK.map((a) => (
              <tr
                key={a.id}
                className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                onClick={() => toggle(a.id)}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(a.id)}
                    onChange={() => toggle(a.id)}
                    className="rounded"
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                  {a.assetId}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {a.name}
                </td>
                <td className="px-4 py-3 text-gray-600">{a.category}</td>
                <td className="px-4 py-3 text-gray-600">{a.department}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected.size > 0 && (
        <p className="mt-2 text-xs text-gray-400 flex items-center gap-1">
          <CheckSquare size={12} />
          {selected.size} asset{selected.size > 1 ? "s" : ""} selected for
          printing
        </p>
      )}
    </div>
  );
}
