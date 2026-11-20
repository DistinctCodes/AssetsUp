import { render, screen, fireEvent } from '@testing-library/react';
import type { AppUser } from '@/lib/api/users';

let currentRole = 'ADMIN';
const users: AppUser[] = [
  { id: 'u-1', firstName: 'Ada', lastName: 'Admin', email: 'ada@x.com', role: 'ADMIN', isActive: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'u-2', firstName: 'Mo', lastName: 'Manager', email: 'mo@x.com', role: 'MANAGER', isActive: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'u-3', firstName: 'Eve', lastName: 'Employee', email: 'eve@x.com', role: 'EMPLOYEE', isActive: false, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
];

jest.mock('@/lib/query/hooks/useUsers', () => ({
  useUsersList: () => ({ data: users, isLoading: false }),
  useUpdateUserRole: () => ({ mutate: jest.fn(), isPending: false }),
  useToggleUserActive: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useInviteUser: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));
jest.mock('@/store/auth.store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ user: { id: 'me', role: currentRole } }),
}));
jest.mock('@/components/ui/toast', () => ({ toast: { error: jest.fn() } }));

import UsersPage from '@/app/(dashboard)/users/page';

beforeEach(() => {
  currentRole = 'ADMIN';
});

describe('Users page with the backend role values', () => {
  it('shows the invite and deactivate actions to an ADMIN', () => {
    render(<UsersPage />);
    expect(screen.getByRole('button', { name: /invite user/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /deactivate|activate/i }).length).toBeGreaterThan(0);
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('hides them from a MANAGER and an EMPLOYEE', () => {
    for (const role of ['MANAGER', 'EMPLOYEE']) {
      currentRole = role;
      const { unmount } = render(<UsersPage />);
      expect(screen.queryByRole('button', { name: /invite user/i })).not.toBeInTheDocument();
      expect(screen.queryByText('Actions')).not.toBeInTheDocument();
      unmount();
    }
  });

  it('does not recognise the old lowercase role', () => {
    currentRole = 'admin';
    render(<UsersPage />);
    expect(screen.queryByRole('button', { name: /invite user/i })).not.toBeInTheDocument();
  });

  it('filters by role', () => {
    render(<UsersPage />);
    expect(screen.getByText('Ada Admin')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('All Roles'), { target: { value: 'MANAGER' } });
    expect(screen.queryByText('Ada Admin')).not.toBeInTheDocument();
    expect(screen.getByText('Mo Manager')).toBeInTheDocument();
    expect(screen.queryByText('Eve Employee')).not.toBeInTheDocument();
  });

  it('offers the three backend roles with friendly labels in the filter', () => {
    render(<UsersPage />);
    const filter = screen.getByDisplayValue('All Roles') as HTMLSelectElement;
    expect(Array.from(filter.options).map((o) => [o.value, o.textContent])).toEqual([
      ['', 'All Roles'],
      ['ADMIN', 'Admin'],
      ['MANAGER', 'Manager'],
      ['EMPLOYEE', 'Employee'],
    ]);
  });
});
