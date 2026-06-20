import type { BookingConfirmationStrings } from '../copy/booking-confirmation.strings';
import type { BookingReminderStrings } from '../copy/booking-reminder.strings';
import type { EmailIconName } from './email-layout.helpers';
import {
  escapeHtml,
  renderEmailFooter,
  renderEmailIcon,
  renderEmailLogoHeader,
} from './email-layout.helpers';

export function renderBookingConfirmationHtml(
  L: BookingConfirmationStrings,
  bookingData: {
    serviceName: string;
    date: string;
    time: string;
    duration: number;
    price: number;
    salonName: string;
    salonAddress?: string;
    salonPhone?: string;
    staffName?: string;
    dateTime?: Date | string;
    salonTimezone?: string;
  },
  priceFormatted: string,
  calendarUrl: string | null,
  mapsUrl: string | null,
): string {
  const calendarBlock =
    bookingData.dateTime && calendarUrl
      ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${calendarUrl}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="button"
                  style="display: inline-block; background-color: #4285f4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px; font-weight: bold;">
                  📅 ${L.addToCalendar}
                </a>
                ${
                  mapsUrl
                    ? `
                <a href="${mapsUrl}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="button"
                  style="display: inline-block; background-color: #ff5b5b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px; font-weight: bold;">
                  🗺️ ${L.getDirections}
                </a>
                `
                    : ''
                }
              </div>
              `
      : '';

  return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${L.subject.replace('{salonName}', bookingData.salonName)}</title>
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
            .button { display: inline-block; background-color: #ff5b5b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }

            @media only screen and (max-width: 480px) {
              .container { padding: 10px !important; }
              .content { padding: 15px !important; }
              .booking-details { padding: 10px !important; margin: 10px 0 !important; }
              .header { padding: 15px !important; }
              .button { padding: 10px 16px !important; margin: 10px 0 !important; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            ${renderEmailLogoHeader(600)}
            <div class="header">
              <h1>${L.title}</h1>
              <p>${L.subtitle.replace('{salonName}', bookingData.salonName)}</p>
            </div>

            <div class="content">
              <p>${L.thankYou}</p>

              <div class="booking-details">
                <h3>${L.appointmentDetails}</h3>
                <div class="detail-row">
                  <span class="detail-label">${L.service}:</span>
                  <span class="detail-value">${bookingData.serviceName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">${L.dateTime}:</span>
                  <span class="detail-value">${bookingData.date} - ${bookingData.time}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">${L.duration}:</span>
                  <span class="detail-value">${bookingData.duration} ${L.minutes}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">${L.price}:</span>
                  <span class="detail-value">${priceFormatted}</span>
                </div>
                ${
                  bookingData.staffName
                    ? `
                <div class="detail-row">
                  <span class="detail-label">${L.staff}:</span>
                  <span class="detail-value">${bookingData.staffName}</span>
                </div>
                `
                    : ''
                }
              </div>

              <div class="booking-details">
                <h3>🏢 ${L.salonInfo}</h3>
                <div class="detail-row">
                  <span class="detail-label">${L.name}:</span>
                  <span class="detail-value">${bookingData.salonName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">${L.address}:</span>
                  <span class="detail-value">${
                    bookingData.salonAddress || L.notProvided
                  }</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">${L.phone}:</span>
                  <span class="detail-value">${
                    bookingData.salonPhone || L.notProvided
                  }</span>
                </div>
              </div>

              <p><strong>${L.importantLabel}</strong> ${L.important}</p>
              <p>${L.rescheduleNote}</p>

              ${calendarBlock}
            </div>

            <div class="footer">
              <p>${L.footer}</p>
            </div>
          </div>
        </body>
        </html>
      `;
}

export function renderBookingReminderHtml(
  L: BookingReminderStrings,
  clientName: string,
  bookingData: {
    serviceName: string;
    date: string;
    time: string;
    duration: number;
    salonName: string;
    salonAddress?: string;
    staffName?: string;
  },
  calendarUrl: string | null,
  mapsUrl: string | null,
): string {
  const safeService = escapeHtml(bookingData.serviceName);
  const safeSalon = escapeHtml(bookingData.salonName);
  const safeDate = escapeHtml(bookingData.date);
  const safeTime = escapeHtml(bookingData.time);
  const safeStaff = bookingData.staffName
    ? escapeHtml(bookingData.staffName)
    : '';
  const safeLocation = escapeHtml(
    bookingData.salonAddress?.trim() || bookingData.salonName,
  );
  const displayName = clientName.trim() || L.defaultClientName;
  const greetingHtml = `${escapeHtml(
    L.greetingBefore.replace('{name}', displayName),
  )}<span style="color:#F15942;">${escapeHtml(L.greetingHighlight)}</span>`;
  const classSubtitle = safeStaff
    ? `${L.withPrefix} ${safeStaff} &bull; ${safeSalon}`
    : safeSalon;
  const timeValue = `${safeTime} &middot; ${bookingData.duration} ${L.minutes}`;

  const calendarButton = calendarUrl
    ? `
      <td align="center" style="padding:0 6px 0 0;">
        <a href="${calendarUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 20px;border:2px solid #F15942;border-radius:14px;background-color:#ffffff;color:#F15942!important;text-decoration:none;font-size:14px;font-weight:700;white-space:nowrap;">
          ${renderEmailIcon('clock', 16, '', true)}&nbsp;&nbsp;${L.addToCalendar}
        </a>
      </td>`
    : '';

  const mapsButton = mapsUrl
    ? `
      <td align="center" style="padding:0 0 0 6px;">
        <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 20px;border-radius:14px;background-color:#F15942;color:#ffffff!important;text-decoration:none;font-size:14px;font-weight:700;white-space:nowrap;">
          ${renderEmailIcon('link', 16, '', true)}&nbsp;&nbsp;${L.getDirections}
        </a>
      </td>`
    : '';

  const actionButtons =
    calendarButton || mapsButton
      ? `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:24px 0 8px;">
        <tr>
          <td align="center">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                ${calendarButton}
                ${mapsButton}
              </tr>
            </table>
          </td>
        </tr>
      </table>`
      : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(L.subject.replace('{salonName}', bookingData.salonName))}</title>
  <!--[if mso]>
  <style>body, table, td { font-family: Arial, sans-serif !important; }</style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#F9F4F0;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#F9F4F0;">
    <tr>
      <td style="padding:32px 16px 40px;">

        ${renderEmailLogoHeader()}

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;width:100%;margin:0 auto;background-color:#ffffff;border-radius:28px;overflow:hidden;box-shadow:0 4px 24px rgba(63,63,63,0.06);">
          <tr>
            <td style="padding:40px 36px 36px;">

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:16px;">
                <tr>
                  <td align="center" style="font-size:11px;font-weight:700;letter-spacing:0.14em;color:#F15942;text-transform:uppercase;">
                    ${L.eyebrow}
                  </td>
                </tr>
              </table>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:10px;">
                <tr>
                  <td align="center" style="font-size:28px;font-weight:700;color:#3F3F3F;line-height:1.35;font-family:Georgia,'Times New Roman',serif;">
                    ${greetingHtml}
                  </td>
                </tr>
              </table>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:28px;">
                <tr>
                  <td align="center" style="font-size:15px;color:#8A8A8A;line-height:1.6;">
                    ${L.subheading}
                  </td>
                </tr>
              </table>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:8px;">
                <tr>
                  <td align="center" style="font-size:30px;font-weight:700;color:#3F3F3F;line-height:1.25;font-family:Georgia,'Times New Roman',serif;">
                    ${safeService}
                  </td>
                </tr>
              </table>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:28px;">
                <tr>
                  <td align="center" style="font-size:14px;color:#8A8A8A;line-height:1.5;">
                    ${classSubtitle}
                  </td>
                </tr>
              </table>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
                <tr>
                  ${renderReminderMetaCell('clock', L.dateLabel, safeDate)}
                  ${renderReminderMetaCell('clock', L.timeLabel, timeValue)}
                </tr>
                <tr>
                  ${renderReminderMetaCell(
                    'profile-large',
                    L.instructorLabel,
                    safeStaff || safeSalon,
                    18,
                    20,
                  )}
                  ${renderReminderMetaCell('pin', L.locationLabel, safeLocation, 16, 20)}
                </tr>
              </table>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;background-color:#FFF5F1;border-radius:14px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td valign="middle" width="36" style="padding-right:12px;">
                          ${renderEmailIcon('shield', 18)}
                        </td>
                        <td valign="middle" style="font-size:14px;color:#3F3F3F;line-height:1.55;">
                          <strong>${L.arriveEarlyBefore}<span style="color:#F15942;">${L.arriveEarlyHighlight}</span>${L.arriveEarlyAfter}</strong>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${actionButtons}

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top:28px;background-color:#FAF6F2;border-radius:16px;">
                <tr>
                  <td style="padding:20px 18px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="font-size:16px;font-weight:700;color:#3F3F3F;line-height:1.4;">
                          ${L.closingTitle}
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

function renderReminderMetaCell(
  icon: EmailIconName,
  label: string,
  value: string,
  iconWidth = 16,
  iconHeight = 16,
): string {
  return `
    <td width="50%" valign="top" style="padding:10px 8px;vertical-align:top;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td valign="top" width="24" style="padding-right:10px;padding-top:2px;">
            ${renderEmailIcon(icon, iconWidth, '', false, iconHeight)}
          </td>
          <td valign="top">
            <div style="font-size:11px;font-weight:600;letter-spacing:0.08em;color:#A0A0A0;text-transform:uppercase;line-height:1.4;margin-bottom:4px;">
              ${label}
            </div>
            <div style="font-size:15px;font-weight:700;color:#3F3F3F;line-height:1.4;">
              ${value}
            </div>
          </td>
        </tr>
      </table>
    </td>`;
}
