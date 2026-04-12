import type { MagicLinkConfirmationStrings } from '../copy/magic-link-confirmation.strings';

export function renderContactMessageHtml(context: {
  name: string;
  email: string;
  message: string;
  timestamp: string;
}): string {
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
                  <span class="detail-value">${context.name}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Email:</span>
                  <span class="detail-value">${context.email}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Timestamp:</span>
                  <span class="detail-value">${context.timestamp}</span>
                </div>
              </div>

              <div class="message-details">
                <h3>💬 Message</h3>
                <div class="message-content">
                  ${context.message.replace(/\n/g, '<br>')}
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

export function renderMagicLinkConfirmationHtml(
  data: {
    confirmUrl: string;
    serviceName: string;
    salonName: string;
    date: string;
    time: string;
  },
  L: MagicLinkConfirmationStrings,
): string {
  const bodyIntro = L.bodyHtml.replace(/\{salonName\}/g, data.salonName);

  return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${L.pageTitle} - ${data.salonName}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #ff5b5b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .booking-details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
            .detail-label { font-weight: bold; color: #555; }
            .detail-value { color: #333; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .button { display: inline-block; background-color: #ff5b5b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .button-container { text-align: center; margin: 30px 0; }
            .notice { background-color: #ffe5e5; border: 1px solid #ff5b5b; padding: 15px; border-radius: 5px; margin: 20px 0; }

            @media only screen and (max-width: 480px) {
              .container { padding: 10px !important; }
              .content { padding: 15px !important; }
              .booking-details { padding: 10px !important; margin: 10px 0 !important; }
              .header { padding: 15px !important; }
              .button { padding: 10px 16px !important; margin: 10px 0 !important; }
              .button-container { margin: 15px 0 !important; }
              .notice { padding: 10px !important; margin: 10px 0 !important; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${L.headerTitle}</h1>
              <p>${L.headerSubtitle}</p>
            </div>

            <div class="content">
              <h2>${L.greeting}</h2>
              ${bodyIntro}

              <div class="button-container">
                <a href="${data.confirmUrl}" class="button">${L.buttonConfirm}</a>
              </div>

              <div class="booking-details">
                <h3>${L.detailsTitle}</h3>
                <div class="detail-row">
                  <span class="detail-label">${L.serviceLabel}</span>
                  <span class="detail-value">${data.serviceName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">${L.dateTimeLabel}</span>
                  <span class="detail-value">${data.date} - ${data.time}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">${L.salonLabel}</span>
                  <span class="detail-value">${data.salonName}</span>
                </div>
              </div>

              <div class="notice">
                <p><strong>${L.importantLabel}</strong> ${L.expiryLine}</p>
                <p>${L.ignoreLine}</p>
              </div>

              <p>${L.fallbackLinkText}</p>
              <p style="word-break: break-all; color: #666; font-size: 12px;">${data.confirmUrl}</p>
            </div>

            <div class="footer">
              <p>${L.footer}</p>
            </div>
          </div>
        </body>
        </html>
      `;
}

export function renderBusinessRegistrationMagicLinkHtml(
  name: string,
  registerUrl: string,
): string {
  return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Complete Your Business Registration - Henzo</title>
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
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold; line-height: 1.4;">🚀 Complete Your Business Registration</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
                      <p style="margin: 0 0 16px 0; color: #333333; font-size: 16px; line-height: 1.6;">Hi ${name},</p>
                      <p style="margin: 0 0 24px 0; color: #333333; font-size: 16px; line-height: 1.6;">Thank you for your interest in Henzo! Click the button below to complete your business account registration:</p>

                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
                        <tr>
                          <td style="text-align: center;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                              <tr>
                                <td style="background-color: #ff5b5b; border-radius: 5px; text-align: center;">
                                  <a href="${registerUrl}" style="display: inline-block; padding: 15px 30px; color: #ffffff !important; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 5px; background-color: #ff5b5b; white-space: nowrap;">Complete Registration</a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <p style="margin: 24px 0 16px 0; color: #333333; font-size: 16px; line-height: 1.6;">Or copy and paste this link into your browser:</p>
                      <p style="margin: 0 0 24px 0; word-break: break-all; color: #666666; font-size: 14px; line-height: 1.6; background-color: #ffffff; padding: 12px; border-radius: 4px; border: 1px solid #e0e0e0;">${registerUrl}</p>
                      <p style="margin: 0 0 16px 0; color: #333333; font-size: 16px; line-height: 1.6;"><strong>This link will expire in 24 hours.</strong></p>
                      <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">If you didn't request this registration, please ignore this email.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px 20px 20px 20px; text-align: center;">
                      <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">This is an automated message from Henzo. Please do not reply to this email.</p>
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
