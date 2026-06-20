import { OTP_EMAIL_STRINGS } from '../copy/otp-email.strings';
import { TRAINER_INVITE_EMAIL_STRINGS } from '../copy/trainer-invite-email.strings';
import { resolveClientEmailLocale } from '../copy/client-email-locale';
import {
  escapeHtml,
  renderEmailFooter,
  renderEmailInfoRow,
  renderEmailLogoHeader,
  renderEmailIcon,
  renderEmailIconCircle,
} from './email-layout.helpers';

export function renderContactMessageHtml(context: {
  name: string;
  email: string;
  message: string;
  timestamp: string;
}): string {
  const safeName = escapeHtml(context.name);
  const safeEmail = escapeHtml(context.email);
  const safeTimestamp = escapeHtml(context.timestamp);
  const safeMessage = escapeHtml(context.message).replace(/\n/g, '<br>');

  return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>New Contact Form Message - Henzo</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #ff5b5b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .message-details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
            .detail-label { font-weight: bold; color: #555; }
            .detail-value { color: #333; }
            .message-content { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ff5b5b; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }

            @media only screen and (max-width: 480px) {
              .container { padding: 10px !important; }
              .content { padding: 15px !important; }
              .message-details { padding: 10px !important; margin: 10px 0 !important; }
              .header { padding: 15px !important; }
              .message-content { padding: 10px !important; margin: 10px 0 !important; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            ${renderEmailLogoHeader(600)}
            <div class="header">
              <h1>📧 New Contact Form Message</h1>
              <p>Someone has sent a message through the Henzo contact form</p>
            </div>

            <div class="content">
              <div class="message-details">
                <h3>👤 Contact Information</h3>
                <div class="detail-row">
                  <span class="detail-label">Name:</span>
                  <span class="detail-value">${safeName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Email:</span>
                  <span class="detail-value">${safeEmail}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Timestamp:</span>
                  <span class="detail-value">${safeTimestamp}</span>
                </div>
              </div>

              <div class="message-details">
                <h3>💬 Message</h3>
                <div class="message-content">
                  ${safeMessage}
                </div>
              </div>
            </div>

            <div class="footer">
              <p>This message was sent through the Henzo contact form.</p>
              <p>Reply directly to the sender's email address to respond.</p>
            </div>
          </div>
        </body>
        </html>
      `;
}

export function renderOtpEmailHtml(
  code: string,
  kind: 'client' | 'owner',
  locale?: string,
): string {
  const loc = resolveClientEmailLocale(locale);
  const L = OTP_EMAIL_STRINGS[loc];
  const isOwner = kind === 'owner';
  const heading = isOwner ? L.ownerHeading : L.heading;
  const subheading = isOwner ? L.ownerSubheading : L.subheading;
  const digits = escapeHtml(code);

  return `<!DOCTYPE html>
<html lang="${loc}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${L.pageTitle}</title>
  <!--[if mso]>
  <style>body, table, td { font-family: Arial, sans-serif !important; }</style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#F9F4F0;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#F9F4F0;">
    <tr>
      <td style="padding:32px 16px 40px;">

        ${renderEmailLogoHeader()}

        <!-- Main card -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;width:100%;margin:0 auto;background-color:#ffffff;border-radius:28px;overflow:hidden;box-shadow:0 4px 24px rgba(63,63,63,0.06);">
          <tr>
            <td style="padding:40px 36px 36px;">

              <!-- Secure badge -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <span style="display:inline-block;background-color:#FFF0EB;border-radius:999px;padding:8px 16px;font-size:13px;font-weight:600;color:#F15942;line-height:1;">
                      ${renderEmailIcon('lock', 14, '', true)}&nbsp;&nbsp;${L.secureBadge}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Heading -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:12px;">
                <tr>
                  <td align="center" style="font-size:26px;font-weight:700;color:#3F3F3F;line-height:1.3;">
                    ${heading}
                  </td>
                </tr>
              </table>

              <!-- Subheading -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:28px;">
                <tr>
                  <td align="center" style="font-size:15px;color:#8A8A8A;line-height:1.6;max-width:420px;">
                    ${subheading}
                  </td>
                </tr>
              </table>

              <!-- OTP code box -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:440px;background-color:#FFF5F1;border:2px dashed #F15942;border-radius:16px;">
                      <tr>
                        <td align="center" style="padding:28px 20px;">
                          <span style="font-size:44px;font-weight:800;color:#F15942;font-family:'Courier New',Courier,monospace;line-height:1;letter-spacing:0.18em;">${digits}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Expiry row -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:20px;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td valign="middle" style="padding-right:12px;">
                          ${renderEmailIconCircle('clock', '#D4F000')}
                        </td>
                        <td valign="middle" style="font-size:15px;color:#3F3F3F;line-height:1.5;">
                          ${L.expiryText} <strong>${L.expiryMinutes}</strong>.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:20px;">
                <tr><td style="border-top:1px solid #F0E8E2;"></td></tr>
              </table>

              <!-- Ignore note -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td valign="middle" style="padding-right:12px;">
                          ${renderEmailIconCircle('shield', '#FFF0EB')}
                        </td>
                        <td valign="middle" style="font-size:14px;color:#A0A0A0;line-height:1.5;max-width:360px;">
                          ${L.ignoreText}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>

        ${renderEmailFooter(L.footerTagline)}

      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderTrainerInviteHtml(
  inviteUrl: string,
  studioName: string,
  locale?: string,
): string {
  const loc = resolveClientEmailLocale(locale);
  const L = TRAINER_INVITE_EMAIL_STRINGS[loc];
  const safeStudioName = escapeHtml(studioName);
  const safeInviteUrl = escapeHtml(inviteUrl);

  const expiryRow = renderEmailInfoRow(
    'clock',
    '#D4F000',
    `${L.expiryText} <strong>${L.expiryDays}</strong>.`,
  );
  const ignoreRow = renderEmailInfoRow('shield', '#FFF0EB', L.ignoreText);

  return `<!DOCTYPE html>
<html lang="${loc}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${L.pageTitle}</title>
  <!--[if mso]>
  <style>body, table, td { font-family: Arial, sans-serif !important; }</style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#F9F4F0;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#F9F4F0;">
    <tr>
      <td style="padding:32px 16px 40px;">

        ${renderEmailLogoHeader()}

        <!-- Main card -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;width:100%;margin:0 auto;background-color:#ffffff;border-radius:28px;overflow:hidden;box-shadow:0 4px 24px rgba(63,63,63,0.06);">
          <tr>
            <td style="padding:40px 36px 36px;">

              <!-- Badge -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <span style="display:inline-block;background-color:#FFF0EB;border-radius:999px;padding:8px 16px;font-size:13px;font-weight:600;color:#F15942;line-height:1;">
                      ${renderEmailIcon('people', 14, '', true)}&nbsp;&nbsp;${L.badge}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Heading -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:12px;">
                <tr>
                  <td align="center" style="font-size:26px;font-weight:700;color:#3F3F3F;line-height:1.35;">
                    ${L.headingBefore}<br />
                    <span style="color:#F15942;">${safeStudioName}</span>
                  </td>
                </tr>
              </table>

              <!-- Body -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:28px;">
                <tr>
                  <td align="center" style="font-size:15px;color:#8A8A8A;line-height:1.6;max-width:420px;">
                    ${L.body}
                  </td>
                </tr>
              </table>

              <!-- CTA button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="background-color:#F15942;border-radius:14px;text-align:center;">
                          <a href="${safeInviteUrl}" style="display:inline-block;padding:16px 36px;color:#ffffff!important;text-decoration:none;font-size:16px;font-weight:700;border-radius:14px;background-color:#F15942;white-space:nowrap;">
                            ${L.buttonLabel}&nbsp;&nbsp;&rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Dashed divider with link icon -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="border-top:1px dashed #E8DDD6;width:42%;"></td>
                        <td align="center" style="width:16%;padding:0 8px;">
                          <span style="display:inline-block;width:32px;height:32px;background-color:#FFF0EB;border-radius:50%;text-align:center;line-height:32px;">
                            ${renderEmailIcon('link', 14)}
                          </span>
                        </td>
                        <td style="border-top:1px dashed #E8DDD6;width:42%;"></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
                <tr>
                  <td align="center" style="font-size:14px;color:#8A8A8A;line-height:1.5;padding-bottom:10px;">
                    ${L.fallbackLabel}
                  </td>
                </tr>
                <tr>
                  <td>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#FFF5F1;border-radius:12px;">
                      <tr>
                        <td style="padding:14px 16px;font-size:13px;color:#F15942;line-height:1.5;word-break:break-all;">
                          <a href="${safeInviteUrl}" style="color:#F15942;text-decoration:none;">${safeInviteUrl}</a>
                        </td>
                        <td align="right" valign="middle" style="padding:14px 16px 14px 0;width:32px;">
                          ${renderEmailIcon('copy', 16)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Info box -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#FAF6F2;border-radius:16px;">
                <tr>
                  <td style="padding:20px 16px 8px;">
                    ${expiryRow}
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 16px 16px;">
                    ${ignoreRow}
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>

        ${renderEmailFooter(L.footerTagline)}

      </td>
    </tr>
  </table>
</body>
</html>`;
}
