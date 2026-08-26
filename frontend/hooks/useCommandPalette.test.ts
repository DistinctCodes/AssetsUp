import { renderHook, act } from '@testing-library/react';
import { useCommandPalette } from './useCommandPalette';

describe('useCommandPalette', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with isOpen as false', () => {
    const { result } = renderHook(() => useCommandPalette());
    expect(result.current.isOpen).toBe(false);
  });

  it('should set isOpen to true when open() is called', () => {
    const { result } = renderHook(() => useCommandPalette());
    
    act(() => {
      result.current.open();
    });
    
    expect(result.current.isOpen).toBe(true);
  });

  it('should set isOpen to false when close() is called', () => {
    const { result } = renderHook(() => useCommandPalette());
    
    // First open it
    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);
    
    // Then close it
    act(() => {
      result.current.close();
    });
    
    expect(result.current.isOpen).toBe(false);
  });

  it('should toggle isOpen state when toggle() is called', () => {
    const { result } = renderHook(() => useCommandPalette());
    
    // First toggle: false -> true
    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(true);
    
    // Second toggle: true -> false
    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it('should toggle the palette when Ctrl+K is pressed', () => {
    const { result } = renderHook(() => useCommandPalette());
    expect(result.current.isOpen).toBe(false);
    
    // Dispatch Ctrl+K keydown event
    const ctrlKEvent = new KeyboardEvent('keydown', {
      ctrlKey: true,
      key: 'k',
    });
    const preventDefaultSpy = jest.spyOn(ctrlKEvent, 'preventDefault');
    document.dispatchEvent(ctrlKEvent);
    
    // Check that preventDefault was called and state toggled
    expect(preventDefaultSpy).toHaveBeenCalled();
    // Need to act to process the state update from the event listener
    act(() => {
      jest.runAllTimers();
    });
    expect(result.current.isOpen).toBe(true);
  });

  it('should toggle the palette when Cmd+K (Mac) is pressed', () => {
    const { result } = renderHook(() => useCommandPalette());
    expect(result.current.isOpen).toBe(false);
    
    // Dispatch Cmd+K keydown event (metaKey is Cmd on Mac)
    const cmdKEvent = new KeyboardEvent('keydown', {
      metaKey: true,
      key: 'k',
    });
    const preventDefaultSpy = jest.spyOn(cmdKEvent, 'preventDefault');
    document.dispatchEvent(cmdKEvent);
    
    expect(preventDefaultSpy).toHaveBeenCalled();
    act(() => {
      jest.runAllTimers();
    });
    expect(result.current.isOpen).toBe(true);
  });

  it('should not toggle for other key combinations', () => {
    const { result } = renderHook(() => useCommandPalette());
    expect(result.current.isOpen).toBe(false);
    
    // Dispatch unrelated keys
    const randomEvent = new KeyboardEvent('keydown', {
      ctrlKey: true,
      key: 'l',
    });
    document.dispatchEvent(randomEvent);
    
    const anotherEvent = new KeyboardEvent('keydown', {
      key: 'k',
    });
    document.dispatchEvent(anotherEvent);
    
    // State should remain false
    expect(result.current.isOpen).toBe(false);
  });

  it('should remove the event listener when the component unmounts', () => {
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(() => useCommandPalette());
    
    // Unmount the hook
    unmount();
    
    // Verify that the event listener was removed
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function)
    );
  });
});