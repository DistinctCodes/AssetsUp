import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}

function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  return (
    <div>
      <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Prev
      </button>
      {Array.from({ length: totalPages }, (_, i) => (
        <button key={i + 1} onClick={() => onPageChange(i + 1)}>
          {i + 1}
        </button>
      ))}
      <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Next
      </button>
    </div>
  );
}

describe('Pagination', () => {
  it('renders correct page numbers', () => {
    render(<Pagination page={1} totalPages={3} onPageChange={jest.fn()} />);
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('disables prev button at page 1', () => {
    render(<Pagination page={1} totalPages={3} onPageChange={jest.fn()} />);
    expect((screen.getByText('Prev') as HTMLButtonElement).disabled).toBe(true);
  });

  it('disables next button at last page', () => {
    render(<Pagination page={3} totalPages={3} onPageChange={jest.fn()} />);
    expect((screen.getByText('Next') as HTMLButtonElement).disabled).toBe(true);
  });

  it('calls onPageChange with correct page number', () => {
    const fn = jest.fn();
    render(<Pagination page={2} totalPages={3} onPageChange={fn} />);
    fireEvent.click(screen.getByText('3'));
    expect(fn).toHaveBeenCalledWith(3);
  });
});
