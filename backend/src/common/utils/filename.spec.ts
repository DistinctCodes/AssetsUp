import { contentDisposition, sanitizeFilename } from './filename';

describe('sanitizeFilename', () => {
  it.each([
    ['../../evil.txt', 'evil.txt'],
    ['..\\..\\evil.txt', 'evil.txt'],
    ['/etc/passwd', 'passwd'],
    ['a/b/c.pdf', 'c.pdf'],
    ['.htaccess', 'htaccess'],
    ['..', 'file'],
    ['', 'file'],
    ['na\u0000me\n.txt', 'name.txt'],
    ['rep"ort;x.pdf', 'rep_ort_x.pdf'],
  ])('%j -> %j', (input, expected) => {
    expect(sanitizeFilename(input)).toBe(expected);
  });

  it('caps the length and keeps the extension', () => {
    const out = sanitizeFilename('a'.repeat(500) + '.pdf');
    expect(out.length).toBeLessThanOrEqual(100);
    expect(out.endsWith('.pdf')).toBe(true);
  });
});

describe('contentDisposition', () => {
  it('never emits raw quotes or newlines from the filename', () => {
    const value = contentDisposition('a"b\r\nSet-Cookie: x=1.csv');
    expect(value).not.toMatch(/[\r\n]/);
    const quoted = value.match(/filename="([^"]*)"/);
    expect(quoted).not.toBeNull();
    expect(quoted![1]).not.toContain('"');
  });

  it('percent-encodes the UTF-8 name', () => {
    expect(contentDisposition('résumé.pdf')).toContain(
      "filename*=UTF-8''r%C3%A9sum%C3%A9.pdf",
    );
  });

  it('encodes characters encodeURIComponent leaves alone', () => {
    expect(contentDisposition("a'b(c).txt")).toContain("a%27b%28c%29.txt");
  });
});
