import { renderHook, act } from '@testing-library/react';
import { useLocalStorageState } from './useLocalStorageState';

describe('useLocalStorageState', () => {
  const testKey = 'test-key';
  const initialValue = 'initial-value';

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should initialize with initial value when no stored value exists', () => {
    const { result } = renderHook(() => useLocalStorageState(testKey, initialValue));
    
    // Before hydration, it should still have initial value
    expect(result.current.value).toBe(initialValue);
    expect(result.current.isHydrated).toBe(false);
  });

  it('should hydrate and read existing value from localStorage', async () => {
    const storedValue = 'stored-value';
    localStorage.setItem(testKey, JSON.stringify(storedValue));
    
    const { result } = renderHook(() => useLocalStorageState(testKey, initialValue));
    
    // Wait for hydration effect to run
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(result.current.isHydrated).toBe(true);
    expect(result.current.value).toBe(storedValue);
  });

  it('should persist updated values to localStorage (write-through)', async () => {
    const { result } = renderHook(() => useLocalStorageState(testKey, initialValue));
    
    // Wait for hydration
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(result.current.isHydrated).toBe(true);
    
    // Update the value
    const newValue = 'new-value';
    act(() => {
      result.current.setValue(newValue);
    });
    
    // Wait for the effect to persist to localStorage
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Check that localStorage was updated
    expect(localStorage.getItem(testKey)).toBe(JSON.stringify(newValue));
    expect(result.current.value).toBe(newValue);
  });

  it('should handle localStorage being unavailable (throws errors)', async () => {
    // Mock localStorage.getItem to throw (simulates private browsing/disabled storage)
    const originalGetItem = Storage.prototype.getItem;
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.getItem = jest.fn().mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    Storage.prototype.setItem = jest.fn().mockImplementation(() => {
      throw new Error('Storage unavailable');
    });

    const { result } = renderHook(() => useLocalStorageState(testKey, initialValue));
    
    // Wait for hydration
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Should still hydrate successfully, even if storage is unavailable
    expect(result.current.isHydrated).toBe(true);
    // Should keep the initial value since it couldn't read from storage
    expect(result.current.value).toBe(initialValue);
    
    // Try to update the value - should not throw, and should update local state
    const newValue = 'test-new-value';
    act(() => {
      result.current.setValue(newValue);
    });
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Local state should update even if storage fails
    expect(result.current.value).toBe(newValue);
    // The mocks were called (proves we tried to access storage)
    expect(Storage.prototype.getItem).toHaveBeenCalled();
    expect(Storage.prototype.setItem).toHaveBeenCalled();
    
    // Restore original methods
    Storage.prototype.getItem = originalGetItem;
    Storage.prototype.setItem = originalSetItem;
  });

  it('should maintain correct isHydrated state throughout lifecycle', async () => {
    const { result, rerender } = renderHook(() => useLocalStorageState(testKey, initialValue));
    
    // Initially, isHydrated is false
    expect(result.current.isHydrated).toBe(false);
    
    // After hydration, it becomes true
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(result.current.isHydrated).toBe(true);
    
    // Rerender with different key
    rerender();
    // Should stay hydrated
    expect(result.current.isHydrated).toBe(true);
  });
});