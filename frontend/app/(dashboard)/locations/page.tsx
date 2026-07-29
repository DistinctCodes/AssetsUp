"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  ChevronDown,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useLocations,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
} from "@/lib/query/hooks/useLocations";
import { Location, LocationType } from "@/lib/api/locations";

interface TreeNode extends Location {
  children: TreeNode[];
}

function buildTree(locations: Location[]): TreeNode[] {
  const nodes = new Map<string, TreeNode>();
  locations.forEach((loc) => nodes.set(loc.id, { ...loc, children: [] }));
  const roots: TreeNode[] = [];
  nodes.forEach((node) => {
    if (node.parentLocationId && nodes.has(node.parentLocationId)) {
      nodes.get(node.parentLocationId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortRec = (list: TreeNode[]) => {
    list.sort((a, b) => a.name.localeCompare(b.name));
    list.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

function errorMessage(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
  );
}

export default function LocationsPage() {
  const router = useRouter();
  const { data: locations = [], isLoading } = useLocations();
  const tree = useMemo(() => buildTree(locations), [locations]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [formTarget, setFormTarget] = useState<{
    mode: "create" | "edit";
    parentLocationId?: string;
    location?: Location;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const deleteLocation = useDeleteLocation();

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError("");
    try {
      await deleteLocation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(errorMessage(err, "Failed to delete location."));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage the hierarchical structure of sites, buildings and rooms
          </p>
        </div>
        <Button size="sm" onClick={() => setFormTarget({ mode: "create" })}>
          <Plus size={15} className="mr-1" />
          Add Root Location
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-2">
        {isLoading ? (
          <div className="text-sm text-gray-400 text-center py-12">Loading locations...</div>
        ) : tree.length === 0 ? (
          <div className="text-center py-16">
            <div className="flex justify-center mb-3">
              <MapPin size={32} className="text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-700">No locations yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Click &quot;Add Root Location&quot; to create your first one.
            </p>
          </div>
        ) : (
          <ul>
            {tree.map((node) => (
              <LocationRow
                key={node.id}
                node={node}
                depth={0}
                expanded={expanded}
                onToggle={toggle}
                onAddChild={(parentLocationId) =>
                  setFormTarget({ mode: "create", parentLocationId })
                }
                onEdit={(location) => setFormTarget({ mode: "edit", location })}
                onDelete={(location) => {
                  setDeleteError("");
                  setDeleteTarget(location);
                }}
                onFilterAssets={(id) => router.push(`/assets?locationId=${id}`)}
              />
            ))}
          </ul>
        )}
      </div>

      {formTarget && (
        <LocationFormModal
          mode={formTarget.mode}
          location={formTarget.location}
          parentLocationId={formTarget.parentLocationId}
          allLocations={locations}
          onClose={() => setFormTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete location?"
          message={
            deleteError ||
            `"${deleteTarget.name}" will be permanently deleted. This is blocked if it still has assets or child locations.`
          }
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLocation.isPending}
        />
      )}
    </div>
  );
}

function LocationRow({
  node,
  depth,
  expanded,
  onToggle,
  onAddChild,
  onEdit,
  onDelete,
  onFilterAssets,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onEdit: (location: Location) => void;
  onDelete: (location: Location) => void;
  onFilterAssets: (id: string) => void;
}) {
  const isExpanded = expanded.has(node.id);
  const hasChildren = node.children.length > 0;

  return (
    <li>
      <div
        className="group flex items-center gap-1.5 py-2 px-2 rounded-lg hover:bg-gray-50"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        <button
          onClick={() => hasChildren && onToggle(node.id)}
          className="w-5 h-5 flex items-center justify-center text-gray-400 flex-shrink-0"
          aria-label={isExpanded ? "Collapse" : "Expand"}
          disabled={!hasChildren}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown size={15} />
            ) : (
              <ChevronRight size={15} />
            )
          ) : null}
        </button>

        <button
          onClick={() => onFilterAssets(node.id)}
          className="flex items-center gap-2 min-w-0 text-left flex-1"
          title="View assets at this location"
        >
          <span className="font-medium text-gray-900 truncate">{node.name}</span>
          <span className="text-xs text-gray-400 font-mono flex-shrink-0">{node.code}</span>
          <span className="text-xs text-gray-400 flex-shrink-0">{node.type}</span>
        </button>

        <span className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0 mr-2">
          <Package size={12} />
          {node.totalAssetCount}
        </span>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={() => onAddChild(node.id)}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            title="Add child location"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => onEdit(node)}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            title="Edit location"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(node)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
            title="Delete location"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <ul>
          {node.children.map((child) => (
            <LocationRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
              onFilterAssets={onFilterAssets}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function LocationFormModal({
  mode,
  location,
  parentLocationId,
  allLocations,
  onClose,
}: {
  mode: "create" | "edit";
  location?: Location;
  parentLocationId?: string;
  allLocations: Location[];
  onClose: () => void;
}) {
  const [name, setName] = useState(location?.name || "");
  const [code, setCode] = useState(location?.code || "");
  const [type, setType] = useState<LocationType>(location?.type || LocationType.BUILDING);
  const [address, setAddress] = useState(location?.address || "");
  const [parentId, setParentId] = useState(
    location?.parentLocationId || parentLocationId || "",
  );
  const [error, setError] = useState("");

  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const isPending = createLocation.isPending || updateLocation.isPending;

  // Prevent moving a location under itself or one of its own descendants
  const invalidParentIds = useMemo(() => {
    if (!location) return new Set<string>();
    const invalid = new Set<string>([location.id]);
    let added = true;
    while (added) {
      added = false;
      for (const loc of allLocations) {
        if (loc.parentLocationId && invalid.has(loc.parentLocationId) && !invalid.has(loc.id)) {
          invalid.add(loc.id);
          added = true;
        }
      }
    }
    return invalid;
  }, [location, allLocations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setError("Name and code are required");
      return;
    }
    setError("");
    try {
      if (mode === "create") {
        await createLocation.mutateAsync({
          name: name.trim(),
          code: code.trim(),
          type,
          address: address.trim() || undefined,
          parentLocationId: parentId || undefined,
        });
      } else if (location) {
        await updateLocation.mutateAsync({
          id: location.id,
          data: {
            name: name.trim(),
            code: code.trim(),
            type,
            address: address.trim() || undefined,
            parentLocationId: parentId || undefined,
          },
        });
      }
      onClose();
    } catch (err) {
      setError(errorMessage(err, "Failed to save location."));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">
            {mode === "create" ? "New Location" : "Edit Location"}
          </h2>

          <Input
            id="loc-name"
            label="Name *"
            placeholder="e.g. Lagos HQ, Floor 3, Room 204"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            id="loc-code"
            label="Code *"
            placeholder="e.g. LOS-HQ-F3-204"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as LocationType)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              {Object.values(LocationType).map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Parent location</label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="">No parent (root level)</option>
              {allLocations
                .filter((l) => !invalidParentIds.has(l.id))
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.code})
                  </option>
                ))}
            </select>
          </div>

          <Input
            id="loc-address"
            label="Address"
            placeholder="Optional address or notes"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={isPending}>
              {mode === "create" ? "Create Location" : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
