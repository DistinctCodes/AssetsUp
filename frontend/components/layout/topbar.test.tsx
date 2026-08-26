import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Topbar } from './topbar';

const mockPush = jest.fn();
const mockLogout = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/store/auth.store', () => ({
  useAuthStore: (selector: (state: { user: { firstName: string; lastName: string; role: string } | null; logout: () => Promise<void> }) => unknown) =>
    selector({
      user: { firstName: 'Jane', lastName: 'Doe', role: 'admin' },
      logout: mockLogout,
    }),
}));

jest.mock('@/components/wallet/wallet-button', () => ({
  WalletButton: () => <div data-testid="wallet-button">Wallet</div>,
}));

jest.mock('@/lib/theme-provider', () => ({
  useTheme: () => ({
    theme: 'light' as const,
    setTheme: jest.fn(),
  }),
}));

describe('Topbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the page title based on pathname', () => {
    render(<Topbar />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders the user initials', () => {
    render(<Topbar />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders the user name and role', () => {
    render(<Topbar />);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('opens the user dropdown when clicked', () => {
    render(<Topbar />);
    const menuButton = screen.getByRole('button', { name: /open user menu/i });
    fireEvent.click(menuButton);
    expect(screen.getByText('View Profile')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('calls logout and redirects to /login when Logout is clicked', async () => {
    render(<Topbar />);
    const menuButton = screen.getByRole('button', { name: /open user menu/i });
    fireEvent.click(menuButton);
    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);
    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('renders the wallet button', () => {
    render(<Topbar />);
    expect(screen.getByTestId('wallet-button')).toBeInTheDocument();
  });

  it('calls onMenuClick when hamburger is clicked', () => {
    const onMenuClick = jest.fn();
    render(<Topbar onMenuClick={onMenuClick} />);
    const hamburger = screen.getByRole('button', { name: /open navigation menu/i });
    fireEvent.click(hamburger);
    expect(onMenuClick).toHaveBeenCalledTimes(1);
  });
});
