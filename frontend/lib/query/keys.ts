/**
 * Centralized query and mutation keys for React Query
 * This ensures consistent cache management across the application
 */
export const queryKeys = {
  auth: {
    register: ['auth', 'register'] as const,
    login: ['auth', 'login'] as const,
  },
} as const;