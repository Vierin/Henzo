/** English-only templates for salon/owner notifications. */

export function renderSalonNotificationHtml(
  salonName: string,
  bookingData: {
    serviceName: string;
    date: string;
    time: string;
    duration: number;
    price: number;
    clientName: string;
    clientEmail: string;
    clientPhone?: string;
    staffName?: string;
  },
  priceFormatted: string,
): string {
  return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>New Booking - ${salonName}</title>
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
            .urgent { background-color: #ffe5e5; border: 1px solid #ff5b5b; padding: 15px; border-radius: 5px; margin: 20px 0; }

            @media only screen and (max-width: 480px) {
              .container { padding: 10px !important; }
              .content { padding: 15px !important; }
              .booking-details { padding: 10px !important; margin: 10px 0 !important; }
              .header { padding: 15px !important; }
              .urgent { padding: 10px !important; margin: 10px 0 !important; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 New Booking Received!</h1>
              <p>A new appointment has been booked at ${salonName}</p>
            </div>

            <div class="content">
              <div class="urgent">
                <h3>📋 New Appointment Details</h3>
              </div>

              <div class="booking-details">
                <h3>👤 Client Information</h3>
                <div class="detail-row">
                  <span class="detail-label">Name:</span>
                  <span class="detail-value">${bookingData.clientName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Email:</span>
                  <span class="detail-value">${bookingData.clientEmail}</span>
                </div>
                ${
                  bookingData.clientPhone
                    ? `
                <div class="detail-row">
                  <span class="detail-label">Phone:</span>
                  <span class="detail-value">${bookingData.clientPhone}</span>
                </div>
                `
                    : ''
                }
              </div>

              <div class="booking-details">
                <h3>Appointment Details</h3>
                <div class="detail-row">
                  <span class="detail-label">Service:</span>
                  <span class="detail-value">${bookingData.serviceName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Date & Time:</span>
                  <span class="detail-value">${bookingData.date} - ${bookingData.time}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Duration:</span>
                  <span class="detail-value">${bookingData.duration} minutes</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Price:</span>
                  <span class="detail-value">${priceFormatted}</span>
                </div>
                ${
                  bookingData.staffName
                    ? `
                <div class="detail-row">
                  <span class="detail-label">Assigned Staff:</span>
                  <span class="detail-value">${bookingData.staffName}</span>
                </div>
                `
                    : ''
                }
              </div>

              <p><strong>Next Steps:</strong></p>
              <ul>
                <li>Confirm the appointment with the client if needed</li>
                <li>Prepare the necessary equipment and supplies</li>
                <li>Ensure the assigned staff member is available</li>
              </ul>
            </div>

            <div class="footer">
              <p>This is an automated notification from your booking system.</p>
            </div>
          </div>
        </body>
        </html>
      `;
}

export function renderSalonBookingRequestHtml(
  salonName: string,
  confirmUrl: string,
  rejectUrl: string,
  bookingData: {
    serviceName: string;
    date: string;
    time: string;
    duration: number;
    price: number;
    clientName: string;
    clientEmail: string;
    clientPhone?: string;
    staffName?: string;
  },
  priceFormatted: string,
): string {
  return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>New Booking Request - ${salonName}</title>
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
            .urgent { background-color: #ffe5e5; border: 1px solid #ff5b5b; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center; }
            .button-container { text-align: center; margin: 30px 0; }
            .button { display: inline-block; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 0 10px; font-weight: bold; font-size: 16px; }
            .button-confirm { background-color: #28a745; color: white; }
            .button-reject { background-color: #dc3545; color: white; }

            @media only screen and (max-width: 480px) {
              .container { padding: 10px !important; }
              .content { padding: 15px !important; }
              .booking-details { padding: 10px !important; margin: 10px 0 !important; }
              .header { padding: 15px !important; }
              .urgent { padding: 10px !important; margin: 10px 0 !important; }
              .button-container { margin: 15px 0 !important; }
              .button { padding: 10px 16px !important; margin: 5px !important; font-size: 14px !important; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Booking Request!</h1>
              <p>Action Required - Booking Awaiting Confirmation</p>
            </div>

            <div class="content">
              <div class="urgent">
                <h3>Please confirm or reject this booking</h3>
                <p>A client is waiting for your response</p>
              </div>

              <div class="booking-details">
                <h3>👤 Client Information</h3>
                <div class="detail-row">
                  <span class="detail-label">Name:</span>
                  <span class="detail-value">${bookingData.clientName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Email:</span>
                  <span class="detail-value">${bookingData.clientEmail}</span>
                </div>
                ${
                  bookingData.clientPhone
                    ? `
                <div class="detail-row">
                  <span class="detail-label">Phone:</span>
                  <span class="detail-value">${bookingData.clientPhone}</span>
                </div>
                `
                    : ''
                }
              </div>

              <div class="booking-details">
                <h3>Appointment Details</h3>
                <div class="detail-row">
                  <span class="detail-label">Service:</span>
                  <span class="detail-value">${bookingData.serviceName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Date & Time:</span>
                  <span class="detail-value">${bookingData.date} - ${bookingData.time}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Duration:</span>
                  <span class="detail-value">${bookingData.duration} minutes</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Price:</span>
                  <span class="detail-value">${priceFormatted}</span>
                </div>
                ${
                  bookingData.staffName
                    ? `
                <div class="detail-row">
                  <span class="detail-label">Assigned Staff:</span>
                  <span class="detail-value">${bookingData.staffName}</span>
                </div>
                `
                    : ''
                }
              </div>

              <div class="button-container">
                <a href="${confirmUrl}" class="button button-confirm">✅ Confirm Booking</a>
                <a href="${rejectUrl}" class="button button-reject">❌ Reject Booking</a>
              </div>

              <p style="text-align: center; margin-top: 20px; color: #666;">
                Click on the buttons above to confirm or reject this booking request.
              </p>
            </div>

            <div class="footer">
              <p>This is an automated notification from your booking system.</p>
              <p>Please respond as soon as possible to provide the best service to your clients.</p>
            </div>
          </div>
        </body>
        </html>
      `;
}
