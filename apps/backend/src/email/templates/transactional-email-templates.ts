import type { BusinessRegistrationStrings } from '../copy/business-registration.strings';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

export function renderBusinessRegistrationMagicLinkHtml(
  name: string,
  registerUrl: string,
  L: BusinessRegistrationStrings,
): string {
  const greeting = L.greeting.replace('{name}', name);

  return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${L.pageTitle}</title>
          <!--[if mso]>
          <style type="text/css">
            body, table, td { font-family: Arial, sans-serif !important; }
          </style>
          <![endif]-->
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
            <tr>
              <td style="padding: 20px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; max-width: 600px; width: 100%;">
                  <tr>
                    <td style="background-color: #ff5b5b; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold; line-height: 1.4;">${L.headerTitle}</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
                      <p style="margin: 0 0 16px 0; color: #333333; font-size: 16px; line-height: 1.6;">${greeting}</p>
                      <p style="margin: 0 0 24px 0; color: #333333; font-size: 16px; line-height: 1.6;">${L.intro}</p>

                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
                        <tr>
                          <td style="text-align: center;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                              <tr>
                                <td style="background-color: #ff5b5b; border-radius: 5px; text-align: center;">
                                  <a href="${registerUrl}" style="display: inline-block; padding: 15px 30px; color: #ffffff !important; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 5px; background-color: #ff5b5b; white-space: nowrap;">${L.buttonLabel}</a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <p style="margin: 24px 0 16px 0; color: #333333; font-size: 16px; line-height: 1.6;">${L.fallbackText}</p>
                      <p style="margin: 0 0 24px 0; word-break: break-all; color: #666666; font-size: 14px; line-height: 1.6; background-color: #ffffff; padding: 12px; border-radius: 4px; border: 1px solid #e0e0e0;">${registerUrl}</p>
                      <p style="margin: 0 0 16px 0; color: #333333; font-size: 16px; line-height: 1.6;"><strong>${L.expiryText}</strong></p>
                      <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">${L.ignoreText}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px 20px 20px 20px; text-align: center;">
                      <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">${L.footerText}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;
}

export function renderOtpEmailHtml(
  code: string,
  kind: 'client' | 'owner',
): string {
  const heading =
    kind === 'owner'
      ? 'Confirm your business account'
      : 'Confirm your account';
  const subheading =
    kind === 'owner'
      ? 'Enter this code in the Henzo app to finish setting up your business account.'
      : 'Enter this code in the Henzo app to complete your registration.';
  const digits = code.split('').join('&thinsp;');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Your Henzo verification code</title>
  <!--[if mso]>
  <style>body, table, td { font-family: Arial, sans-serif !important; }</style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f2f2f2;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f2f2f2;">
    <tr>
      <td style="padding:32px 16px;">

        <!-- Card -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;width:100%;margin:0 auto;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:#ff5b5b;padding:28px 32px;text-align:center;">
              <img
                src="https://henzo.app/logo.png"
                alt="Henzo"
                width="110"
                style="display:block;margin:0 auto;max-width:110px;height:auto;"
              />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:36px 40px 32px;">
              <h1 style="margin:0 0 10px;font-size:22px;font-weight:700;color:#111111;line-height:1.3;">${heading}</h1>
              <p style="margin:0 0 28px;font-size:15px;color:#555555;line-height:1.6;">${subheading}</p>

              <!-- Code block -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:28px;">
                <tr>
                  <td style="text-align:center;">
                    <div style="display:inline-block;background-color:#fff5f5;border:2px solid #ff5b5b;border-radius:12px;padding:20px 36px;">
                      <span style="font-size:40px;font-weight:800;letter-spacing:10px;color:#ff5b5b;font-family:'Courier New',Courier,monospace;">${digits}</span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Expiry -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:28px;">
                <tr>
                  <td style="background-color:#fafafa;border-radius:8px;padding:12px 16px;text-align:center;">
                    <span style="font-size:14px;color:#888888;">&#x23F1;&nbsp; This code expires in <strong style="color:#111111;">10 minutes</strong>.</span>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:20px;">
                <tr><td style="border-top:1px solid #eeeeee;"></td></tr>
              </table>

              <p style="margin:0;font-size:13px;color:#aaaaaa;line-height:1.6;">
                If you didn't request this code, you can safely ignore this email. Someone may have entered your email address by mistake.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9f9f9;padding:20px 40px;text-align:center;border-top:1px solid #eeeeee;">
              <p style="margin:0;font-size:13px;color:#bbbbbb;">
                &copy; ${new Date().getFullYear()} Henzo &nbsp;&middot;&nbsp;
                <a href="https://henzo.app" style="color:#ff5b5b;text-decoration:none;">henzo.app</a>
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
</body>
</html>`;
}
