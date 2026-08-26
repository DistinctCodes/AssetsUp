import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DateRangeSelector } from './DateRangeSelector';

// Mock Next.js navigation hooks
const mockPush = jest.fn();
const mockUseSearchParams = jest.fn();
const mockUsePathname = jest.fn(() => '/dashboard');

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => mockUsePathname(),
  useSearchParams: () => mockUseSearchParams(),
}));

describe('DateRangeSelector', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Default search params (30d preset)
    mockUseSearchParams.mockReturnValue(new URLSearchParams('preset=30d'));
  });

  it('renders all preset buttons correctly', () => {
    render(<DateRangeSelector />);
    
    // Verify all preset buttons are present
    expect(screen.getByText('7 days')).toBeInTheDocument();
    expect(screen.getByText('30 days')).toBeInTheDocument();
    expect(screen.getByText('90 days')).toBeInTheDocument();
    expect(screen.getByText('1 year')).toBeInTheDocument();
    
    // Verify the 30d button is active (aria-pressed=true)
    const activeButton = screen.getByText('30 days');
    expect(activeButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onChange and updates URL search params when a preset is clicked', () => {
    const mockOnChange = jest.fn();
    render(<DateRangeSelector onChange={mockOnChange} />);
    
    // Click on "7 days" preset
    const sevenDayButton = screen.getByText('7 days');
    fireEvent.click(sevenDayButton);
    
    // Verify router.push was called with correct search params
    expect(mockPush).toHaveBeenCalled();
    const pushedUrl = mockPush.mock.calls[0][0];
    expect(pushedUrl).toContain('preset=7d');
    expect(pushedUrl).toContain('from=');
    expect(pushedUrl).toContain('to=');
    
    // Verify onChange was called with the correct date range
    expect(mockOnChange).toHaveBeenCalled();
    const range = mockOnChange.mock.calls[0][0];
    expect(range.from).toBeDefined();
    expect(range.to).toBeDefined();
  });

  it('updates to custom range when date inputs are changed', () => {
    const mockOnChange = jest.fn();
    render(<DateRangeSelector onChange={mockOnChange} />);
    
    // Get the date inputs
    const fromInput = screen.getByLabelText('Start date');
    const toInput = screen.getByLabelText('End date');
    
    // Change the from date
    fireEvent.change(fromInput, { target: { value: '2024-01-01' } });
    
    // Verify it switched to custom preset
    expect(mockPush).toHaveBeenCalled();
    let pushedUrl = mockPush.mock.calls[0][0];
    expect(pushedUrl).toContain('preset=custom');
    expect(pushedUrl).toContain('from=2024-01-01');
    
    // Change the to date
    fireEvent.change(toInput, { target: { value: '2024-01-31' } });
    
    // Verify URL is updated with new to date
    pushedUrl = mockPush.mock.calls[1][0];
    expect(pushedUrl).toContain('preset=custom');
    expect(pushedUrl).toContain('to=2024-01-31');
    
    // Verify onChange was called twice (once for each change)
    expect(mockOnChange).toHaveBeenCalledTimes(2);
  });

  it('maintains custom preset when custom dates are already in URL', () => {
    // Set search params to custom range
    mockUseSearchParams.mockReturnValue(new URLSearchParams('preset=custom&from=2024-01-01&to=2024-01-31'));
    
    render(<DateRangeSelector />);
    
    // Verify the date inputs have the correct values
    const fromInput = screen.getByLabelText('Start date') as HTMLInputElement;
    const toInput = screen.getByLabelText('End date') as HTMLInputElement;
    
    expect(fromInput.value).toBe('2024-01-01');
    expect(toInput.value).toBe('2024-01-31');
  });

  it('correctly marks the active preset button based on URL params', () => {
    // Set search params to 90d
    mockUseSearchParams.mockReturnValue(new URLSearchParams('preset=90d'));
    
    render(<DateRangeSelector />);
    
    // Verify 90 days button is active
    const activeButton = screen.getByText('90 days');
    expect(activeButton).toHaveAttribute('aria-pressed', 'true');
    
    // Other buttons should not be active
    expect(screen.getByText('7 days')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('30 days')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('1 year')).toHaveAttribute('aria-pressed', 'false');
  });
});