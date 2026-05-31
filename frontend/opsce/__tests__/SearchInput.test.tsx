import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

function SearchInput({
  onChange,
  debounceMs = 300,
}: {
  onChange: (v: string) => void;
  debounceMs?: number;
}) {
  const [val, setVal] = React.useState('');
  const timer = React.useRef<ReturnType<typeof setTimeout>>();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVal(e.target.value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(e.target.value), debounceMs);
  };

  return <input value={val} onChange={handleChange} placeholder="Search" />;
}

describe('SearchInput', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('debounces onChange and calls callback with correct value after delay', () => {
    const fn = jest.fn();
    render(<SearchInput onChange={fn} debounceMs={300} />);
    fireEvent.change(screen.getByPlaceholderText('Search'), {
      target: { value: 'test' },
    });
    expect(fn).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(300));
    expect(fn).toHaveBeenCalledWith('test');
  });
});
