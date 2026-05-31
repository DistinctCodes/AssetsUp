'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight,
  ChevronDown,
  Building2,
  Layers,
  DoorOpen,
  MapPin,
  Plus,
  Edit2,
  Trash2,
} from 'lucide-react';

interface Location {
  id: string;
  name: string;
  type: string;
  address?: string;
  parentLocationId?: string;
  assetCount?: number;
  children?: Location[];
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  building: Building2,
  floor: Layers,
  room: DoorOpen,
  zone: MapPin,
};

const TYPE_COLORS: Record<string, string> = {
  building: 'bg-blue-100 text-blue-700',
  floor: 'bg-purple-100 text-purple-700',
  room: 'bg-green-100 text-green-700',
  zone: 'bg-amber-100 text-amber-700',
};

function buildTree(flat: Location[]): Location[] {
  const map: Record<string, Location> = {};
  flat.forEach((l) => {
    map[l.id] = { ...l, children: [] };
  });
  const roots: Location[] = [];
  flat.forEach((l) => {
    if (l.parentLocationId && map[l.parentLocationId]) {
      map[l.parentLocationId].children!.push(map[l.id]);
    } else {
      roots.push(map[l.id]);
    }
  });
  return roots;
}

function fetchLocations(): Promise<Location[]> {
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6003/api';
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
  return fetch(`${API}/locations`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
}

async function deleteLocation(id: string) {
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6003/api';
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
  const res = await fetch(`${API}/locations/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const e = await res.json();
    throw new Error(e.message ?? 'Delete failed');
  }
}

interface TreeNodeProps {
  node: Location;
  depth?: number;
  onSelect: (loc: Location) => void;
  onEdit: (loc: Location) => void;
  onDelete: (loc: Location) => void;
}

function TreeNode({ node, depth = 0, onSelect, onEdit, onDelete }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = !!node.children?.length;
  const Icon = TYPE_ICONS[node.type] ?? MapPin;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 group"
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
      >
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-gray-400 flex-shrink-0 w-4"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )
          ) : (
            <span className="w-4 inline-block" />
          )}
        </button>

        <button
          onClick={() => onSelect(node)}
          className="flex items-center gap-2 flex-1 text-left"
        >
          <Icon size={16} className="text-gray-500 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-900">{node.name}</span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${
              TYPE_COLORS[node.type] ?? 'bg-gray-100 text-gray-600'
            }`}
          >
            {node.type}
          </span>
          {node.assetCount !== undefined && (
            <span className="ml-auto text-xs text-gray-400">
              {node.assetCount} assets
            </span>
          )}
        </button>

        <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(node)}
            className="p-1 text-gray-400 hover:text-gray-700 rounded"
            aria-label="Edit"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => onDelete(node)}
            className="p-1 text-gray-400 hover:text-red-500 rounded"
            aria-label="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {expanded &&
        hasChildren &&
        node.children!.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            depth={depth + 1}
            onSelect={onSelect}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
    </div>
  );
}

interface AddModalProps {
  onClose: () => void;
  onSave: (data: {
    name: string;
    type: string;
    parentLocationId?: string;
    address?: string;
  }) => void;
  locations: Location[];
}

function AddModal({ onClose, onSave, locations }: AddModalProps) {
  const [form, setForm] = useState({
    name: '',
    type: 'building',
    parentLocationId: '',
    address: '',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Add Location</h3>
        <div className="space-y-3">
          <input
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <select
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
          >
            {['building', 'floor', 'room', 'zone'].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
            value={form.parentLocationId}
            onChange={(e) =>
              setForm((f) => ({ ...f, parentLocationId: e.target.value }))
            }
          >
            <option value="">No parent</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <input
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
            placeholder="Address (optional)"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          />
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (form.name) {
                onSave({
                  ...form,
                  parentLocationId: form.parentLocationId || undefined,
                  address: form.address || undefined,
                });
                onClose();
              }
            }}
            className="flex-1 px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

export function LocationsPage() {
  const qc = useQueryClient();
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const { data: locations = [], isLoading } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: fetchLocations,
  });

  const tree = buildTree(locations);

  const deleteMutation = useMutation({
    mutationFn: deleteLocation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] });
      setDeleteError('');
    },
    onError: (e: Error) => setDeleteError(e.message),
  });

  const handleAdd = async (data: {
    name: string;
    type: string;
    parentLocationId?: string;
    address?: string;
  }) => {
    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6003/api';
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
    await fetch(`${API}/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    qc.invalidateQueries({ queryKey: ['locations'] });
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Tree panel */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h1 className="text-sm font-semibold text-gray-900">Locations</h1>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700"
          >
            <Plus size={14} /> Add Location
          </button>
        </div>

        <div className="overflow-y-auto p-2">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse px-3 py-2.5">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>
            ))
          ) : tree.length === 0 ? (
            <p className="text-sm text-gray-400 px-4 py-6">
              No locations yet. Add your first location.
            </p>
          ) : (
            tree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                onSelect={setSelectedLocation}
                onEdit={() => {}}
                onDelete={(loc) => deleteMutation.mutate(loc.id)}
              />
            ))
          )}
          {deleteError && (
            <p className="text-xs text-red-500 px-4 py-2">{deleteError}</p>
          )}
        </div>
      </div>

      {/* Side panel */}
      {selectedLocation && (
        <div className="w-72 bg-white rounded-xl border border-gray-200 p-5 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">
              {selectedLocation.name}
            </h2>
            <button
              onClick={() => setSelectedLocation(null)}
              className="text-gray-400 hover:text-gray-700 text-xs"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-400 text-xs block">Type</span>
              <span
                className={`inline-block text-xs px-2 py-0.5 rounded-md font-medium mt-0.5 ${
                  TYPE_COLORS[selectedLocation.type] ?? ''
                }`}
              >
                {selectedLocation.type}
              </span>
            </div>
            {selectedLocation.address && (
              <div>
                <span className="text-gray-400 text-xs block">Address</span>
                <span className="text-gray-700">{selectedLocation.address}</span>
              </div>
            )}
            <div>
              <span className="text-gray-400 text-xs block">Assets</span>
              <span className="text-gray-700">{selectedLocation.assetCount ?? 0}</span>
            </div>
          </div>

          <div className="mt-5">
            <h3 className="text-xs font-medium text-gray-500 mb-2">
              Assets at this location
            </h3>
            <p className="text-xs text-gray-400">Asset list loads from API</p>
          </div>
        </div>
      )}

      {showAdd && (
        <AddModal
          onClose={() => setShowAdd(false)}
          onSave={handleAdd}
          locations={locations}
        />
      )}
    </div>
  );
}
