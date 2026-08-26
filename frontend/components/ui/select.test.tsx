import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
