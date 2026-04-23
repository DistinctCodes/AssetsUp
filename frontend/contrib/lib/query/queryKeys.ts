export const queryKeys = {
  assets: {
    all: () => ['assets'] as const,
    detail: (id: string) => ['assets', 'detail', id] as const,
  },
  departments: {
    all: () => ['departments'] as const,
  },
  categories: {
    all: () => ['categories'] as const,
  },
  users: {
    all: () => ['users'] as const,
  },
  reports: {
    summary: () => ['reports', 'summary'] as const,
  },
} as const;
