import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from './sidebar';

const mockPush = jest.fn();
const mockLogout = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/store/auth.store', () => ({
  useAuthStore: (selector: (state: { logout: () => Promise<void> }) => unknown) =>
    selector({ logout: mockLogout }),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all navigation items', () => {
    render(<Sidebar />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Assets')).toBeInTheDocument();
    expect(screen.getByText('Locations')).toBeInTheDocument();
    expect(screen.getByText('Vendors')).toBeInTheDocument();
    expect(screen.getByText('Purchase Orders')).toBeInTheDocument();
    expect(screen.getByText('Maintenance')).toBeInTheDocument();
    expect(screen.getByText('Audits')).toBeInTheDocument();
    expect(screen.getByText('Licenses')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Organisation')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('highlights the active nav item based on pathname', () => {
    render(<Sidebar />);
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveAttribute('aria-current', 'page');
  });

  it('calls logout and redirects to /login when Logout is clicked', async () => {
    render(<Sidebar />);
    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);
    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('renders Settings and Notifications links', () => {
    render(<Sidebar />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('renders the AssetsUp logo text', () => {
    render(<Sidebar />);
    expect(screen.getByText('AssetsUp')).toBeInTheDocument();
  });
});
