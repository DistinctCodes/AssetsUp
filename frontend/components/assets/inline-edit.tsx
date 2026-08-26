"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil, Check, X } from "lucide-react";

interface InlineEditProps {
  value: string | number | null | undefined;
  label: string;
  type?: "text" | "number";
  onSave: (value: string | number) => Promise<void>;
  display?: React.ReactNode;
}

export function InlineEdit({ value, label, type = "text", onSave, display }: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const val = type === "number" ? Number(draft) : draft;
      await onSave(val);
      setEditing(false);
    } catch {
      setDraft(value ?? "");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="group flex items-center gap-1 hover:bg-gray-100 rounded px-1 -mx-1">
        {display ?? <span className="text-sm text-gray-900">{value ?? "—"}</span>}
        <Pencil className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") { setEditing(false); setDraft(value ?? ""); } }}
        className="w-32 px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500"
      />
      <button onClick={handleSave} disabled={saving} className="text-green-600 hover:text-green-800"><Check className="w-4 h-4" /></button>
      <button onClick={() => { setEditing(false); setDraft(value ?? ""); }} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
    </div>
  );
}
