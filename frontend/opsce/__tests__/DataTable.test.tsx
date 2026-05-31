import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

interface Column<T> {
  key: keyof T;
  label: string;
}

interface DataTableProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  onSelectionChange?: (ids: string[]) => void;
}

function DataTable<T extends { id: string }>({
  data,
  columns,
  onSelectionChange,
}: DataTableProps<T>) {
  const [selected, setSelected] = React.useState<string[]>([]);

  const toggle = (id: string) => {
    const next = selected.includes(id)
      ? selected.filter((s) => s !== id)
      : [...selected, id];
    setSelected(next);
    onSelectionChange?.(next);
  };

  if (!data.length) return <div>No data</div>;

  return (
    <table>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={String(c.key)}>{c.label}</th>
          ))}
          <th>Select</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.id}>
            <td>
              <input
                type="checkbox"
                onChange={() => toggle(row.id)}
                checked={selected.includes(row.id)}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

describe('DataTable', () => {
  const data = [
    { id: '1', name: 'Asset A' },
    { id: '2', name: 'Asset B' },
  ];
  const columns = [{ key: 'name' as const, label: 'Name' }];

  it('renders rows correctly', () => {
    render(<DataTable data={data} columns={columns} />);
    expect(screen.getByText('Name')).toBeTruthy();
  });

  it('handles empty state', () => {
    render(<DataTable data={[]} columns={columns} />);
    expect(screen.getByText('No data')).toBeTruthy();
  });

  it('fires onSelectionChange when a checkbox is clicked', () => {
    const fn = jest.fn();
    render(<DataTable data={data} columns={columns} onSelectionChange={fn} />);
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    expect(fn).toHaveBeenCalledWith(['1']);
  });
});
