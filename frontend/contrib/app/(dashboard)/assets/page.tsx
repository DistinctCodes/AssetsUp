"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Eye, Pencil, Trash2, List, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/assets/status-badge";
import { ConditionBadge } from "@/components/assets/condition-badge";
import { useAssets, useCreateAsset } from "@/lib/query/hooks/useAssets";
import { useDeleteAsset } from "@/lib/query/hooks/useAsset";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { AssetFilterBar, AssetFilters } from "@/contrib/components/assets/AssetFilterBar";
import { CreateAssetModal } from "@/contrib/components/assets/CreateAssetModal";
import { InfiniteAssetList } from "@/contrib/components/assets/InfiniteAssetList";
import { ThemeToggle } from "@/contrib/components/ui/theme-toggle";

const LIMIT = 20;

type ViewMode = "paginated" | "infinite";

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-700">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export default function AssetsContribPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("paginated");

  const [filters, setFilters] = useState<AssetFilters>({
    search: searchParams.get("search") ?? "",
    status: searchParams.get("status") ?? "",
    condition: searchParams.get("condition") ?? "",
    departmentId: searchParams.get("departmentId") ?? "",
    categoryId: searchParams.get("categoryId") ?? "",
  });

  const { data, isLoading } = useAssets({
    search: filters.search || undefined,
    status: filters.status || undefined,
    condition: filters.condition || undefined,
    departmentId: filters.departmentId || undefined,
    categoryId: filters.categoryId || undefined,
    page,
    limit: LIMIT,
  });

  const assets = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  const deleteAsset = useDeleteAsset(deleteId ?? "");

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteAsset.mutateAsync();
    setDeleteId(null);
  };

  const handleFilterChange = (next: AssetFilters) => {
    setFilters(next);
    setPage(1);
  };

  const toggleViewMode = () => {
    setViewMode((prev: ViewMode) => (prev === "paginated" ? "infinite" : "paginated"));
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assets</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {total > 0 ? `${total} asset${total !== 1 ? "s" : ""}` : "No assets yet"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleViewMode}
            title={viewMode === "paginated" ? "Switch to infinite scroll" : "Switch to paginated table"}
          >
            {viewMode === "paginated" ? (
              <>
                <ArrowDown size={16} className="mr-1.5" />
                Infinite Scroll
              </>
            ) : (
              <>
                <List size={16} className="mr-1.5" />
                Paginated
              </>
            )}
          </Button>
          <ThemeToggle />
          <Button onClick={() => setShowModal(true)}>
            <Plus size={16} className="mr-1.5" />
            Create Asset
          </Button>
        </div>
      </div>

      {/* Content area - conditionally render based on view mode */}
      {viewMode === "infinite" ? (
        <InfiniteAssetList
          filters={filters}
          onFilterChange={handleFilterChange}
          onEdit={(id) => setEditId(id)}
          onDelete={(id) => setDeleteId(id)}
        />
      ) : (
        <>
          {/* Filter Bar */}
          <AssetFilterBar filters={filters} onChange={handleFilterChange} />

          {/* Table */}
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
                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                  ) : assets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-400 dark:text-gray-500">
                        {Object.values(filters).some(Boolean)
                          ? "No assets match your filters."
                          : 'No assets yet. Click "Create Asset" to get started.'}
                      </td>
                    </tr>
                  ) : (
                    assets.map((asset) => (
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
                              onClick={() => setEditId(asset.id)}
                              className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteId(asset.id)}
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-600">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Page {page} of {totalPages} — {total} total
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Create Modal */}
      {showModal && (
        <CreateAssetModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: queryKeys.assets.all });
            setShowModal(false);
          }}
        />
      )}

      {/* Edit Modal */}
      {editId && (
        <CreateAssetModal
          assetId={editId}
          onClose={() => setEditId(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: queryKeys.assets.all });
            setEditId(null);
          }}
        />
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <ConfirmDialog
          title="Delete Asset"
          message="This action cannot be undone. The asset will be permanently removed."
          confirmLabel="Delete"
          loading={deleteAsset.isPending}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
