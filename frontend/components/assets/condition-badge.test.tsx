import React from 'react';
import { render, screen } from '@testing-library/react';
import { ConditionBadge } from './condition-badge';
import { AssetCondition } from '@/lib/query/types/asset';

describe('ConditionBadge', () => {
  it('renders NEW condition with correct label and color', () => {
    render(<ConditionBadge condition={AssetCondition.NEW} />);
    const badge = screen.getByText('New');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-emerald-100');
    expect(badge.className).toContain('text-emerald-800');
  });

  it('renders GOOD condition with correct label and color', () => {
    render(<ConditionBadge condition={AssetCondition.GOOD} />);
    const badge = screen.getByText('Good');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-green-100');
    expect(badge.className).toContain('text-green-800');
  });

  it('renders FAIR condition with correct label and color', () => {
    render(<ConditionBadge condition={AssetCondition.FAIR} />);
    const badge = screen.getByText('Fair');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-yellow-100');
    expect(badge.className).toContain('text-yellow-900');
  });

  it('renders POOR condition with correct label and color', () => {
    render(<ConditionBadge condition={AssetCondition.POOR} />);
    const badge = screen.getByText('Poor');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-orange-100');
    expect(badge.className).toContain('text-orange-900');
  });

  it('renders DAMAGED condition with correct label and color', () => {
    render(<ConditionBadge condition={AssetCondition.DAMAGED} />);
    const badge = screen.getByText('Damaged');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-red-100');
    expect(badge.className).toContain('text-red-800');
  });

  it('renders unknown condition with fallback styling', () => {
    render(<ConditionBadge condition={'UNKNOWN' as AssetCondition} />);
    const badge = screen.getByText('UNKNOWN');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-gray-100');
    expect(badge.className).toContain('text-gray-700');
  });
});
