import { detectDuplicates, VendorCandidate, DuplicateResult } from './vendor-duplicates';

export interface VendorDuplicateDecision {
  status: 'ok' | 'conflict';
  result: DuplicateResult;
  conflictingVendorId?: string | null;
}

export function evaluateVendorDuplicate(
  existing: ReadonlyArray<VendorCandidate>,
  candidate: VendorCandidate,
  options: { threshold?: number; force?: boolean } = {},
): VendorDuplicateDecision {
  if (options.force === true) {
    return { status: 'ok', result: { duplicate: false, match: null, candidates: [] } };
  }
  const result = detectDuplicates(existing, candidate, options.threshold);
  if (result.duplicate) {
    return { status: 'conflict', result, conflictingVendorId: result.match?.vendorId ?? null };
  }
  return { status: 'ok', result };
}
