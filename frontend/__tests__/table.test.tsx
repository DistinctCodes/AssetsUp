import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmptyState,
  useRowSelection,
  TableSelectionHeader,
  TableSelectionCell,
} from '@/components/ui/table';

// Test data
interface TestRow {
  id: string;
  name: string;
  age: number;
}

const testRows: TestRow[] = [
  { id: '1', name: 'Alice', age: 30 },
  { id: '2', name: 'Bob', age: 25 },
  { id: '3', name: 'Charlie', age: 35 },
];

// Wrapper component to test sorting
function SortableTableTest() {
  const [sort, setSort] = React.useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    setSort(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const sortedRows = React.useMemo(() => {
    if (!sort) return testRows;
    return [...testRows].sort((a, b) => {
      const aVal = a[sort.key as keyof TestRow];
      const bVal = b[sort.key as keyof TestRow];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sort.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sort.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [sort]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead sortKey="name" currentSort={sort} onSort={handleSort}>Name</TableHead>
          <TableHead sortKey="age" currentSort={sort} onSort={handleSort}>Age</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedRows.map(row => (
          <TableRow key={row.id}>
            <TableCell>{row.name}</TableCell>
            <TableCell>{row.age}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// Wrapper component to test row selection
function SelectableTableTest({ onSelectionChange }: { onSelectionChange?: (ids: string[]) => void }) {
  const { selectedIds, toggleRow, toggleAll, isSelected, allSelected, someSelected } = useRowSelection({
    rows: testRows,
    onSelectionChange,
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableSelectionHeader allSelected={allSelected} someSelected={someSelected} onToggleAll={toggleAll} />
          <TableHead>Name</TableHead>
          <TableHead>Age</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {testRows.map(row => (
          <TableRow key={row.id} selected={isSelected(row.id)}>
            <TableSelectionCell isSelected={isSelected(row.id)} onToggle={() => toggleRow(row.id)} />
            <TableCell>{row.name}</TableCell>
            <TableCell>{row.age}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

describe('Table Component', () => {
  describe('Empty State', () => {
    it('renders empty state message when there are no rows', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Age</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState colSpan={2} message="No users found." />
          </TableBody>
        </Table>
      );

      expect(screen.getByText('No users found.')).toBeInTheDocument();
    });

    it('renders default empty state message when no message is provided', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState colSpan={1} />
          </TableBody>
        </Table>
      );

      expect(screen.getByText('No data available.')).toBeInTheDocument();
    });
  });

  describe('Column Sorting', () => {
    it('renders sort icons on column headers', () => {
      render(<SortableTableTest />);
      
      // Initial state: both columns have ArrowUpDown icon
      const sortIcons = screen.getAllByRole('img', { name: /arrow up down/i });
      expect(sortIcons.length).toBe(2);
    });

    it('toggles sort direction when column header is clicked', () => {
      render(<SortableTableTest />);
      
      const nameHeader = screen.getByText('Name');
      fireEvent.click(nameHeader);
      
      // After first click: Name column should have ascending sort icon
      expect(screen.getByRole('img', { name: /arrow up/i })).toBeInTheDocument();
      
      fireEvent.click(nameHeader);
      // After second click: Name column should have descending sort icon
      expect(screen.getByRole('img', { name: /arrow down/i })).toBeInTheDocument();
    });

    it('switches active sort column when different header is clicked', () => {
      render(<SortableTableTest />);
      
      // Click Name first
      fireEvent.click(screen.getByText('Name'));
      expect(screen.getByRole('img', { name: /arrow up/i })).toBeInTheDocument();
      
      // Click Age
      fireEvent.click(screen.getByText('Age'));
      // Now Age column has ascending sort, Name goes back to ArrowUpDown
      const arrowUpIcons = screen.getAllByRole('img', { name: /arrow up/i });
      expect(arrowUpIcons.length).toBe(1);
      const arrowUpDownIcons = screen.getAllByRole('img', { name: /arrow up down/i });
      expect(arrowUpDownIcons.length).toBe(1);
    });
  });

  describe('Row Selection', () => {
    it('calls onSelectionChange when rows are selected/deselected', () => {
      const mockOnChange = jest.fn();
      render(<SelectableTableTest onSelectionChange={mockOnChange} />);
      
      // Select first row
      const firstRowCheckbox = screen.getAllByRole('img', { name: /square/i })[0];
      fireEvent.click(firstRowCheckbox);
      
      expect(mockOnChange).toHaveBeenCalledWith(['1']);
      
      // Select second row
      const secondRowCheckbox = screen.getAllByRole('img', { name: /square/i })[0];
      fireEvent.click(secondRowCheckbox);
      expect(mockOnChange).toHaveBeenCalledWith(['1', '2']);
      
      // Deselect first row
      const firstRowCheckedCheckbox = screen.getAllByRole('img', { name: /check square/i })[0];
      fireEvent.click(firstRowCheckedCheckbox);
      expect(mockOnChange).toHaveBeenCalledWith(['2']);
    });

    it('toggles all rows when select all header is clicked', () => {
      const mockOnChange = jest.fn();
      render(<SelectableTableTest onSelectionChange={mockOnChange} />);
      
      // Click select all
      const selectAllButton = screen.getByRole('button', { name: '' }); // The header checkbox
      fireEvent.click(selectAllButton);
      
      expect(mockOnChange).toHaveBeenCalledWith(['1', '2', '3']);
      
      // Click again to deselect all
      fireEvent.click(selectAllButton);
      expect(mockOnChange).toHaveBeenCalledWith([]);
    });

    it('applies selected class to selected rows', () => {
      render(<SelectableTableTest />);
      
      // Select first row
      const firstRowCheckbox = screen.getAllByRole('img', { name: /square/i })[0];
      fireEvent.click(firstRowCheckbox);
      
      // Check if first row has the selected background class (we can check if the checkbox is now CheckSquare)
      const checkedCheckboxes = screen.getAllByRole('img', { name: /check square/i });
      expect(checkedCheckboxes.length).toBe(2); // Header checkbox and first row checkbox
    });
  });
});