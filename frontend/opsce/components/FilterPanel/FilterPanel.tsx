"use client";

import { FilterKey, FilterState } from "@/opsce/hooks/useFilterState";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Option types
// ---------------------------------------------------------------------------
interface SelectOption {
  label: string;
  value: string;
}

export interface FilterPanelProps {
  filters: FilterState;
  onFilterChange: (key: FilterKey, value: string) => void;
  onClearAll: () => void;
  activeFilterCount: number;
  /** Option lists — all optional; sensible defaults are provided */
  statusOptions?:     SelectOption[];
  conditionOptions?:  SelectOption[];
  categoryOptions?:   SelectOption[];
  departmentOptions?: SelectOption[];
  locationOptions?:   SelectOption[];
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
const DEFAULT_STATUS: SelectOption[] = [
  { label: "Active",     value: "active" },
  { label: "Inactive",   value: "inactive" },
  { label: "Retired",    value: "retired" },
  { label: "Maintenance",value: "maintenance" },
];

const DEFAULT_CONDITION: SelectOption[] = [
  { label: "New",        value: "new" },
  { label: "Good",       value: "good" },
  { label: "Fair",       value: "fair" },
  { label: "Poor",       value: "poor" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function FilterPanel({
  filters,
  onFilterChange,
  onClearAll,
  activeFilterCount,
  statusOptions     = DEFAULT_STATUS,
  conditionOptions  = DEFAULT_CONDITION,
  categoryOptions   = [],
  departmentOptions = [],
  locationOptions   = [],
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-expanded={isOpen}
        aria-controls="filter-panel"
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 shadow-sm
          hover:bg-gray-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <FilterIcon className="h-4 w-4 text-gray-500" />
        Filters
        {activeFilterCount > 0 && (
          <span
            aria-label={`${activeFilterCount} active filters`}
            className="ml-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-indigo-600 px-1.5 text-xs font-semibold text-white"
          >
            {activeFilterCount}
          </span>
        )}
        <ChevronIcon
          className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Collapsible panel */}
      {isOpen && (
        <div
          id="filter-panel"
          role="region"
          aria-label="Filter options"
          className="mt-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FilterSelect
              id="filter-status"
              label="Status"
              value={filters.status}
              options={statusOptions}
              onChange={(v) => onFilterChange("status", v)}
            />
            <FilterSelect
              id="filter-condition"
              label="Condition"
              value={filters.condition}
              options={conditionOptions}
              onChange={(v) => onFilterChange("condition", v)}
            />
            <FilterSelect
              id="filter-category"
              label="Category"
              value={filters.category}
              options={categoryOptions}
              onChange={(v) => onFilterChange("category", v)}
            />
            <FilterSelect
              id="filter-department"
              label="Department"
              value={filters.department}
              options={departmentOptions}
              onChange={(v) => onFilterChange("department", v)}
            />
            <FilterSelect
              id="filter-location"
              label="Location"
              value={filters.location}
              options={locationOptions}
              onChange={(v) => onFilterChange("location", v)}
            />

            {/* Date range */}
            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
              <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Date Range
              </span>
              <div className="flex items-center gap-2">
                <input
                  id="filter-date-from"
                  type="date"
                  aria-label="Date from"
                  value={filters.dateFrom}
                  onChange={(e) => onFilterChange("dateFrom", e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm
                    focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
                <span className="text-gray-400 text-sm">–</span>
                <input
                  id="filter-date-to"
                  type="date"
                  aria-label="Date to"
                  value={filters.dateTo}
                  min={filters.dateFrom || undefined}
                  onChange={(e) => onFilterChange("dateTo", e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm
                    focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          {activeFilterCount > 0 && (
            <div className="mt-4 flex justify-end border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => { onClearAll(); setIsOpen(false); }}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FilterSelect helper
// ---------------------------------------------------------------------------
interface FilterSelectProps {
  id: string;
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}

function FilterSelect({ id, label, value, options, onChange }: FilterSelectProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm
          focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
      >
        <option value="">All {label}s</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}