import React, { useEffect, useState } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './select';

describe('Select', () => {
  it('renders a native select element with children', () => {
    render(
      <Select>
        <option value="a">Apple</option>
        <option value="b">Banana</option>
      </Select>
    );
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Banana')).toBeInTheDocument();
  });

  it('reflects the selected value', () => {
    render(
      <Select defaultValue="b">
        <option value="a">Apple</option>
        <option value="b">Banana</option>
      </Select>
    );
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('b');
  });

  it('calls onChange when selection changes', () => {
    const handleChange = jest.fn();
    render(
      <Select onChange={handleChange}>
        <option value="a">Apple</option>
        <option value="b">Banana</option>
      </Select>
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'a' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    render(
      <Select className="custom-class">
        <option value="a">Apple</option>
      </Select>
    );
    const select = screen.getByRole('combobox');
    expect(select.className).toContain('custom-class');
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLSelectElement>();
    render(
      <Select ref={ref}>
        <option value="a">Apple</option>
      </Select>
    );
    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
  });
});

/**
 * Select itself is a thin, uncontrolled wrapper around a native
 * <select> — it has no async logic of its own. "Async-loaded options"
 * means a consumer (e.g. a vendor or branch picker) fetches its option
 * list after mount and passes the results in as children once loaded.
 * These tests exercise that pattern against the real Select component,
 * rather than a static option list, to catch any re-render/caching
 * issue that would keep a freshly-resolved option list from appearing.
 */
function AsyncSelect({
  fetchOptions,
  onChange,
  reloadKey = 0,
}: {
  fetchOptions: () => Promise<{ value: string; label: string }[]>;
  onChange?: (value: string) => void;
  reloadKey?: number;
}) {
  const [options, setOptions] = useState<{ value: string; label: string }[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchOptions().then((result) => {
      if (!cancelled) setOptions(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  return (
    <Select
      disabled={options === null}
      onChange={(e) => onChange?.(e.target.value)}
    >
      {options === null ? (
        <option value="">Loading...</option>
      ) : (
        options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))
      )}
    </Select>
  );
}

describe('Select with asynchronously-loaded options', () => {
  it('shows a loading placeholder and disables the select before options resolve', () => {
    const fetchOptions = jest.fn(() => new Promise<{ value: string; label: string }[]>(() => {}));
    render(<AsyncSelect fetchOptions={fetchOptions} />);

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select).toBeDisabled();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders the resolved options once the async fetch completes', async () => {
    const fetchOptions = jest.fn().mockResolvedValue([
      { value: 'v1', label: 'Warehouse A' },
      { value: 'v2', label: 'Warehouse B' },
    ]);
    render(<AsyncSelect fetchOptions={fetchOptions} />);

    await waitFor(() => {
      expect(screen.getByText('Warehouse A')).toBeInTheDocument();
      expect(screen.getByText('Warehouse B')).toBeInTheDocument();
    });
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox')).not.toBeDisabled();
  });

  it('allows selecting an asynchronously-loaded option once available', async () => {
    const fetchOptions = jest.fn().mockResolvedValue([
      { value: 'v1', label: 'Warehouse A' },
      { value: 'v2', label: 'Warehouse B' },
    ]);
    const handleChange = jest.fn();
    render(<AsyncSelect fetchOptions={fetchOptions} onChange={handleChange} />);

    await waitFor(() => {
      expect(screen.getByText('Warehouse B')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'v2' } });
    expect(handleChange).toHaveBeenCalledWith('v2');
  });

  it('discards a stale async response if the fetch dependency changes before it resolves', async () => {
    let resolveFirst: (value: { value: string; label: string }[]) => void;
    const firstFetch = new Promise<{ value: string; label: string }[]>((resolve) => {
      resolveFirst = resolve;
    });
    const secondFetch = Promise.resolve([{ value: 'v9', label: 'Second Result' }]);

    let callCount = 0;
    const fetchOptions = jest.fn(() => {
      callCount += 1;
      return callCount === 1 ? firstFetch : secondFetch;
    });

    const { rerender } = render(<AsyncSelect fetchOptions={fetchOptions} reloadKey={1} />);
    // Trigger a second effect run before the first request resolves —
    // the first effect's cleanup should mark that request as cancelled.
    rerender(<AsyncSelect fetchOptions={fetchOptions} reloadKey={2} />);

    await waitFor(() => {
      expect(screen.getByText('Second Result')).toBeInTheDocument();
    });

    // The first (stale) request resolving afterward must not clobber the
    // already-settled second result.
    await act(async () => {
      resolveFirst([{ value: 'v0', label: 'Stale Result' }]);
    });
    expect(screen.queryByText('Stale Result')).not.toBeInTheDocument();
    expect(screen.getByText('Second Result')).toBeInTheDocument();
  });
});

describe('Select compound components', () => {
  it('SelectTrigger renders children', () => {
    render(<SelectTrigger>Select a fruit</SelectTrigger>);
    expect(screen.getByText('Select a fruit')).toBeInTheDocument();
  });

  it('SelectValue renders placeholder', () => {
    render(<SelectValue placeholder="Choose..." />);
    expect(screen.getByText('Choose...')).toBeInTheDocument();
  });

  it('SelectContent renders children', () => {
    render(
      <SelectContent>
        <div>Content here</div>
      </SelectContent>
    );
    expect(screen.getByText('Content here')).toBeInTheDocument();
  });

  it('SelectItem renders as an option', () => {
    render(
      <select>
        <SelectItem value="a">Apple</SelectItem>
        <SelectItem value="b">Banana</SelectItem>
      </select>
    );
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Banana')).toBeInTheDocument();
  });
});
