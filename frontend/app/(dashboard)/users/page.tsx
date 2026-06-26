'use client';

import { useState, useMemo } from 'react';
import { Search, Shield, UserCircle } from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { useUsersList, useUpdateUserRole } from '@/lib/query/hooks/useUsers';
import { useAuthStore } from '@/store/auth.store';
import { AppUser, UserRole } from '@/lib/api/users';

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
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-1">
            {users.length} member{users.length !== 1 ? 's' : ''} in your organisation
          </p>
        </div>
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
              <th className="text-left px-4 py-3 font-medium text-gray-500">Joined</th>
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

                    {/* Joined */}
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {format(new Date(user.createdAt), 'MMM d, yyyy')}
                    </td>
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
