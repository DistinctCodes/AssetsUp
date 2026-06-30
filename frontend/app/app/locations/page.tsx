"use client";

import { useState } from "react";
import { Plus, ChevronRight, ChevronDown, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Location {
  id: string;
  name: string;
  type: "building" | "floor" | "room";
  parent: string | null;
  assetCount: number;
}

const MOCK: Location[] = [
  {
    id: "1",
    name: "HQ Building",
    type: "building",
    parent: null,
    assetCount: 120,
  },
  { id: "2", name: "Floor 1", type: "floor", parent: "1", assetCount: 60 },
  { id: "3", name: "Server Room", type: "room", parent: "2", assetCount: 25 },
  { id: "4", name: "Floor 2", type: "floor", parent: "1", assetCount: 60 },
  { id: "5", name: "IT Department", type: "room", parent: "4", assetCount: 35 },
];

function LocationRow({ loc, depth }: { loc: Location; depth: number }) {
  const [open, setOpen] = useState(true);
  const children = MOCK.filter((l) => l.parent === loc.id);
  const hasChildren = children.length > 0;

  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50">
        <td className="px-4 py-3">
          <div
            className="flex items-center"
            style={{ paddingLeft: `${depth * 20}px` }}
          >
            {hasChildren ? (
              <button
                onClick={() => setOpen((o) => !o)}
                className="mr-1 text-gray-400"
              >
                {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <span className="mr-1 w-[14px] inline-block" />
            )}
            <MapPin size={14} className="mr-2 text-gray-400" />
            <span className="font-medium text-gray-900">{loc.name}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-gray-600 capitalize">{loc.type}</td>
        <td className="px-4 py-3 text-gray-600">{loc.assetCount}</td>
        <td className="px-4 py-3">
          <button className="text-xs text-blue-600 hover:underline mr-3">
            Edit
          </button>
          <button className="text-xs text-red-500 hover:underline">
            Delete
          </button>
        </td>
      </tr>
      {open &&
        children.map((c) => (
          <LocationRow key={c.id} loc={c} depth={depth + 1} />
        ))}
    </>
  );
}

export default function LocationsPage() {
  const roots = MOCK.filter((l) => l.parent === null);
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
          <p className="text-sm text-gray-500 mt-1">
            Hierarchical location tree with CRUD
          </p>
        </div>
        <Button>
          <Plus size={16} className="mr-1.5" />
          Add Location
        </Button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {["Name", "Type", "Assets", "Actions"].map((h) => (
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
            {roots.map((r) => (
              <LocationRow key={r.id} loc={r} depth={0} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
