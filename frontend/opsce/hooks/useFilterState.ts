"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface FilterState {
  search: string;
  status: string;
  condition: string;
  category: string;
  department: string;
  location: string;
  dateFrom: string;
  dateTo: string;
}

export type FilterKey = keyof FilterState;

const DEFAULT_FILTERS: FilterState = {
  search:     "",
  status:     "",
  condition:  "",
  category:   "",
  department: "",
  location:   "",
  dateFrom:   "",
  dateTo:     "",
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useFilterState() {
  const router     = useRouter();
  const pathname   = usePathname();
  const searchParams = useSearchParams();

  // Read current state from URL
  const filters: FilterState = useMemo(() => {
    const get = (key: string) => searchParams.get(key) ?? "";
    return {
      search:     get("search"),
      status:     get("status"),
      condition:  get("condition"),
      category:   get("category"),
      department: get("department"),
      location:   get("location"),
      dateFrom:   get("dateFrom"),
      dateTo:     get("dateTo"),
    };
  }, [searchParams]);

  // Update a single filter key in the URL
  const setFilter = useCallback(
    (key: FilterKey, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset to page 1 whenever a filter changes
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // Reset all filters
  const clearFilters = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [router, pathname]);

  // Count of active (non-empty) filters, excluding "search" for the badge
  const activeFilterCount = useMemo(
    () =>
      (Object.keys(DEFAULT_FILTERS) as FilterKey[])
        .filter((k) => k !== "search" && filters[k] !== "")
        .length,
    [filters]
  );

  return { filters, setFilter, clearFilters, activeFilterCount };
}