"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const FIELD_TYPES = ["text", "number", "date", "select", "boolean"] as const;
type FieldType = typeof FIELD_TYPES[number];

interface FieldDef {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  required: boolean;
  isActive: boolean;
}

const CATEGORIES = ["Vehicles", "Electronics", "Furniture", "Software", "General"];

export default function CustomFieldsPage() {
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [fields, setFields] = useState<Record<string, FieldDef[]>>(() =>
    Object.fromEntries(CATEGORIES.map((c) => [c, []]))
  );
  const [showAdd, setShowAdd] = useState(false);
  const [editField, setEditField] = useState<FieldDef | null>(null);

  const currentFields = fields[selectedCategory] ?? [];

  const addField = (field: Omit<FieldDef, "id" | "isActive">) => {
    setFields((prev) => ({
      ...prev,
      [selectedCategory]: [...(prev[selectedCategory] ?? []), { ...field, id: Date.now().toString(), isActive: true }],
    }));
    setShowAdd(false);
  };

  const deleteField = (id: string) => {
    setFields((prev) => ({
      ...prev,
      [selectedCategory]: prev[selectedCategory].filter((f) => f.id !== id),
    }));
  };

  const toggleActive = (id: string) => {
    setFields((prev) => ({
      ...prev,
      [selectedCategory]: prev[selectedCategory].map((f) =>
        f.id === id ? { ...f, isActive: !f.isActive } : f
      ),
    }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Custom Fields</h1>
          <p className="text-sm text-gray-500 mt-1">Define per-category fields for your assets</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Category sidebar */}
        <div className="col-span-3 bg-white border rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Categories</h3>
          <div className="space-y-1">
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                  selectedCategory === cat ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50"
                }`}>
                {cat}
                <span className="ml-2 text-xs opacity-60">{(fields[cat] ?? []).length}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Fields list */}
        <div className="col-span-9 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{selectedCategory} Fields</h2>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Field
            </Button>
          </div>

          {currentFields.length === 0 ? (
            <div className="bg-white border rounded-xl p-12 text-center text-gray-400 text-sm">
              No custom fields defined for this category yet.
            </div>
          ) : (
            <div className="space-y-2">
              {currentFields.map((field) => (
                <div key={field.id} className={`bg-white border rounded-xl p-4 flex items-center gap-4 ${
                  !field.isActive ? "opacity-50" : ""
                }`}>
                  <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{field.label}</p>
                    <p className="text-xs text-gray-500">Key: {field.key} · Type: {field.type}</p>
                  </div>
                  <Badge className={field.required ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}>
                    {field.required ? "Required" : "Optional"}
                  </Badge>
                  {field.type === "select" && field.options && (
                    <span className="text-xs text-gray-400">{field.options.length} options</span>
                  )}
                  <button onClick={() => toggleActive(field.id)} className="text-xs text-gray-500 hover:text-gray-700">
                    {field.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button onClick={() => deleteField(field.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Field Modal */}
      {(showAdd || editField) && (
        <FieldModal
          field={editField}
          onSave={(data) => {
            if (editField) {
              setFields((prev) => ({
                ...prev,
                [selectedCategory]: prev[selectedCategory].map((f) =>
                  f.id === editField.id ? { ...f, ...data } : f
                ),
              }));
              setEditField(null);
            } else {
              addField(data);
            }
          }}
          onClose={() => { setShowAdd(false); setEditField(null); }}
        />
      )}
    </div>
  );
}

function FieldModal({ field, onSave, onClose }: { field: FieldDef | null; onSave: (data: Omit<FieldDef, "id" | "isActive">) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    key: field?.key ?? "",
    label: field?.label ?? "",
    type: field?.type ?? "text" as FieldType,
    options: field?.options?.join(", ") ?? "",
    required: field?.required ?? false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      key: form.key,
      label: form.label,
      type: form.type,
      options: form.type === "select" ? form.options.split(",").map((o) => o.trim()).filter(Boolean) : undefined,
      required: form.required,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-base font-semibold mb-4">{field ? "Edit" : "Add"} Field</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input placeholder="Key (e.g. plate_number)" required value={form.key} onChange={(e) => setForm((p) => ({ ...p, key: e.target.value }))} />
          <Input placeholder="Label (e.g. Plate Number)" required value={form.label} onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))} />
          <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as FieldType }))}
            className="w-full border rounded-lg px-3 py-2 text-sm">
            {FIELD_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
          {form.type === "select" && (
            <Input placeholder="Options (comma-separated)" value={form.options} onChange={(e) => setForm((p) => ({ ...p, options: e.target.value }))} />
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.required} onChange={(e) => setForm((p) => ({ ...p, required: e.target.checked }))} className="rounded" />
            Required
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{field ? "Save" : "Add Field"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
