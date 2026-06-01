/**
 * HTML email templates stored as string constants.
 * Keep templates self-contained (inline styles) for maximum email-client compatibility.
 */

export const PASSWORD_RESET_TEMPLATE = (resetLink: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Reset</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color:#1a56db;padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">AssetsUp</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">Reset Your Password</h2>
              <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
                We received a request to reset the password for your AssetsUp account.
                Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background-color:#1a56db;border-radius:6px;padding:14px 28px;">
                    <a href="${resetLink}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0;">
                If you did not request a password reset, you can safely ignore this email.
                Your password will not change until you click the link above.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">
                &copy; ${new Date().getFullYear()} AssetsUp. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export const MAINTENANCE_DUE_TEMPLATE = (
  assetName: string,
  dueDate: string,
): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Maintenance Due Reminder</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color:#d97706;padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">AssetsUp</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">&#9888; Maintenance Due Reminder</h2>
              <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
                This is a reminder that the following asset is due for maintenance:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef3c7;border-radius:6px;margin:0 0 24px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 8px;color:#92400e;font-size:14px;font-weight:600;">ASSET NAME</p>
                    <p style="margin:0 0 16px;color:#111827;font-size:16px;font-weight:700;">${assetName}</p>
                    <p style="margin:0 0 8px;color:#92400e;font-size:14px;font-weight:600;">MAINTENANCE DUE DATE</p>
                    <p style="margin:0;color:#111827;font-size:16px;font-weight:700;">${dueDate}</p>
                  </td>
                </tr>
              </table>
              <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0;">
                Please schedule maintenance as soon as possible to avoid asset downtime or compliance issues.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">
                &copy; ${new Date().getFullYear()} AssetsUp. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
