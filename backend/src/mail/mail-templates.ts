export type MailTemplate =
  | 'welcome'
  | 'transfer-decision'
  | 'warranty-expiring';

export interface RenderedMail {
  subject: string;
  html: string;
  text: string;
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escapes text for safe use in HTML element content and attributes. */
export function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

/** Collapses newlines so a value can't inject extra headers via the subject. */
export function singleLine(value: unknown): string {
  return String(value).replace(/[\r\n  ]+/g, ' ').trim();
}

const field = (value: unknown, fallback: string): string =>
  value === undefined || value === null || value === '' ? fallback : String(value);

/**
 * Renders a template + context into subject, HTML and plain-text bodies.
 * Every interpolated value is HTML-escaped; user-controlled context (asset
 * names, display names) can never become live markup.
 */
export function renderTemplate(
  template: MailTemplate,
  context: Record<string, unknown>,
): RenderedMail {
  const layout = (title: string, body: string) =>
    `<div style="font-family:sans-serif"><h2>${escapeHtml(title)}</h2>${body}<hr/><small>AssetsUp</small></div>`;

  switch (template) {
    case 'welcome': {
      const name = field(context.name, 'there');
      return {
        subject: 'Welcome to AssetsUp',
        html: layout('Welcome', `<p>Hi ${escapeHtml(name)}, your account is ready.</p>`),
        text: `Hi ${name}, your account is ready.\n\nAssetsUp`,
      };
    }
    case 'transfer-decision': {
      const assetName = field(context.assetName, 'an asset');
      const decision = field(context.decision, 'updated');
      return {
        subject: singleLine(`Asset transfer ${field(context.decision, 'update')}`),
        html: layout(
          'Transfer decision',
          `<p>Your transfer request for <b>${escapeHtml(assetName)}</b> was <b>${escapeHtml(decision)}</b>.</p>`,
        ),
        text: `Your transfer request for ${assetName} was ${decision}.\n\nAssetsUp`,
      };
    }
    case 'warranty-expiring': {
      const assetName = field(context.assetName, 'an asset');
      const expiresOn = field(context.expiresOn, 'soon');
      return {
        subject: 'Warranty expiring soon',
        html: layout(
          'Warranty expiring',
          `<p>The warranty for <b>${escapeHtml(assetName)}</b> expires on ${escapeHtml(expiresOn)}.</p>`,
        ),
        text: `The warranty for ${assetName} expires on ${expiresOn}.\n\nAssetsUp`,
      };
    }
  }
}
