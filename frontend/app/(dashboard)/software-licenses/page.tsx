"use client";

import { useState } from "react";
import { Plus, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface License {
  id: string;
  software: string;
  vendor: string;
  totalSeats: number;
  usedSeats: number;
  expiresAt: string;
  compliant: boolean;
}

const MOCK: License[] = [
  {
    id: "1",
    software: "Microsoft Office 365",
    vendor: "Microsoft",
    totalSeats: 50,
    usedSeats: 47,
    expiresAt: "2025-01-31",
    compliant: true,
  },
  {
    id: "2",
    software: "Adobe Creative Cloud",
    vendor: "Adobe",
    totalSeats: 10,
    usedSeats: 12,
    expiresAt: "2024-12-31",
    compliant: false,
  },
  {
    id: "3",
    software: "Slack Business+",
    vendor: "Slack",
    totalSeats: 100,
    usedSeats: 78,
    expiresAt: "2025-06-30",
    compliant: true,
  },
];

export default function SoftwareLicensesPage() {
  const [licenses] = useState<License[]>(MOCK);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Software Licenses
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Seat tracking and compliance overview
          </p>
        </div>
        <Button>
          <Plus size={16} className="mr-1.5" />
          Add License
        </Button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {[
                "Software",
                "Vendor",
                "Total Seats",
                "Used Seats",
                "Utilisation",
                "Expires",
                "Compliance",
              ].map((h) => (
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
            {licenses.map((l) => {
              const pct = Math.round((l.usedSeats / l.totalSeats) * 100);
              return (
                <tr
                  key={l.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {l.software}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{l.vendor}</td>
                  <td className="px-4 py-3 text-gray-600">{l.totalSeats}</td>
                  <td className="px-4 py-3 text-gray-600">{l.usedSeats}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-gray-200 rounded-full">
                        <div
                          className="h-1.5 rounded-full"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{l.expiresAt}</td>
                  <td className="px-4 py-3">
                    {l.compliant ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle size={14} />
                        Compliant
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600">
                        <AlertTriangle size={14} />
                        Over-allocated
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
