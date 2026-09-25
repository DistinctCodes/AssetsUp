export const DEFAULT_DUPLICATE_THRESHOLD = 0.8;

export type DuplicateField = 'code' | 'taxId' | 'email' | 'phone' | 'name';

export interface VendorCandidate {
  id?: string;
  name: string;
  code?: string | null;
  email?: string | null;
  phone?: string | null;
  taxId?: string | null;
}

export interface DuplicateMatch {
  vendorId: string | null;
  field: DuplicateField;
  confidence: number;
  reason: string;
}

export interface DuplicateResult {
  duplicate: boolean;
  match: DuplicateMatch | null;
  candidates: DuplicateMatch[];
}

export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((part) => part.length > 0 && part !== 'llc' && part !== 'inc' && part !== 'ltd')
    .sort()
    .join(' ');
}

export function normalizeEmail(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function normalizePhone(value: string | null | undefined): string {
  return typeof value === 'string' ? value.replace(/[^0-9]/g, '').replace(/^0+/, '') : '';
}

export function normalizeTaxId(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
}

function jaccard(left: string, right: string): number {
  const a = new Set(left.split(' ').filter(Boolean));
  const b = new Set(right.split(' ').filter(Boolean));
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared / (a.size + b.size - shared);
}

export function nameSimilarity(left: string, right: string): number {
  const a = normalizeName(left);
  const b = normalizeName(right);
  if (a.length === 0 || b.length === 0) return 0;
  if (a === b) return 1;
  return jaccard(a, b);
}

export function detectDuplicates(
  vendors: ReadonlyArray<VendorCandidate>,
  candidate: VendorCandidate,
  threshold: number = DEFAULT_DUPLICATE_THRESHOLD,
): DuplicateResult {
  const matches: DuplicateMatch[] = [];

  for (const vendor of vendors ?? []) {
    if (candidate.id !== undefined && vendor.id === candidate.id) continue;

    const code = candidate.code?.trim().toUpperCase() ?? '';
    const vendorCode = vendor.code?.trim().toUpperCase() ?? '';
    if (code.length > 0 && code === vendorCode) {
      matches.push({ vendorId: vendor.id ?? null, field: 'code', confidence: 1, reason: 'Vendor code already in use' });
      continue;
    }

    const taxId = normalizeTaxId(candidate.taxId);
    const vendorTaxId = normalizeTaxId(vendor.taxId);
    if (taxId.length > 0 && taxId === vendorTaxId) {
      matches.push({ vendorId: vendor.id ?? null, field: 'taxId', confidence: 1, reason: 'Tax id already registered' });
      continue;
    }

    const email = normalizeEmail(candidate.email);
    const vendorEmail = normalizeEmail(vendor.email);
    if (email.length > 0 && email === vendorEmail) {
      matches.push({ vendorId: vendor.id ?? null, field: 'email', confidence: 1, reason: 'Email already registered' });
      continue;
    }

    const phone = normalizePhone(candidate.phone);
    const vendorPhone = normalizePhone(vendor.phone);
    if (phone.length > 0 && phone.length >= 7 && phone === vendorPhone) {
      matches.push({ vendorId: vendor.id ?? null, field: 'phone', confidence: 0.95, reason: 'Phone number already registered' });
      continue;
    }

    const similarity = nameSimilarity(candidate.name ?? '', vendor.name ?? '');
    if (similarity >= threshold) {
      matches.push({
        vendorId: vendor.id ?? null,
        field: 'name',
        confidence: Math.round(similarity * 100) / 100,
        reason: 'Vendor name is very similar',
      });
    }
  }

  matches.sort((a, b) => b.confidence - a.confidence);
  return {
    duplicate: matches.length > 0,
    match: matches[0] ?? null,
    candidates: matches,
  };
}

export function duplicateMessage(
  result: DuplicateResult,
  vendors: ReadonlyArray<VendorCandidate> = [],
): string | null {
  if (!result.duplicate || result.match === null) return null;
  const label = vendors.find((vendor) => vendor.id === result.match?.vendorId)?.name;
  return `Possible duplicate of ${label ?? 'an existing vendor'}: ${result.match.reason}`;
}
