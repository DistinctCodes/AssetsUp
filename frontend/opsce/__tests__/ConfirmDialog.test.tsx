import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

interface Props {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ title, message, onConfirm, onCancel }: Props) {
  return (
    <div>
      <h3>{title}</h3>
      <p>{message}</p>
      <button onClick={onConfirm}>Confirm</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  );
}

describe('ConfirmDialog', () => {
  it('renders message', () => {
    render(
      <ConfirmDialog
        title="Delete?"
        message="Are you sure?"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(screen.getByText('Are you sure?')).toBeTruthy();
  });

  it('calls onConfirm when Confirm is clicked', () => {
    const fn = jest.fn();
    render(<ConfirmDialog title="T" message="M" onConfirm={fn} onCancel={jest.fn()} />);
    fireEvent.click(screen.getByText('Confirm'));
    expect(fn).toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is clicked', () => {
    const fn = jest.fn();
    render(<ConfirmDialog title="T" message="M" onConfirm={jest.fn()} onCancel={fn} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(fn).toHaveBeenCalled();
  });
});
