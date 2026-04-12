import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoEmailDeliveryService } from './brevo-email-delivery.service';
import { ClientBookingEmailService } from './client-booking-email.service';
import { SalonEmailService } from './salon-email.service';
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
    private readonly salonEmail: SalonEmailService,
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

  async sendSalonNotification(
    salonEmail: string,
    salonName: string,
    bookingData: Parameters<SalonEmailService['sendSalonNotification']>[2],
  ) {
    try {
      const result = await this.salonEmail.sendSalonNotification(
        salonEmail,
        salonName,
        bookingData,
      );
      console.log('✅ Salon notification sent successfully via Brevo');
      return result;
    } catch (error) {
      console.error('❌ Error sending salon notification:', error);
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

  async sendSalonBookingRequest(
    salonEmail: string,
    salonName: string,
    bookingData: Parameters<SalonEmailService['sendSalonBookingRequest']>[2],
  ) {
    try {
      const result = await this.salonEmail.sendSalonBookingRequest(
        salonEmail,
        salonName,
        bookingData,
      );
      console.log('✅ Salon booking request sent successfully via Brevo');
      return result;
    } catch (error) {
      console.error('❌ Error sending salon booking request:', error);
      throw error;
    }
  }

  async sendBookingPending(
    clientEmail: string,
    clientName: string,
    bookingData: Parameters<ClientBookingEmailService['sendBookingPending']>[2],
  ) {
    try {
      const result = await this.clientBooking.sendBookingPending(
        clientEmail,
        clientName,
        bookingData,
      );
      console.log(
        '✅ Booking pending notification sent successfully via Brevo',
      );
      return result;
    } catch (error) {
      console.error('❌ Error sending booking pending notification:', error);
      throw error;
    }
  }

  async sendBookingRejection(
    clientEmail: string,
    clientName: string,
    bookingData: Parameters<
      ClientBookingEmailService['sendBookingRejection']
    >[2],
  ) {
    try {
      const result = await this.clientBooking.sendBookingRejection(
        clientEmail,
        clientName,
        bookingData,
      );
      console.log('✅ Booking rejection sent successfully via Brevo');
      return result;
    } catch (error) {
      console.error('❌ Error sending booking rejection:', error);
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

  async sendMagicLinkConfirmation(
    clientEmail: string,
    data: Parameters<
      TransactionalEmailService['sendMagicLinkConfirmation']
    >[1],
  ) {
    try {
      const result = await this.transactional.sendMagicLinkConfirmation(
        clientEmail,
        data,
      );
      console.log('✅ Magic link confirmation sent successfully via Brevo');
      return result;
    } catch (error) {
      console.error('❌ Error sending magic link confirmation:', error);
      throw error;
    }
  }

  async sendBusinessRegistrationMagicLink(
    email: string,
    name: string,
    registerUrl: string,
  ) {
    try {
      const result = await this.transactional.sendBusinessRegistrationMagicLink(
        email,
        name,
        registerUrl,
      );
      console.log(
        '✅ Business registration magic link sent successfully via Brevo',
      );
      return result;
    } catch (error) {
      console.error(
        '❌ Error sending business registration magic link:',
        error,
      );
      throw error;
    }
  }
}
