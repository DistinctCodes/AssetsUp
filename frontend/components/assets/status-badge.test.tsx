import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './status-badge';
import { AssetStatus } from '@/lib/query/types/asset';

describe('StatusBadge', () => {
  it('renders ACTIVE status with correct label and color', () => {
    render(<StatusBadge status={AssetStatus.ACTIVE} />);
    const badge = screen.getByText('Active');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-green-100');
    expect(badge.className).toContain('text-green-800');
  });

  it('renders ASSIGNED status with correct label and color', () => {
    render(<StatusBadge status={AssetStatus.ASSIGNED} />);
    const badge = screen.getByText('Assigned');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-blue-100');
    expect(badge.className).toContain('text-blue-800');
  });

  it('renders MAINTENANCE status with correct label and color', () => {
    render(<StatusBadge status={AssetStatus.MAINTENANCE} />);
    const badge = screen.getByText('Maintenance');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-yellow-100');
    expect(badge.className).toContain('text-yellow-900');
  });

  it('renders RETIRED status with correct label and color', () => {
    render(<StatusBadge status={AssetStatus.RETIRED} />);
    const badge = screen.getByText('Retired');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-gray-100');
    expect(badge.className).toContain('text-gray-700');
  });

  it('renders unknown status with fallback styling', () => {
    render(<StatusBadge status={'UNKNOWN' as AssetStatus} />);
    const badge = screen.getByText('UNKNOWN');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-gray-100');
    expect(badge.className).toContain('text-gray-700');
  });
});
