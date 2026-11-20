import { fireEvent, render, screen } from '@testing-library/react';
import { Pagination } from '@/components/ui/pagination';

describe('Pagination', () => {
  it('renders nothing for a single page', () => {
    const { container } = render(<Pagination page={1} totalPages={1} total={3} onPageChange={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the position and total', () => {
    render(<Pagination page={2} totalPages={5} total={93} onPageChange={jest.fn()} />);
    expect(screen.getByText('Page 2 of 5 · 93 total')).toBeInTheDocument();
  });

  it('moves between pages', () => {
    const onPageChange = jest.fn();
    render(<Pagination page={2} totalPages={5} total={93} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onPageChange).toHaveBeenNthCalledWith(1, 3);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 1);
  });

  it('disables Previous on the first page and Next on the last', () => {
    const { rerender } = render(<Pagination page={1} totalPages={3} total={50} onPageChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    rerender(<Pagination page={3} totalPages={3} total={50} onPageChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
});
