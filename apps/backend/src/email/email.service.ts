import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoEmailDeliveryService } from './brevo-email-delivery.service';
import { ClientBookingEmailService } from './client-booking-email.service';
import { TransactionalEmailService } from './transactional-email.service';

/**
 * Facade: public API for the rest of the app. Implementation is split across
 * delivery, client booking templates, salon (English), and transactional emails.
 */
@Injectable()
export class EmailService {
  constructor(
    private readonly delivery: BrevoEmailDeliveryService,
    private readonly configService: ConfigService,
    private readonly clientBooking: ClientBookingEmailService,
    private readonly transactional: TransactionalEmailService,
  ) {}

  async sendEmail(data: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    from?: string;
    fromName?: string;
  }): Promise<unknown> {
    const emailFrom =
      this.configService.get<string>('EMAIL_FROM') || 'noreply@henzo.app';
    const emailFromName =
      this.configService.get<string>('EMAIL_FROM_NAME') || 'Henzo';

    return this.delivery.send({
      to: [{ email: data.to, name: data.to.split('@')[0] }],
      sender: {
        email: data.from || emailFrom,
        name: data.fromName || emailFromName,
      },
      subject: data.subject,
      htmlContent: data.html,
    });
  }

  async sendBookingConfirmation(
    clientEmail: string,
    clientName: string,
    bookingData: Parameters<
      ClientBookingEmailService['sendBookingConfirmation']
    >[2],
  ) {
    try {
      const result = await this.clientBooking.sendBookingConfirmation(
        clientEmail,
        clientName,
        bookingData,
      );
      console.log('✅ Booking confirmation sent successfully via Brevo');
      return result;
    } catch (error) {
      console.error('❌ Error sending booking confirmation:', error);
      throw error;
    }
  }

  async sendBookingReminder(
    clientEmail: string,
    clientName: string,
    bookingData: Parameters<
      ClientBookingEmailService['sendBookingReminder']
    >[2],
  ) {
    try {
      const result = await this.clientBooking.sendBookingReminder(
        clientEmail,
        clientName,
        bookingData,
      );
      console.log('✅ Booking reminder sent successfully via Brevo');
      return result;
    } catch (error) {
      console.error('❌ Error sending booking reminder:', error);
      throw error;
    }
  }

  async sendContactMessage(
    data: Parameters<TransactionalEmailService['sendContactMessage']>[0],
  ) {
    try {
      const result = await this.transactional.sendContactMessage(data);
      console.log('✅ Contact message sent successfully via Brevo');
      return result;
    } catch (error) {
      console.error('❌ Error sending contact message:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      if (!this.delivery.hasApiKey) {
        console.error('❌ Brevo API key not configured');
        return false;
      }
      return await this.delivery.testAccountConnection();
    } catch (error) {
      console.error('❌ Brevo API connection test failed:', error);
      return false;
    }
  }

}
