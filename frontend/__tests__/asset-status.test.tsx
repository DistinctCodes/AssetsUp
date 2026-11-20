import { render, screen } from '@testing-library/react';
import { StatusBadge, ASSET_STATUS_CONFIG, assetStatusLabel } from '@/components/assets/status-badge';
import {
  ASSET_STATUS_TRANSITIONS,
  AssetStatus,
  allowedAssetTransitions,
} from '@/lib/query/types/asset';

describe('AssetStatus mirrors the backend', () => {
  it('has exactly the seven backend statuses', () => {
    expect(Object.values(AssetStatus).sort()).toEqual(
      ['ASSIGNED', 'AVAILABLE', 'DISPOSED', 'IN_MAINTENANCE', 'IN_TRANSIT', 'LOST', 'RETIRED'],
    );
  });

  it('no longer defines the frontend-only ACTIVE and MAINTENANCE', () => {
    expect(Object.values(AssetStatus)).not.toContain('ACTIVE');
    expect(Object.values(AssetStatus)).not.toContain('MAINTENANCE');
  });
});

describe('StatusBadge covers every status', () => {
  it.each(Object.values(AssetStatus))('renders %s with a label and a colour', (status) => {
    render(<StatusBadge status={status} />);
    const badge = screen.getByText(ASSET_STATUS_CONFIG[status].label);
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-\w+-\d+/);
    expect(badge.className).toMatch(/text-\w+-\d+/);
  });

  it('uses distinct labels', () => {
    const labels = Object.values(AssetStatus).map((s) => ASSET_STATUS_CONFIG[s].label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('humanises labels for filters and falls back to the raw value', () => {
    expect(assetStatusLabel('IN_MAINTENANCE')).toBe('In maintenance');
    expect(assetStatusLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW');
  });
});

describe('allowed status transitions', () => {
  it('matches the backend table', () => {
    expect(allowedAssetTransitions(AssetStatus.AVAILABLE)).toEqual([
      'ASSIGNED', 'IN_MAINTENANCE', 'IN_TRANSIT', 'RETIRED', 'LOST',
    ]);
    expect(allowedAssetTransitions(AssetStatus.IN_MAINTENANCE)).toEqual(['AVAILABLE', 'ASSIGNED', 'RETIRED']);
    expect(allowedAssetTransitions(AssetStatus.RETIRED)).toEqual(['DISPOSED']);
    expect(allowedAssetTransitions(AssetStatus.DISPOSED)).toEqual([]);
  });

  it('only leads to known statuses and has an entry for every status', () => {
    for (const status of Object.values(AssetStatus)) {
      expect(ASSET_STATUS_TRANSITIONS[status]).toBeDefined();
      for (const next of ASSET_STATUS_TRANSITIONS[status]) {
        expect(Object.values(AssetStatus)).toContain(next);
      }
    }
  });
});
