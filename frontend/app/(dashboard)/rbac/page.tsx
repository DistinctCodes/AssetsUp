"use client";

import { useState } from "react";
import { Plus, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Role {
  id: string;
  name: string;
  department: string;
  permissions: string[];
}

const MOCK: Role[] = [
  {
    id: "1",
    name: "Admin",
    department: "All",
    permissions: ["create", "read", "update", "delete", "manage_users"],
  },
  {
    id: "2",
    name: "Manager",
    department: "Engineering",
    permissions: ["create", "read", "update"],
  },
  { id: "3", name: "Viewer", department: "Finance", permissions: ["read"] },
];

const ALL_PERMS = ["create", "read", "update", "delete", "manage_users"];

export default function RBACPage() {
  const [roles] = useState<Role[]>(MOCK);
  const [selected, setSelected] = useState<Role | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Roles &amp; Permissions
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage roles, permissions, and department access
          </p>
        </div>
        <Button>
          <Plus size={16} className="mr-1.5" />
          New Role
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700">
            Roles
          </div>
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(r)}
              className="w-full text-left px-4 py-3 flex items-center gap-2 hover:bg-gray-50 border-b border-gray-100"
            >
              <Shield size={14} className="text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">{r.name}</p>
                <p className="text-xs text-gray-500">{r.department}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          {selected ? (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {selected.name} — Permissions
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {ALL_PERMS.map((perm) => (
                  <label
                    key={perm}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      defaultChecked={selected.permissions.includes(perm)}
                      className="rounded"
                    />
                    <span className="text-sm capitalize text-gray-700">
                      {perm.replace("_", " ")}
                    </span>
                  </label>
                ))}
              </div>
              <Button className="mt-6">Save Changes</Button>
            </>
          ) : (
            <p className="text-sm text-gray-400">
              Select a role to manage permissions
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
