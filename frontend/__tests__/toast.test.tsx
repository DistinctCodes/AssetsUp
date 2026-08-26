import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { ToastProvider, toast } from '@/components/ui/toast';

// Helper function to trigger animationEnd to complete react-toastify's exit animations
function triggerAnimationEnd(node: HTMLElement | HTMLElement[]) {
  if (Array.isArray(node)) {
    node.forEach(el => {
      if (el.parentNode) {
        fireEvent.animationEnd(el.parentNode as HTMLElement);
      }
    });
  } else if (node.parentNode) {
    fireEvent.animationEnd(node.parentNode as HTMLElement);
  }
  jest.runAllTimers();
}

describe('Toast Component', () => {
  beforeEach(() => {
    // Use fake timers for reliable timing tests
    jest.useFakeTimers();
    // Clear all toasts and mocks before each test
    jest.clearAllMocks();
    render(<ToastProvider />);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('auto-dismisses after the configured 3000ms timeout', async () => {
    // Trigger a toast within act to handle async updates
    act(() => {
      toast.success('Test success message');
    });
    
    // Verify the toast is initially present
    const toastElement = await screen.findByText('Test success message');
    expect(toastElement).toBeInTheDocument();
    
    // Fast-forward time by 3000ms (the configured autoClose time)
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    
    // Trigger animation end to complete the exit transition
    triggerAnimationEnd(toastElement);
    
    // Verify the toast is removed after the timeout
    await waitFor(() => {
      expect(screen.queryByText('Test success message')).not.toBeInTheDocument();
    });
  });

  it('allows manual dismiss via the close button', async () => {
    // Trigger a toast within act
    act(() => {
      toast.error('Test error message');
    });
    
    // Verify the toast is present
    const toastElement = await screen.findByText('Test error message');
    expect(toastElement).toBeInTheDocument();
    
    // Find and click the close button (react-toastify uses aria-label="close")
    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(closeButton).toBeInTheDocument();
    
    act(() => {
      fireEvent.click(closeButton);
    });
    
    // Trigger animation end to complete the exit transition
    triggerAnimationEnd(toastElement);
    
    // Verify the toast is removed immediately
    await waitFor(() => {
      expect(screen.queryByText('Test error message')).not.toBeInTheDocument();
    });
  });

  it('stacks multiple simultaneous toasts correctly instead of replacing them', async () => {
    // Trigger multiple toasts in sequence within act
    act(() => {
      toast.info('First toast message');
      toast.success('Second toast message');
      toast.warning('Third toast message');
    });
    
    // Verify all three toasts are present in the document (stacked)
    const firstToast = await screen.findByText('First toast message');
    const secondToast = screen.getByText('Second toast message');
    const thirdToast = screen.getByText('Third toast message');
    
    expect(firstToast).toBeInTheDocument();
    expect(secondToast).toBeInTheDocument();
    expect(thirdToast).toBeInTheDocument();
    
    // Verify we have exactly 3 toasts in the DOM (they stack, not replace)
    const toastElements = screen.getAllByRole('alert');
    expect(toastElements.length).toBe(3);
    
    // Fast-forward time to clear all toasts
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    
    // Trigger animation ends for all toasts
    triggerAnimationEnd(toastElements);
    
    // Verify all toasts are removed
    await waitFor(() => {
      expect(screen.queryByText('First toast message')).not.toBeInTheDocument();
      expect(screen.queryByText('Second toast message')).not.toBeInTheDocument();
      expect(screen.queryByText('Third toast message')).not.toBeInTheDocument();
    });
  });
});