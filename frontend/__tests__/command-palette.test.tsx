import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CommandPalette } from '@/components/ui/command-palette';

const push = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

const apiGet = jest.fn();
jest.mock('@/lib/api', () => ({
  api: { get: (...args: unknown[]) => apiGet(...args) },
}));

describe('CommandPalette', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiGet.mockResolvedValue({ data: { data: [] } });
  });

  it('renders nothing when closed', () => {
    const { container } = render(<CommandPalette isOpen={false} onClose={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the navigation items when open', () => {
    render(<CommandPalette isOpen onClose={jest.fn()} />);
    expect(screen.getByPlaceholderText('Search assets or navigate...')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Assets')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = jest.fn();
    render(<CommandPalette isOpen onClose={onClose} />);
    fireEvent.keyDown(screen.getByPlaceholderText('Search assets or navigate...'), {
      key: 'Escape',
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = jest.fn();
    const { container } = render(<CommandPalette isOpen onClose={onClose} />);
    const backdrop = container.querySelector('.absolute.inset-0');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('navigates to a navigation item on click and closes the palette', () => {
    const onClose = jest.fn();
    render(<CommandPalette isOpen onClose={onClose} />);
    fireEvent.click(screen.getByText('Assets'));
    expect(push).toHaveBeenCalledWith('/assets');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('searches assets after typing and renders matching results', async () => {
    jest.useFakeTimers({ legacyFakeTimers: false });
    apiGet.mockResolvedValue({
      data: {
        data: [
          { id: 'a1', name: 'MacBook Pro', assetId: 'AST-001' },
        ],
      },
    });

    render(<CommandPalette isOpen onClose={jest.fn()} />);
    const input = screen.getByPlaceholderText('Search assets or navigate...');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'macbook' } });
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(apiGet).toHaveBeenCalledWith('/assets', { params: { search: 'macbook' } });
    });

    expect(await screen.findByText('MacBook Pro')).toBeInTheDocument();
    expect(screen.getByText('AST-001')).toBeInTheDocument();

    jest.useRealTimers();
  });

  it('moves the selection with ArrowDown/ArrowUp and selects with Enter', () => {
    render(<CommandPalette isOpen onClose={jest.fn()} />);
    const input = screen.getByPlaceholderText('Search assets or navigate...');

    // Dashboard (index 0) is selected by default; ArrowDown moves to Assets.
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(push).toHaveBeenCalledWith('/assets');
  });

  it('resets search and selection when reopened after being closed', () => {
    const { rerender } = render(<CommandPalette isOpen onClose={jest.fn()} />);
    const input = screen.getByPlaceholderText('Search assets or navigate...');
    fireEvent.change(input, { target: { value: 'something' } });
    expect(input).toHaveValue('something');

    rerender(<CommandPalette isOpen={false} onClose={jest.fn()} />);
    rerender(<CommandPalette isOpen onClose={jest.fn()} />);

    expect(screen.getByPlaceholderText('Search assets or navigate...')).toHaveValue('');
  });
});
