"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCategories, useDepartmentsList } from "@/lib/query/hooks/useAssets";
import { AssetStatus, AssetCondition } from "@/lib/query/types/asset";

export interface AssetFilters {
  search: string;
  status: string;
  condition: string;
  departmentId: string;
  categoryId: string;
}

interface Props {
  filters: AssetFilters;
  onChange: (filters: AssetFilters) => void;
}

export function AssetFilterBar({ filters, onChange }: Props) {
  const { data: categories = [] } = useCategories();
  const { data: departments = [] } = useDepartmentsList();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    (Object.keys(filters) as (keyof AssetFilters)[]).forEach((key) => {
      if (filters[key]) {
        params.set(key, filters[key]);
      } else {
        params.delete(key);
      }
    });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key: keyof AssetFilters, value: string) =>
    onChange({ ...filters, [key]: value });

  const handleSearch = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => set("search", value), 300);
  };

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Search by name, ID, serial..."
          defaultValue={filters.search}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      {/* Status */}
      <select
        value={filters.status}
        onChange={(e) => set("status", e.target.value)}
        className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-700"
      >
        <option value="">All Statuses</option>
        {Object.values(AssetStatus).map((s) => (
          <option key={s} value={s}>
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </option>
        ))}
      </select>

      {/* Condition */}
      <select
        value={filters.condition}
        onChange={(e) => set("condition", e.target.value)}
        className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-700"
      >
        <option value="">All Conditions</option>
        {Object.values(AssetCondition).map((c) => (
          <option key={c} value={c}>
            {c.charAt(0) + c.slice(1).toLowerCase()}
          </option>
        ))}
      </select>

      {/* Department */}
      <select
        value={filters.departmentId}
        onChange={(e) => set("departmentId", e.target.value)}
        className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-700"
      >
        <option value="">All Departments</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>

      {/* Category */}
      <select
        value={filters.categoryId}
        onChange={(e) => set("categoryId", e.target.value)}
        className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-700"
      >
        <option value="">All Categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {/* Reset */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onChange({
              search: "",
              status: "",
              condition: "",
              departmentId: "",
              categoryId: "",
            })
          }
        >
          <X size={14} className="mr-1" />
          Reset
        </Button>
      )}
    </div>
  );
}
