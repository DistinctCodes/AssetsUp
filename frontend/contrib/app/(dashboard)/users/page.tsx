'use client';

import { useMemo, useState } from 'react';
import { Search, Users2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useUsers } from '@/lib/query/hooks';
import { queryKeys } from '@/lib/query/queryKeys';
import { useAuthStore } from '@/contrib/store/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { ToastProvider, toast } from '@/components/ui/toast';

const ROLE_OPTIONS = ['All', 'Admin', 'Manager', 'Staff'] as const;

type RoleFilter = (typeof ROLE_OPTIONS)[number];

function formatJoinedDate(isoDate: string) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(isoDate));
  } catch {
    return isoDate;
  }
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const { data: users = [], isLoading } = useUsers();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('All');
  const [updatingRoles, setUpdatingRoles] = useState<Record<string, boolean>>({});

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return users
      .filter((user) => {
        const matchesSearch =
          normalizedSearch === '' ||
          `${user.firstName} ${user.lastName}`.toLowerCase().includes(normalizedSearch) ||
          user.email.toLowerCase().includes(normalizedSearch);
        const matchesRole = roleFilter === 'All' || user.role === roleFilter;
        return matchesSearch && matchesRole;
      })
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
  }, [search, roleFilter, users]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingRoles((prev) => ({ ...prev, [userId]: true }));
    try {
      await api.patch(`/users/${userId}/role`, { role: newRole });
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
      toast.success('User role updated');
    } catch (error) {
      toast.error('Unable to update role. Please try again.');
    } finally {
      setUpdatingRoles((prev) => ({ ...prev, [userId]: false }));
    }
  };

  return (
    <div>
      <ToastProvider />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-1">Manage platform users, roles, and onboarding.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Input
            type="search"
            placeholder="Search by name or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            leftIcon={<Search size={16} />}
          />
          <div className="flex flex-wrap items-center gap-2">
            {ROLE_OPTIONS.map((role) => (
              <Button
                key={role}
                type="button"
                variant={roleFilter === role ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setRoleFilter(role)}
              >
                {role}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-4 text-left font-medium text-gray-500">Name</th>
                <th className="px-4 py-4 text-left font-medium text-gray-500">Email</th>
                <th className="px-4 py-4 text-left font-medium text-gray-500">Role</th>
                <th className="px-4 py-4 text-left font-medium text-gray-500">Joined Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    {Array.from({ length: 4 }).map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-4">
                        <div className="h-4 w-full max-w-[10rem] rounded-full bg-gray-100 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-500">
                    {users.length === 0
                      ? 'No users found. Invite your team to get started.'
                      : 'No users match your current search and filters.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrentUser = currentUser?.id === user.id;
                  const roleUpdating = updatingRoles[user.id] ?? false;

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-4 text-gray-900 font-medium">
                        {user.firstName} {user.lastName}
                      </td>
                      <td className="px-4 py-4 text-gray-600">{user.email}</td>
                      <td className="px-4 py-4">
                        <select
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                          value={user.role}
                          disabled={isCurrentUser || roleUpdating}
                          onChange={(event) => handleRoleChange(user.id, event.target.value)}
                        >
                          {ROLE_OPTIONS.slice(1).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4 text-gray-600">{formatJoinedDate(user.createdAt)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
