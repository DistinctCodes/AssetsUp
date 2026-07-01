'use client';

import { useState } from 'react';
import { Plus, Trash2, Building2, Tag, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  useDepartmentsList,
  useCreateDepartment,
  useDeleteDepartment,
  useCategories,
  useCreateCategory,
  useDeleteCategory,
} from '@/lib/query/hooks/useAssets';
import { DepartmentWithCount, CategoryWithCount } from '@/lib/api/assets';

type Tab = 'departments' | 'categories';

export default function DepartmentsPage() {
  const [tab, setTab] = useState<Tab>('departments');

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Organisation</h1>
        <p className="text-sm text-gray-500 mt-1">Manage departments and asset categories</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {([
          { key: 'departments' as Tab, label: 'Departments', icon: <Building2 size={15} /> },
          { key: 'categories' as Tab, label: 'Categories', icon: <Tag size={15} /> },
        ] as const).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {tab === 'departments' && <DepartmentsTab />}
      {tab === 'categories' && <CategoriesTab />}
    </div>
  );
}

// ── Departments Tab ──────────────────────────────────────────

function DepartmentsTab() {
  const { data: departments = [], isLoading } = useDepartmentsList();
  const createDept = useCreateDepartment();
  const deleteDept = useDeleteDepartment();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DepartmentWithCount | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) { setFormError('Name is required'); return; }
    setFormError('');
    try {
      await createDept.mutateAsync({ name: name.trim(), description: description.trim() || undefined });
      setName('');
      setDescription('');
      setShowForm(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg || 'Failed to create department.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteDept.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {departments.length} department{departments.length !== 1 ? 's' : ''}
        </p>
        <Button size="sm" onClick={() => { setShowForm(true); setFormError(''); }}>
          <Plus size={15} className="mr-1" />
          Add Department
        </Button>
      </div>

      {/* Inline create form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">New Department</h3>
          <div className="space-y-3">
            <Input
              id="dept-name"
              label="Name *"
              placeholder="e.g. Engineering"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <Input
              id="dept-desc"
              label="Description"
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {formError && <p className="text-xs text-red-500">{formError}</p>}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setName(''); setDescription(''); }}>
                Cancel
              </Button>
              <Button size="sm" loading={createDept.isPending} onClick={handleCreate}>
                Create Department
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="text-sm text-gray-400 text-center py-12">Loading departments...</div>
      ) : departments.length === 0 ? (
        <EmptyState
          icon={<Building2 size={32} className="text-gray-300" />}
          title="No departments yet"
          message='Click "Add Department" to create your first one.'
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {departments.map((dept) => (
            <EntityCard
              key={dept.id}
              name={dept.name}
              description={dept.description}
              count={dept.assetCount}
              countLabel="asset"
              onDelete={() => setDeleteTarget(dept)}
            />
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete department?"
          message={`"${deleteTarget.name}" will be permanently deleted. Assets in this department will need to be reassigned.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteDept.isPending}
        />
      )}
    </div>
  );
}

// ── Categories Tab ───────────────────────────────────────────

function CategoriesTab() {
  const { data: categories = [], isLoading } = useCategories();
  const createCat = useCreateCategory();
  const deleteCat = useDeleteCategory();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<CategoryWithCount | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) { setFormError('Name is required'); return; }
    setFormError('');
    try {
      await createCat.mutateAsync({ name: name.trim(), description: description.trim() || undefined });
      setName('');
      setDescription('');
      setShowForm(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg || 'Failed to create category.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteCat.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}
        </p>
        <Button size="sm" onClick={() => { setShowForm(true); setFormError(''); }}>
          <Plus size={15} className="mr-1" />
          Add Category
        </Button>
      </div>

      {/* Inline create form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">New Category</h3>
          <div className="space-y-3">
            <Input
              id="cat-name"
              label="Name *"
              placeholder="e.g. Laptops"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <Input
              id="cat-desc"
              label="Description"
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {formError && <p className="text-xs text-red-500">{formError}</p>}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setName(''); setDescription(''); }}>
                Cancel
              </Button>
              <Button size="sm" loading={createCat.isPending} onClick={handleCreate}>
                Create Category
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="text-sm text-gray-400 text-center py-12">Loading categories...</div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={<Tag size={32} className="text-gray-300" />}
          title="No categories yet"
          message='Click "Add Category" to create your first one.'
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((cat) => (
            <EntityCard
              key={cat.id}
              name={cat.name}
              description={cat.description}
              count={cat.assetCount}
              countLabel="asset"
              onDelete={() => setDeleteTarget(cat)}
            />
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete category?"
          message={`"${deleteTarget.name}" will be permanently deleted. Assets in this category will need to be recategorised.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteCat.isPending}
        />
      )}
    </div>
  );
}

// ── Shared components ────────────────────────────────────────

function EntityCard({
  name,
  description,
  count,
  countLabel,
  onDelete,
}: {
  name: string;
  description?: string | null;
  count: number;
  countLabel: string;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between group">
      <div className="min-w-0">
        <p className="font-medium text-gray-900 truncate">{name}</p>
        {description && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{description}</p>
        )}
        <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
          <Package size={12} />
          {count} {countLabel}{count !== 1 ? 's' : ''}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity ml-3 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0"
        title={`Delete ${name}`}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function EmptyState({ icon, title, message }: { icon: React.ReactNode; title: string; message: string }) {
  return (
    <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
      <div className="flex justify-center mb-3">{icon}</div>
      <p className="text-sm font-medium text-gray-700">{title}</p>
      <p className="text-xs text-gray-400 mt-1">{message}</p>
    </div>
  );
}
