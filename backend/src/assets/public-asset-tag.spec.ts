import { formatPublicTag, generatePublicTag, parsePublicTag } from './public-asset-tag';

describe('public asset tag (#1697)', () => {
  it('generates canonical tags that verify', () => {
    for (let i = 0; i < 50; i++) {
      const tag = generatePublicTag();
      expect(tag).toMatch(/^ast1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{16}$/);
      expect(parsePublicTag(tag)).toEqual({ ok: true, tag });
    }
  });

  it('accepts case, spaces and hyphens when reading the display form', () => {
    const tag = generatePublicTag();
    const shown = formatPublicTag(tag);
    expect(shown).toMatch(/^AST1(-[A-Z0-9]{4}){4}$/);
    expect(parsePublicTag(shown)).toEqual({ ok: true, tag });
    expect(parsePublicTag(shown.toLowerCase().replace(/-/g, ' '))).toEqual({ ok: true, tag });
  });

  it('detects every single-character typo', () => {
    const tag = generatePublicTag();
    const alphabet = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
    for (let i = 4; i < tag.length; i++) {
      for (const c of alphabet) {
        if (c === tag[i]) continue;
        const typo = tag.slice(0, i) + c + tag.slice(i + 1);
        expect(parsePublicTag(typo)).toEqual({ ok: false, reason: 'checksum' });
      }
    }
  });

  it('detects a swapped pair of adjacent characters', () => {
    const tag = 'ast1' + generatePublicTag().slice(4);
    const chars = tag.split('');
    for (let i = 4; i < chars.length - 1; i++) {
      if (chars[i] === chars[i + 1]) continue;
      const swapped = [...chars];
      [swapped[i], swapped[i + 1]] = [swapped[i + 1]!, swapped[i]!];
      expect(parsePublicTag(swapped.join('')).ok).toBe(false);
    }
  });

  it('treats other identifiers as a format mismatch, not a checksum error', () => {
    for (const input of ['SN-12345', 'LAP-001', '3f2504e0-4f89-41d3-9a0c-0305e82c3301', 'ast1short', '', 'Ast1QpzrY9x8gf2tvdw0s3jn54khce6mua7l']) {
      expect(parsePublicTag(input)).toEqual({ ok: false, reason: 'format' });
    }
  });
});
