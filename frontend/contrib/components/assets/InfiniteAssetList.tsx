"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Trash2, Loader2 } from "lucide-react";
import { StatusBadge } from "@/contrib/components/assets/status-badge";
import { ConditionBadge } from "@/contrib/components/assets/condition-badge";
import { useInfiniteAssets } from "@/contrib/hooks/useInfiniteAssets";
import { AssetFilterBar, AssetFilters } from "@/contrib/components/assets/AssetFilterBar";
import type { Asset } from "@/lib/query/types/asset";

interface InfiniteAssetListProps {
  filters: AssetFilters;
  onFilterChange: (filters: AssetFilters) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function InfiniteAssetList({
  filters,
  onFilterChange,
  onEdit,
  onDelete,
}: InfiniteAssetListProps) {
  const router = useRouter();

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteAssets({
    filters: {
      search: filters.search || undefined,
      status: filters.status || undefined,
      condition: filters.condition || undefined,
      departmentId: filters.departmentId || undefined,
      categoryId: filters.categoryId || undefined,
    },
    limit: 20,
  });

  const observerRef = useRef<IntersectionObserver | null>(null);

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!node || !hasNextPage || isFetchingNextPage) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        },
        { rootMargin: "200px" },
      );

      observerRef.current.observe(node);
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  const allAssets = data?.pages.flatMap((page: { data: Asset[] }) => page.data) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  return (
    <div>
      <AssetFilterBar filters={filters} onChange={onFilterChange} />

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                {["Asset ID", "Name", "Category", "Department", "Status", "Condition", "Actions"].map(
                  (h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-300">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : allAssets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400 dark:text-gray-500">
                    {Object.values(filters).some(Boolean)
                      ? "No assets match your filters."
                      : 'No assets yet. Click "Create Asset" to get started.'}
                  </td>
                </tr>
              ) : (
                allAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{asset.assetId}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{asset.name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{asset.category?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{asset.department?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={asset.status} />
                    </td>
                    <td className="px-4 py-3">
                      <ConditionBadge condition={asset.condition} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/assets/${asset.id}`)}
                          className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => onEdit(asset.id)}
                          className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => onDelete(asset.id)}
                          className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Infinite scroll sentinel & status area */}
        {allAssets.length > 0 && (
          <div className="flex items-center justify-center py-4 border-t border-gray-200 dark:border-gray-600">
            {isFetchingNextPage ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Loader2 size={16} className="animate-spin" />
                Loading more assets...
              </div>
            ) : !hasNextPage ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">No more assets</p>
            ) : null}
            {/* IntersectionObserver sentinel */}
            <div ref={sentinelRef} className="h-1" />
          </div>
        )}
      </div>
    </div>
  );
}
