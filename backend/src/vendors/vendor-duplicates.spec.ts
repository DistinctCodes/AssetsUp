import {
  DEFAULT_DUPLICATE_THRESHOLD,
  detectDuplicates,
  duplicateMessage,
  nameSimilarity,
  normalizeEmail,
  normalizeName,
  normalizePhone,
  normalizeTaxId,
} from './vendor-duplicates';

const VENDORS = [
  { id: 'v1', name: 'Acme Supplies LLC', code: 'ACME', email: 'sales@acme.com', phone: '+1 (555) 010-1234', taxId: 'US-12345' },
  { id: 'v2', name: 'Globex Industrial', code: 'GLBX', email: 'contact@globex.io', phone: '5559876543' },
];

describe('normalizers', () => {
  it('normalises names, ignoring punctuation, case and legal suffixes', () => {
    expect(normalizeName('Acme Supplies, LLC.')).toBe('acme supplies');
    expect(normalizeName('ACME SUPPLIES')).toBe('acme supplies');
  });

  it('normalises emails, phones and tax ids', () => {
    expect(normalizeEmail(' Sales@ACME.com ')).toBe('sales@acme.com');
    expect(normalizeEmail(null)).toBe('');
    expect(normalizePhone('+1 (555) 010-1234')).toBe('15550101234');
    expect(normalizePhone('(555) 010-1234')).toBe('5550101234');
    expect(normalizeTaxId('us-12345')).toBe('US12345');
  });
});

describe('nameSimilarity', () => {
  it('scores identical names at one', () => {
    expect(nameSimilarity('Acme Supplies LLC', 'acme supplies')).toBe(1);
  });

  it('scores unrelated names at zero', () => {
    expect(nameSimilarity('Acme Supplies', 'Globex Industrial')).toBe(0);
  });

  it('scores partial overlap between zero and one', () => {
    const score = nameSimilarity('Acme Supplies', 'Acme Services');
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it('uses a documented default threshold', () => {
    expect(DEFAULT_DUPLICATE_THRESHOLD).toBe(0.8);
  });
});

describe('detectDuplicates', () => {
  it('finds nothing for a genuinely new vendor', () => {
    const result = detectDuplicates(VENDORS, {
      name: 'Initech Systems',
      code: 'INIT',
      email: 'hello@initech.net',
    });
    expect(result).toEqual({ duplicate: false, match: null, candidates: [] });
  });

  it('flags a repeated vendor code', () => {
    const result = detectDuplicates(VENDORS, { name: 'New Co', code: 'acme' });
    expect(result.duplicate).toBe(true);
    expect(result.match).toMatchObject({ field: 'code', vendorId: 'v1', confidence: 1 });
  });

  it('flags a repeated tax id', () => {
    const result = detectDuplicates(VENDORS, { name: 'New Co', taxId: 'us 12345' });
    expect(result.match).toMatchObject({ field: 'taxId', confidence: 1 });
  });

  it('flags a repeated email regardless of case', () => {
    const result = detectDuplicates(VENDORS, { name: 'New Co', email: 'SALES@acme.com' });
    expect(result.match).toMatchObject({ field: 'email', confidence: 1 });
  });

  it('flags a repeated phone with different formatting', () => {
    const result = detectDuplicates(VENDORS, { name: 'New Co', phone: '555-010-1234' });
    expect(result.match).toMatchObject({ field: 'phone', confidence: 0.95 });
  });

  it('flags a near identical name', () => {
    const result = detectDuplicates(VENDORS, { name: 'Acme Supplies Ltd' });
    expect(result.duplicate).toBe(true);
    expect(result.match?.field).toBe('name');
  });

  it('honours a custom similarity threshold', () => {
    const candidate = { name: 'Acme Services' };
    expect(detectDuplicates(VENDORS, candidate, 0.2).duplicate).toBe(true);
    expect(detectDuplicates(VENDORS, candidate, 0.95).duplicate).toBe(false);
  });

  it('ignores the vendor being edited', () => {
    const result = detectDuplicates(VENDORS, { id: 'v1', name: 'Acme Supplies LLC', code: 'ACME' });
    expect(result.duplicate).toBe(false);
  });

  it('does not match on empty optional fields', () => {
    const result = detectDuplicates(VENDORS, { name: 'New Co', code: '', email: '', phone: '' });
    expect(result.candidates).toEqual([]);
  });

  it('sorts candidates by confidence', () => {
    const result = detectDuplicates(VENDORS, {
      name: 'Globex Industrial',
      code: 'ACME',
    });
    expect(result.candidates.length).toBe(2);
    expect(result.candidates[0]).toMatchObject({ field: 'code', vendorId: 'v1' });
    for (let i = 1; i < result.candidates.length; i += 1) {
      expect(result.candidates[i - 1].confidence).toBeGreaterThanOrEqual(
        result.candidates[i].confidence,
      );
    }
  });

  it('handles an empty vendor list', () => {
    expect(detectDuplicates([], { name: 'Acme Supplies' }).duplicate).toBe(false);
  });
});

describe('duplicateMessage', () => {
  it('names the matched vendor', () => {
    const result = detectDuplicates(VENDORS, { name: 'New Co', code: 'ACME' });
    expect(duplicateMessage(result, VENDORS)).toBe(
      'Possible duplicate of Acme Supplies LLC: Vendor code already in use',
    );
  });

  it('falls back when the vendor is unknown', () => {
    const result = detectDuplicates(VENDORS, { name: 'New Co', code: 'ACME' });
    expect(duplicateMessage(result)).toContain('an existing vendor');
  });

  it('returns null when there is no duplicate', () => {
    expect(duplicateMessage(detectDuplicates(VENDORS, { name: 'Initech Systems' }), VENDORS)).toBeNull();
  });
});
