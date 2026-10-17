import { escapeHtml, renderTemplate, singleLine } from './mail-templates';

const XSS = '<script>alert(1)</script>';
const LINK = '<a href="https://evil">Reset here</a>';

describe('mail templates', () => {
  it('escapes HTML metacharacters', () => {
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;');
  });

  it('escapes the welcome name', () => {
    const { html } = renderTemplate('welcome', { name: XSS });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes asset name and decision in transfer-decision', () => {
    const { html, subject } = renderTemplate('transfer-decision', {
      assetName: LINK,
      decision: XSS,
    });
    expect(html).not.toContain('<a href');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;a href=&quot;https://evil&quot;&gt;');
    // Subject is plain text, but must stay on one line.
    expect(subject).not.toMatch(/[\r\n]/);
  });

  it('escapes asset name and expiry in warranty-expiring', () => {
    const { html } = renderTemplate('warranty-expiring', {
      assetName: LINK,
      expiresOn: XSS,
    });
    expect(html).not.toContain('<a href');
    expect(html).not.toContain('<script>');
  });

  it('keeps legitimate markup of the template itself', () => {
    const { html } = renderTemplate('transfer-decision', {
      assetName: 'Laptop',
      decision: 'approved',
    });
    expect(html).toContain('<b>Laptop</b>');
    expect(html).toContain('<b>approved</b>');
  });

  it('provides a plain-text alternative', () => {
    const { text } = renderTemplate('welcome', { name: 'Jane' });
    expect(text).toContain('Hi Jane');
    expect(text).not.toContain('<');
  });

  it('strips newlines from subjects', () => {
    expect(
      renderTemplate('transfer-decision', { decision: 'ok\r\nBcc: x@evil' })
        .subject,
    ).not.toMatch(/[\r\n]/);
    expect(singleLine('a\nb')).toBe('a b');
  });

  it('falls back to defaults for missing context', () => {
    expect(renderTemplate('welcome', {}).html).toContain('Hi there');
  });
});
