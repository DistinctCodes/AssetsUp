import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './dropdown-menu';

describe('DropdownMenu', () => {
  it('renders the trigger and hides content initially', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item 1</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    expect(screen.getByText('Open Menu')).toBeInTheDocument();
    expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
  });

  it('opens content when trigger is clicked', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item 1</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    fireEvent.click(screen.getByText('Open Menu'));
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });

  it('closes content when trigger is clicked again', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item 1</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    fireEvent.click(screen.getByText('Open Menu'));
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Open Menu'));
    expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
  });

  it('calls item onClick and closes menu', () => {
    const handleClick = jest.fn();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={handleClick}>Click Me</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    fireEvent.click(screen.getByText('Open Menu'));
    fireEvent.click(screen.getByText('Click Me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Click Me')).not.toBeInTheDocument();
  });

  it('supports asChild mode on trigger', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <span>Custom Trigger</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item 1</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    fireEvent.click(screen.getByText('Custom Trigger'));
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });
});
