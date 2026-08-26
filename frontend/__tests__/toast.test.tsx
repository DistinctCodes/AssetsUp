import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ToastProvider, toast } from '@/components/ui/toast';

// Mock setTimeout and clearTimeout for reliable timing tests
jest.useFakeTimers();
jest.spyOn(global, 'setTimeout');

describe('Toast Component', () => {
  beforeEach(() => {
    // Clear all toasts and mocks before each test
    jest.clearAllMocks();
    render(<ToastProvider />);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('auto-dismisses after the configured 3000ms timeout', async () => {
    // Trigger a toast
    toast.success('Test success message');
    
    // Verify the toast is initially present
    expect(screen.getByText('Test success message')).toBeInTheDocument();
    
    // Fast-forward time by 3000ms
    jest.advanceTimersByTime(3000);
    
    // Verify the toast is removed after the timeout
    await waitFor(() => {
      expect(screen.queryByText('Test success message')).not.toBeInTheDocument();
    });
  });

  it('allows manual dismiss via the close button', async () => {
    // Trigger a toast
    toast.error('Test error message');
    
    // Verify the toast is present
    const toastElement = screen.getByText('Test error message');
    expect(toastElement).toBeInTheDocument();
    
    // Find and click the close button
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    // Verify the toast is removed immediately
    await waitFor(() => {
      expect(screen.queryByText('Test error message')).not.toBeInTheDocument();
    });
  });

  it('stacks multiple simultaneous toasts correctly instead of replacing them', async () => {
    // Trigger multiple toasts in sequence
    toast.info('First toast message');
    toast.success('Second toast message');
    toast.warning('Third toast message');
    
    // Verify all three toasts are present in the document
    expect(screen.getByText('First toast message')).toBeInTheDocument();
    expect(screen.getByText('Second toast message')).toBeInTheDocument();
    expect(screen.getByText('Third toast message')).toBeInTheDocument();
    
    // Fast-forward time to clear all toasts
    jest.advanceTimersByTime(3000);
    
    // Verify all toasts are removed
    await waitFor(() => {
      expect(screen.queryByText('First toast message')).not.toBeInTheDocument();
      expect(screen.queryByText('Second toast message')).not.toBeInTheDocument();
      expect(screen.queryByText('Third toast message')).not.toBeInTheDocument();
    });
  });
});