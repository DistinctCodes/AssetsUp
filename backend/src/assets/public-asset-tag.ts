/**
 * Optional public asset tag (#1697).
 *
 * A short, human-readable label with a Bech32m checksum, for an employee to read out or type when
 * describing equipment to IT. The checksum detects a mistyped label before any search runs. It is a
 * convenience identifier only: it grants no access and does not replace the serial number, the
 * internal asset id, `assetTag` or department permissions.
 *
 * Canonical form (stored): `ast1` + 10 data characters + 6 checksum characters, lowercase.
 * Display form: uppercase in groups of four, e.g. `AST1-XXXX-XXXX-XXCC-CCCC`.
 */
import { randomBytes } from 'crypto';

const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const HRP = 'ast';
const BECH32M_CONST = 0x2bc830a3;
const DATA_LENGTH = 10;

function polymod(values: number[]): number {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((top >>> i) & 1) chk ^= GEN[i]!;
  }
  return chk >>> 0;
}

function hrpExpand(hrp: string): number[] {
  const out: number[] = [];
  for (const c of hrp) out.push(c.charCodeAt(0) >>> 5);
  out.push(0);
  for (const c of hrp) out.push(c.charCodeAt(0) & 31);
  return out;
}

function checksum(data: number[]): number[] {
  const mod = polymod([...hrpExpand(HRP), ...data, 0, 0, 0, 0, 0, 0]) ^ BECH32M_CONST;
  return Array.from({ length: 6 }, (_, i) => (mod >>> (5 * (5 - i))) & 31);
}

/** A fresh random tag in canonical form. */
export function generatePublicTag(): string {
  const bytes = randomBytes(DATA_LENGTH);
  const data = Array.from(bytes, (b) => b & 31);
  return `${HRP}1${[...data, ...checksum(data)].map((d) => CHARSET[d]).join('')}`;
}

export type ParsedPublicTag =
  | { ok: true; tag: string }
  | { ok: false; reason: 'format' | 'checksum' };

/**
 * Normalises user input (case, spaces, hyphens) and verifies it. `format` means the input is not
 * shaped like a public tag at all (so callers may treat it as another identifier); `checksum` means
 * it is shaped like one but mistyped.
 */
export function parsePublicTag(input: string): ParsedPublicTag {
  const compact = input.trim().replace(/[\s-]/g, '');
  if (compact !== compact.toLowerCase() && compact !== compact.toUpperCase()) {
    return { ok: false, reason: 'format' }; // Bech32 forbids mixed case
  }
  const tag = compact.toLowerCase();
  if (!tag.startsWith(`${HRP}1`) || tag.length !== HRP.length + 1 + DATA_LENGTH + 6) {
    return { ok: false, reason: 'format' };
  }
  const body = tag.slice(HRP.length + 1);
  const values: number[] = [];
  for (const c of body) {
    const v = CHARSET.indexOf(c);
    if (v === -1) return { ok: false, reason: 'format' };
    values.push(v);
  }
  return polymod([...hrpExpand(HRP), ...values]) === BECH32M_CONST
    ? { ok: true, tag }
    : { ok: false, reason: 'checksum' };
}

/** `AST1-XXXX-XXXX-XXCC-CCCC` for printing and reading aloud. */
export function formatPublicTag(tag: string): string {
  return (tag.toUpperCase().match(/.{1,4}/g) ?? []).join('-');
}
