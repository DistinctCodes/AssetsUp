/**
 * Centralized query and mutation keys for React Query
 * This ensures consistent cache management across the application
 */
export const queryKeys = {
  auth: {
    register: ['auth', 'register'] as const,
    login: ['auth', 'login'] as const,
  },
  assets: {
    all: ['assets'] as const,
    lists: () => [...queryKeys.assets.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.assets.lists(), filters] as const,
    details: () => [...queryKeys.assets.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.assets.details(), id] as const,
    history: (id: string, filters?: Record<string, unknown>) =>
      [...queryKeys.assets.detail(id), 'history', filters] as const,
    documents: (id: string) => [...queryKeys.assets.detail(id), 'documents'] as const,
    maintenance: (id: string) => [...queryKeys.assets.detail(id), 'maintenance'] as const,
    notes: (id: string) => [...queryKeys.assets.detail(id), 'notes'] as const,
  },
  departments: {
    all: ['departments'] as const,
    list: () => [...queryKeys.departments.all, 'list'] as const,
  },
  categories: {
    all: ['categories'] as const,
    list: () => [...queryKeys.categories.all, 'list'] as const,
  },
  users: {
    all: ['users'] as const,
    list: () => [...queryKeys.users.all, 'list'] as const,
  },
  reports: {
    all: ['reports'] as const,
    summary: () => [...queryKeys.reports.all, 'summary'] as const,
  },
} as const;