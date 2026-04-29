import type { BookingConfirmationStrings } from '../copy/booking-confirmation.strings';
import type { BookingReminderStrings } from '../copy/booking-reminder.strings';

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
  },
  priceFormatted: string,
): string {
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
            .reminder { background-color: #ffe5e5; border: 1px solid #ff5b5b; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .button { display: inline-block; background-color: #ff5b5b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }

            @media only screen and (max-width: 480px) {
              .container { padding: 10px !important; }
              .content { padding: 15px !important; }
              .booking-details { padding: 10px !important; margin: 10px 0 !important; }
              .header { padding: 15px !important; }
              .reminder { padding: 10px !important; margin: 10px 0 !important; }
              .button { padding: 10px 16px !important; margin: 10px 0 !important; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${L.headerTitle}</h1>
              <p>${L.headerSubtitleBefore} ${bookingData.salonName} ${L.headerSubtitleAfter}</p>
            </div>

            <div class="content">
              <h2>${L.greeting}</h2>

              <div class="reminder">
                <h3>🔔 ${L.reminderTitle}</h3>
                <p>${L.reminderLead}</p>
              </div>

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
                  <span class="detail-label">${L.salon}</span>
                  <span class="detail-value">${bookingData.salonName}</span>
                </div>
                ${
                  bookingData.salonAddress
                    ? `
                <div class="detail-row">
                  <span class="detail-label">${L.address}</span>
                  <span class="detail-value">${bookingData.salonAddress}</span>
                </div>
                `
                    : ''
                }
                ${
                  bookingData.salonPhone
                    ? `
                <div class="detail-row">
                  <span class="detail-label">${L.phone}</span>
                  <span class="detail-value">${bookingData.salonPhone}</span>
                </div>
                `
                    : ''
                }
              </div>

              <p><strong>${L.importantLabel}</strong> ${L.importantBody}</p>
              <p>${L.rescheduleLine}</p>
            </div>

            <div class="footer">
              <p>${L.footer}</p>
            </div>
          </div>
        </body>
        </html>
      `;
}

export function renderBookingPendingHtml(
  L: any,
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
    isWithinWorkingHours?: boolean;
  },
  priceFormatted: string,
): string {
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
            .pending-notice { background-color: #ffe5e5; border: 1px solid #ff5b5b; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center; }

            @media only screen and (max-width: 480px) {
              .container { padding: 10px !important; }
              .content { padding: 15px !important; }
              .booking-details { padding: 10px !important; margin: 10px 0 !important; }
              .header { padding: 15px !important; }
              .pending-notice { padding: 10px !important; margin: 10px 0 !important; }
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
              <div class="pending-notice">
                <h3>${L.awaitingTitle}</h3>
                <p>${L.awaitingLead} <strong>${bookingData.salonName}</strong>.</p>
                ${
                  bookingData.isWithinWorkingHours !== false
                    ? `<p>${L.withinHours}</p>`
                    : `<p>${L.outsideHours}</p>`
                }
              </div>

              <div class="booking-details">
                <h3>${L.requestedDetails}</h3>
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
                <h3>🏢 ${L.salonBlockTitle}</h3>
                <div class="detail-row">
                  <span class="detail-label">${L.salonLabel}</span>
                  <span class="detail-value">${bookingData.salonName}</span>
                </div>
                ${
                  bookingData.salonAddress
                    ? `
                <div class="detail-row">
                  <span class="detail-label">${L.address}</span>
                  <span class="detail-value">${bookingData.salonAddress}</span>
                </div>
                `
                    : ''
                }
                ${
                  bookingData.salonPhone
                    ? `
                <div class="detail-row">
                  <span class="detail-label">${L.phone}</span>
                  <span class="detail-value">${bookingData.salonPhone}</span>
                </div>
                `
                    : ''
                }
              </div>

              <p><strong>${L.whatsNext}</strong></p>
              <ul>
                <li>${L.bullet1}</li>
                <li>${L.bullet2}</li>
                <li>${L.bullet3}</li>
              </ul>
            </div>

            <div class="footer">
              <p>${L.footer}</p>
            </div>
          </div>
        </body>
        </html>
      `;
}

export function renderBookingRejectionHtml(
  L: any,
  bookingData: {
    serviceName: string;
    date: string;
    time: string;
    salonName: string;
    salonPhone?: string;
    reason?: string;
  },
): string {
  return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${L.subject.replace('{salonName}', bookingData.salonName)}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .booking-details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
            .detail-label { font-weight: bold; color: #555; }
            .detail-value { color: #333; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .rejection-notice { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .button { display: inline-block; background-color: #ff5b5b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }

            @media only screen and (max-width: 480px) {
              .container { padding: 10px !important; }
              .content { padding: 15px !important; }
              .booking-details { padding: 10px !important; margin: 10px 0 !important; }
              .header { padding: 15px !important; }
              .rejection-notice { padding: 10px !important; margin: 10px 0 !important; }
              .button { padding: 10px 16px !important; margin: 10px 0 !important; }
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

              <div class="rejection-notice">
                <h3>${L.rejectionTitle}</h3>
                <p>${L.rejectionLeadBefore} ${bookingData.salonName} ${L.rejectionLeadAfter}</p>
                ${bookingData.reason ? `<p><strong>${L.reasonLabel}</strong> ${bookingData.reason}</p>` : ''}
              </div>

              <div class="booking-details">
                <h3>${L.requestedDetails}</h3>
                <div class="detail-row">
                  <span class="detail-label">${L.service}:</span>
                  <span class="detail-value">${bookingData.serviceName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">${L.dateTime}:</span>
                  <span class="detail-value">${bookingData.date} - ${bookingData.time}</span>
                </div>
              </div>

              <div class="booking-details">
                <h3>🏢 ${L.salonContact}</h3>
                <div class="detail-row">
                  <span class="detail-label">${L.salon}</span>
                  <span class="detail-value">${bookingData.salonName}</span>
                </div>
                ${
                  bookingData.salonPhone
                    ? `
                <div class="detail-row">
                  <span class="detail-label">${L.phone}</span>
                  <span class="detail-value">${bookingData.salonPhone}</span>
                </div>
                `
                    : ''
                }
              </div>

              <p><strong>${L.whatCanYouDo}</strong></p>
              <ul>
                <li>${L.bullet1}</li>
                <li>${L.bullet2}</li>
                <li>${L.bullet3}</li>
              </ul>

              <p>${L.apology}</p>
            </div>

            <div class="footer">
              <p>${L.footerThankYou}</p>
              <p>${L.footerAuto}</p>
            </div>
          </div>
        </body>
        </html>
      `;
}
