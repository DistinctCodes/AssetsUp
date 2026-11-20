import { AssetStatus } from './asset-lifecycle.service';
import { normalizeBulkStatus, validateBulkStatusUpdate } from './eniola-bulk-status-transition.helper';

describe('eniola-bulk-status-transition.helper', () => {
  it('accepts aliases like single endpoint', () => {
    expect(normalizeBulkStatus('ACTIVE')).toBe(AssetStatus.AVAILABLE);
    expect(normalizeBulkStatus('MAINTENANCE')).toBe(AssetStatus.IN_MAINTENANCE);
  });

  it('allows RETIRED -> DISPOSED in bulk', () => {
    const res = validateBulkStatusUpdate(AssetStatus.RETIRED, AssetStatus.DISPOSED);
    expect(res.ok).toBe(true);
    expect(res.normalized).toBe(AssetStatus.DISPOSED);
  });
});
