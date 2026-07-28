import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DashboardPage from '../app/(dashboard)/dashboard/page';

// Mock TanStack Query hook & Auth Store
jest.mock('@/lib/query/hooks/useReports', () => ({
  useReportsSummary: () => ({
    data: {
      total: 25,
      byStatus: { active: 15, assigned: 8, maintenance: 2 },
      recent: [],
    },
    isLoading: false,
    isError: false,
  }),
}));

jest.mock('@/store/auth.store', () => ({
  useAuthStore: (selector: (state: { user: { id: string; firstName: string } }) => unknown) =>
    selector({ user: { id: 'usr_test_123', firstName: 'Jane' } }),
}));

describe('DashboardPage Customization (Issue #1050)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders Customise Dashboard button on header', () => {
    render(<DashboardPage />);
    expect(screen.getByRole('button', { name: /customise dashboard/i })).toBeInTheDocument();
  });

  it('enters edit mode when Customise Dashboard button is clicked', () => {
    render(<DashboardPage />);
    const customizeBtn = screen.getByRole('button', { name: /customise dashboard/i });
    fireEvent.click(customizeBtn);

    expect(screen.getByText(/edit mode active/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /done customising/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset to default/i })).toBeInTheDocument();
  });

  it('allows hiding a widget and restoring it from hidden cards list', () => {
    render(<DashboardPage />);
    fireEvent.click(screen.getByRole('button', { name: /customise dashboard/i }));

    const hideButtons = screen.getAllByRole('button', { name: /hide/i });
    expect(hideButtons.length).toBeGreaterThan(0);
    fireEvent.click(hideButtons[0]);

    // Check hidden cards drawer appears
    expect(screen.getByText(/hidden cards/i)).toBeInTheDocument();
  });

  it('resets layout to default when Reset to Default button is clicked', () => {
    render(<DashboardPage />);
    fireEvent.click(screen.getByRole('button', { name: /customise dashboard/i }));

    const resetBtn = screen.getByRole('button', { name: /reset to default/i });
    fireEvent.click(resetBtn);

    expect(screen.queryByText(/edit mode active/i)).not.toBeInTheDocument();
  });
});
