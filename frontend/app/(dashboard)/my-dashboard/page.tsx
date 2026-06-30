"use client";

import { useState } from "react";
import {
  Package,
  CheckCircle,
  Wrench,
  UserCheck,
  GripVertical,
} from "lucide-react";

interface Widget {
  id: string;
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}

const DEFAULT_WIDGETS: Widget[] = [
  {
    id: "total",
    title: "Total Assets",
    value: 248,
    icon: <Package size={20} />,
    color: "text-blue-600",
  },
  {
    id: "active",
    title: "Active",
    value: 189,
    icon: <CheckCircle size={20} />,
    color: "text-green-600",
  },
  {
    id: "maintenance",
    title: "In Maintenance",
    value: 12,
    icon: <Wrench size={20} />,
    color: "text-yellow-600",
  },
  {
    id: "assigned",
    title: "Assigned",
    value: 47,
    icon: <UserCheck size={20} />,
    color: "text-purple-600",
  },
];

export default function CustomDashboardPage() {
  const [widgets, setWidgets] = useState<Widget[]>(DEFAULT_WIDGETS);
  const [dragging, setDragging] = useState<string | null>(null);

  const onDragStart = (id: string) => setDragging(id);
  const onDrop = (targetId: string) => {
    if (!dragging || dragging === targetId) return;
    setWidgets((prev) => {
      const arr = [...prev];
      const fromIdx = arr.findIndex((w) => w.id === dragging);
      const toIdx = arr.findIndex((w) => w.id === targetId);
      [arr[fromIdx], arr[toIdx]] = [arr[toIdx], arr[fromIdx]];
      return arr;
    });
    setDragging(null);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Drag widgets to rearrange your layout
        </p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {widgets.map((w) => (
          <div
            key={w.id}
            draggable
            onDragStart={() => onDragStart(w.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(w.id)}
            className="bg-white rounded-xl border border-gray-200 p-5 cursor-grab active:cursor-grabbing select-none transition-opacity"
          >
            <div className="flex items-center justify-between mb-3">
              <span className={w.color}>{w.icon}</span>
              <GripVertical size={16} className="text-gray-300" />
            </div>
            <p className="text-sm text-gray-500">{w.title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{w.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
