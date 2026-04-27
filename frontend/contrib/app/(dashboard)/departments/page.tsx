"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Building2, FolderTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useDepartmentsList,
  useDeleteDepartment,
  useCategories,
  useDeleteCategory,
} from "@/lib/query/hooks/useAssets";
import { DepartmentModal } from "./DepartmentModal";
import { CategoryModal } from "./CategoryModal";
import { DepartmentWithCount, CategoryWithCount } from "@/lib/api/assets";

const TABS = ["Departments", "Categories"] as const;
type Tab = (typeof TABS)[number];

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      {Array.from({ length: 4 }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-4 bg-gray-100 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export default function DepartmentsPage() {
  const [tab, setTab] = useState<Tab>("Departments");

  // Departments query & mutations
  const { data: departments = [], isLoading: loadingDepts } = useDepartmentsList();
  const deleteDept = useDeleteDepartment();

  // Categories query & mutations
  const { data: categories = [], isLoading: loadingCats } = useCategories();
  const deleteCat = useDeleteCategory();

  // State: Departments
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editDept, setEditDept] = useState<DepartmentWithCount | null>(null);
  const [deleteDeptId, setDeleteDeptId] = useState<string | null>(null);

  // State: Categories
  const [showCatModal, setShowCatModal] = useState(false);
  const [editCat, setEditCat] = useState<CategoryWithCount | null>(null);
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);

  const handleDeleteDept = async () => {
    if (!deleteDeptId) return;
    try {
      await deleteDept.mutateAsync(deleteDeptId);
      setDeleteDeptId(null);
    } catch (err) {
      console.error(err);
      setDeleteDeptId(null);
    }
  };

  const handleDeleteCat = async () => {
    if (!deleteCatId) return;
    try {
      await deleteCat.mutateAsync(deleteCatId);
      setDeleteCatId(null);
    } catch (err) {
      console.error(err);
      setDeleteCatId(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organization</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your departments and categories</p>
        </div>
        {tab === "Departments" && (
          <Button onClick={() => setShowDeptModal(true)}>
            <Plus size={16} className="mr-1.5" />
            Create Department
          </Button>
        )}
        {tab === "Categories" && (
          <Button onClick={() => setShowCatModal(true)}>
            <Plus size={16} className="mr-1.5" />
            Create Category
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 py-3 px-1 mr-6 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "Departments" ? <Building2 size={16} /> : <FolderTree size={16} />}
            {t}
          </button>
        ))}
      </div>

      {/* Departments Content */}
      {tab === "Departments" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Description</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Assets</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingDepts ? (
                  Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
                ) : departments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-gray-400">
                      No departments yet. Click "Create Department" to get started.
                    </td>
                  </tr>
                ) : (
                  departments.map((dept) => (
                    <tr
                      key={dept.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-4 font-medium text-gray-900">{dept.name}</td>
                      <td className="px-4 py-4 text-gray-600">{dept.description || "—"}</td>
                      <td className="px-4 py-4 text-gray-600">
                        <span className="inline-flex items-center justify-center bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                          {dept.assetCount}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditDept(dept)}
                            className="text-gray-400 hover:text-gray-700 p-1"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteDeptId(dept.id)}
                            className="text-gray-400 hover:text-red-600 p-1"
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
        </div>
      )}

      {/* Categories Content */}
      {tab === "Categories" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Description</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Assets</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingCats ? (
                  Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-gray-400">
                      No categories yet. Click "Create Category" to get started.
                    </td>
                  </tr>
                ) : (
                  categories.map((cat) => (
                    <tr
                      key={cat.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-4 font-medium text-gray-900">{cat.name}</td>
                      <td className="px-4 py-4 text-gray-600">{cat.description || "—"}</td>
                      <td className="px-4 py-4 text-gray-600">
                        <span className="inline-flex items-center justify-center bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                          {cat.assetCount}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditCat(cat)}
                            className="text-gray-400 hover:text-gray-700 p-1"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteCatId(cat.id)}
                            className="text-gray-400 hover:text-red-600 p-1"
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
        </div>
      )}

      {/* Modals & Dialogs */}

      {(showDeptModal || editDept) && (
        <DepartmentModal
          department={editDept || undefined}
          onClose={() => {
            setShowDeptModal(false);
            setEditDept(null);
          }}
        />
      )}

      {(showCatModal || editCat) && (
        <CategoryModal
          category={editCat || undefined}
          onClose={() => {
            setShowCatModal(false);
            setEditCat(null);
          }}
        />
      )}

      {deleteDeptId && (
        <ConfirmDialog
          title="Delete Department"
          message="Are you sure you want to delete this department? This action cannot be undone."
          confirmLabel="Delete"
          loading={deleteDept.isPending}
          onConfirm={handleDeleteDept}
          onCancel={() => setDeleteDeptId(null)}
        />
      )}

      {deleteCatId && (
        <ConfirmDialog
          title="Delete Category"
          message="Are you sure you want to delete this category? This action cannot be undone."
          confirmLabel="Delete"
          loading={deleteCat.isPending}
          onConfirm={handleDeleteCat}
          onCancel={() => setDeleteCatId(null)}
        />
      )}
    </div>
  );
}
