import {
  escapeHtml,
  renderEmailFooter,
  renderEmailLogoHeader,
} from './email-layout.helpers';

const FOOTER_TAGLINE = 'Run your classes. We’ll run your system.';
const SIGNATURE_CLOSING = 'Best regards,';
const SIGNATURE_TEAM = 'The Henzo Team';

/**
 * Admin-panel broadcast email.
 *
 * The message title is used ONLY as the email subject — it is intentionally not
 * repeated as a heading inside the body (that duplication is what we removed).
 * The email closes with a signature, the Henzo logo beneath it, and the shared
 * social/copyright footer for a consistent, branded look.
 */
export function renderBroadcastEmail(params: { body: string }): string {
  const bodyHtml = escapeHtml(params.body).replace(/\n/g, '<br/>');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <!--[if mso]>
  <style>body, table, td { font-family: Arial, sans-serif !important; }</style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#F9F4F0;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#F9F4F0;">
    <tr>
      <td style="padding:32px 16px 40px;">

        <!-- Main card -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;width:100%;margin:0 auto;background-color:#ffffff;border-radius:28px;overflow:hidden;box-shadow:0 4px 24px rgba(63,63,63,0.06);">
          <tr>
            <td style="padding:40px 36px 36px;">
              <div style="font-size:15px;color:#3F3F3F;line-height:1.7;">${bodyHtml}</div>

              <!-- Signature -->
              <p style="margin:28px 0 0;font-size:15px;color:#3F3F3F;line-height:1.7;">
                ${SIGNATURE_CLOSING}<br/>
                <strong>${SIGNATURE_TEAM}</strong>
              </p>
            </td>
          </tr>
        </table>

        <!-- Logo beneath the signature -->
        <div style="margin-top:28px;">
          ${renderEmailLogoHeader()}
        </div>

        ${renderEmailFooter(FOOTER_TAGLINE)}

      </td>
    </tr>
  </table>
</body>
</html>`;
}
