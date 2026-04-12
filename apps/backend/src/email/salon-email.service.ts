import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoEmailDeliveryService } from './brevo-email-delivery.service';
import { formatVnd } from './email-helpers';
import {
  renderSalonBookingRequestHtml,
  renderSalonNotificationHtml,
} from './templates/salon-email-templates';

@Injectable()
export class SalonEmailService {
  constructor(
    private readonly delivery: BrevoEmailDeliveryService,
    private readonly configService: ConfigService,
  ) {}

  private defaultSender() {
    return {
      email:
        this.configService.get<string>('BREVO_FROM_EMAIL') ||
        'noreply@henzo.app',
      name: 'Henzo Booking System',
    };
  }

  async sendSalonNotification(
    salonEmail: string,
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
  ) {
    console.log('📧 Sending salon notification to:', salonEmail);

    const htmlContent = renderSalonNotificationHtml(
      salonName,
      bookingData,
      formatVnd(bookingData.price),
    );

    return this.delivery.send({
      to: [{ email: salonEmail, name: salonName }],
      sender: this.defaultSender(),
      subject: `New Booking - ${bookingData.clientName} at ${bookingData.time}`,
      htmlContent,
    });
  }

  async sendSalonBookingRequest(
    salonEmail: string,
    salonName: string,
    bookingData: {
      bookingId: string;
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
  ) {
    console.log('📧 Sending salon booking request to:', salonEmail);

    const baseUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      (process.env.NODE_ENV === 'production'
        ? 'https://henzo.app'
        : 'http://localhost:3000');
    const confirmUrl = `${baseUrl}/bookings/${bookingData.bookingId}/confirm`;
    const rejectUrl = `${baseUrl}/bookings/${bookingData.bookingId}/reject`;

    const htmlContent = renderSalonBookingRequestHtml(
      salonName,
      confirmUrl,
      rejectUrl,
      bookingData,
      formatVnd(bookingData.price),
    );

    return this.delivery.send({
      to: [{ email: salonEmail, name: salonName }],
      sender: this.defaultSender(),
      subject: `New Booking Request - ${bookingData.clientName} at ${bookingData.time}`,
      htmlContent,
    });
  }
}
