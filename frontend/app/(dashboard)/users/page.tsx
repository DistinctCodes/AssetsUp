'use client';

import { useState, useMemo } from 'react';
import { Search, Shield, UserCircle, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { useUsersList, useUpdateUserRole, useToggleUserActive, useInviteUser } from '@/lib/query/hooks/useUsers';
import { useAuthStore } from '@/store/auth.store';
import { AppUser, UserRole } from '@/lib/api/users';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const ROLES: UserRole[] = ['admin', 'manager', 'staff'];

const roleConfig: Record<UserRole, { label: string; className: string }> = {
  admin:   { label: 'Admin',   className: 'bg-purple-100 text-purple-700' },
  manager: { label: 'Manager', className: 'bg-blue-100   text-blue-700'   },
  staff:   { label: 'Staff',   className: 'bg-gray-100   text-gray-600'   },
};

export default function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');

  const { data: users = [], isLoading } = useUsersList();
  const updateRole = useUpdateUserRole();
  const toggleActive = useToggleUserActive();
  const inviteUser = useInviteUser();
  const [showInvite, setShowInvite] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<AppUser | null>(null);

  // client-side filter (list is typically small)
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const matchSearch =
        !q ||
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      const matchRole = !roleFilter || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const handleRoleChange = (user: AppUser, newRole: UserRole) => {
    if (newRole === user.role) return;
    updateRole.mutate({ id: user.id, role: newRole });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users & Roles</h1>
          <p className="text-sm text-gray-500 mt-1">
            {users.length} member{users.length !== 1 ? 's' : ''} in your organisation
          </p>
        </div>
        {currentUser?.role === 'admin' && (
          <Button onClick={() => setShowInvite(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Invite User
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-700"
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{roleConfig[r].label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-500">User</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Joined</th>
              {currentUser?.role === 'admin' && <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-gray-400">Loading users...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-16 text-center">
                  <UserCircle size={32} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    {search || roleFilter ? 'No users match your filters.' : 'No users found.'}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((user) => {
                const isCurrentUser = user.id === currentUser?.id;
                const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

                return (
                  <tr
                    key={user.id}
                    className={clsx(
                      'border-b border-gray-100 last:border-0 transition-colors',
                      isCurrentUser ? 'bg-gray-50' : 'hover:bg-gray-50/50',
                    )}
                  >
                    {/* Avatar + name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={clsx(
                          'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0',
                          isCurrentUser
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-200 text-gray-700',
                        )}>
                          {initials}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs text-gray-400 font-normal">(you)</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 text-gray-500">{user.email}</td>

                    {/* Role dropdown */}
                    <td className="px-4 py-3">
                      <RoleDropdown
                        value={user.role}
                        disabled={isCurrentUser || updateRole.isPending}
                        onChange={(role) => handleRoleChange(user, role)}
                      />
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.isActive !== false ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {user.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {format(new Date(user.createdAt), 'MMM d, yyyy')}
                    </td>

                    {/* Actions */}
                    {currentUser?.role === 'admin' && (
                      <td className="px-4 py-3 text-right">
                        {!isCurrentUser && (
                          <button
                            onClick={() => setDeactivateTarget(user)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            {user.isActive !== false ? "Deactivate" : "Activate"}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Role legend */}
        {users.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-4">
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Shield size={12} />
              Role permissions:
            </p>
            {ROLES.map((r) => (
              <span
                key={r}
                className={clsx(
                  'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium',
                  roleConfig[r].className,
                )}
              >
                {roleConfig[r].label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Role Capabilities Panel */}
      <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Role Capabilities</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-purple-50 rounded-lg">
            <h3 className="font-medium text-purple-900 mb-2">Admin</h3>
            <ul className="text-xs text-purple-700 space-y-1">
              <li>Manage users and roles</li>
              <li>Full asset CRUD</li>
              <li>Approve transfers</li>
              <li>System settings</li>
              <li>View audit logs</li>
            </ul>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Manager</h3>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>View all assets</li>
              <li>Approve transfers</li>
              <li>Manage maintenance</li>
              <li>Confirm reservations</li>
              <li>View reports</li>
            </ul>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Staff</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>View assigned assets</li>
              <li>Report issues</li>
              <li>Request transfers</li>
              <li>View notifications</li>
              <li>Edit own profile</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Invite User Modal */}
      {showInvite && <InviteUserModal onClose={() => setShowInvite(false)} />}

      {/* Deactivate Confirm */}
      <ConfirmDialog
        open={!!deactivateTarget}
        onConfirm={async () => {
          if (deactivateTarget) {
            await toggleActive.mutateAsync({
              id: deactivateTarget.id,
              isActive: deactivateTarget.isActive === false,
            });
          }
          setDeactivateTarget(null);
        }}
        onCancel={() => setDeactivateTarget(null)}
        title={deactivateTarget?.isActive !== false ? "Deactivate User" : "Activate User"}
        description={deactivateTarget?.isActive !== false
          ? `Deactivate ${deactivateTarget?.firstName} ${deactivateTarget?.lastName}? They will not be able to log in.`
          : `Activate ${deactivateTarget?.firstName} ${deactivateTarget?.lastName}? They will be able to log in again.`}
      />
    </div>
  );
}

// ── Role Dropdown ────────────────────────────────────────────

function RoleDropdown({
  value,
  disabled,
  onChange,
}: {
  value: UserRole;
  disabled: boolean;
  onChange: (role: UserRole) => void;
}) {
  const config = roleConfig[value];

  return (
    <div className="relative inline-block">
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as UserRole)}
        className={clsx(
          'appearance-none pl-2.5 pr-6 py-1 rounded-md text-xs font-medium border-0 cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1',
          'disabled:cursor-not-allowed disabled:opacity-60',
          config.className,
        )}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>{roleConfig[r].label}</option>
        ))}
      </select>
      {/* Chevron icon overlay */}
      <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-current opacity-60">
        ▾
      </span>
    </div>
  );
}

// ── Invite User Modal ──────────────────────────────────────

function InviteUserModal({ onClose }: { onClose: () => void }) {
  const inviteUser = useInviteUser();
  const [form, setForm] = useState({ email: "", firstName: "", lastName: "", role: "staff" as UserRole });
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inviteUser.mutateAsync(form);
      onClose();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to invite user");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Invite User</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input placeholder="Email" type="email" required value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          <Input placeholder="First name" required value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} />
          <Input placeholder="Last name" required value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} />
          <select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as UserRole }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={inviteUser.isPending}>{inviteUser.isPending ? "Inviting..." : "Send Invite"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
