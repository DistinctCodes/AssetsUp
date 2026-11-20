import { validateDocumentUrl } from './danielships-asset-document-url-validator.helper';

describe('danielships-asset-document-url-validator.helper', () => {
  it('rejects javascript, data and localhost URLs', () => {
    expect(validateDocumentUrl('javascript:alert(1)').ok).toBe(false);
    expect(validateDocumentUrl('data:text/html,hi').ok).toBe(false);
    expect(validateDocumentUrl('http://localhost/file.pdf').ok).toBe(false);
  });

  it('accepts https URLs and can enforce allow-list', () => {
    expect(validateDocumentUrl('https://files.example.com/doc.pdf').ok).toBe(true);
    expect(
      validateDocumentUrl('https://files.example.com/doc.pdf', { allowedHosts: ['cdn.example.com'] }).ok,
    ).toBe(false);
  });
});
