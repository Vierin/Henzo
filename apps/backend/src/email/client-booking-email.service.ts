import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BOOKING_CONFIRMATION_STRINGS,
  BOOKING_PENDING_STRINGS,
  BOOKING_REJECTION_STRINGS,
  BOOKING_REMINDER_STRINGS,
  resolveClientEmailLocale,
} from './copy';
import { BrevoEmailDeliveryService } from './brevo-email-delivery.service';
import {
  formatVnd,
  generateGoogleCalendarUrl,
  generateGoogleMapsUrl,
} from './email-helpers';
import {
  renderBookingConfirmationHtml,
  renderBookingPendingHtml,
  renderBookingRejectionHtml,
  renderBookingReminderHtml,
} from './templates/client-booking-templates';

@Injectable()
export class ClientBookingEmailService {
  constructor(
    private readonly delivery: BrevoEmailDeliveryService,
    private readonly configService: ConfigService,
  ) {}

  private defaultSender() {
    return {
      email:
        this.configService.get<string>('BREVO_FROM_EMAIL') || 'noreply@henzo.app',
      name: 'Henzo Booking System',
    };
  }

  async sendBookingConfirmation(
    clientEmail: string,
    clientName: string,
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
      locale?: 'en' | 'ru' | 'vi';
    },
  ) {
    console.log('📧 Sending booking confirmation to:', clientEmail);

    const loc = resolveClientEmailLocale(bookingData.locale);
    const L =
      BOOKING_CONFIRMATION_STRINGS[loc] || BOOKING_CONFIRMATION_STRINGS.en;

    let calendarUrl: string | null = null;
    let mapsUrl: string | null = null;
    if (bookingData.dateTime) {
      calendarUrl = generateGoogleCalendarUrl({
        serviceName: bookingData.serviceName,
        dateTime: bookingData.dateTime,
        duration: bookingData.duration,
        salonName: bookingData.salonName,
        salonAddress: bookingData.salonAddress,
        staffName: bookingData.staffName,
        salonTimezone: bookingData.salonTimezone,
      });
      if (bookingData.salonAddress) {
        mapsUrl = generateGoogleMapsUrl(bookingData.salonAddress);
      }
    }

    const htmlContent = renderBookingConfirmationHtml(
      L,
      bookingData,
      formatVnd(bookingData.price),
      calendarUrl,
      mapsUrl,
    );

    return this.delivery.send({
      to: [{ email: clientEmail, name: clientName }],
      sender: this.defaultSender(),
      subject: L.subject.replace('{salonName}', bookingData.salonName),
      htmlContent,
    });
  }

  async sendBookingReminder(
    clientEmail: string,
    clientName: string,
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
      salonTimezone?: string;
      locale?: 'en' | 'ru' | 'vi';
    },
  ) {
    console.log('📧 Sending booking reminder to:', clientEmail);

    const loc = resolveClientEmailLocale(bookingData.locale);
    const L = BOOKING_REMINDER_STRINGS[loc] || BOOKING_REMINDER_STRINGS.en;

    const htmlContent = renderBookingReminderHtml(
      L,
      bookingData,
      formatVnd(bookingData.price),
    );

    return this.delivery.send({
      to: [{ email: clientEmail, name: clientName }],
      sender: this.defaultSender(),
      subject: L.subject.replace('{salonName}', bookingData.salonName),
      htmlContent,
    });
  }

  async sendBookingPending(
    clientEmail: string,
    clientName: string,
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
      isWithinWorkingHours?: boolean;
      locale?: 'en' | 'ru' | 'vi';
    },
  ) {
    console.log('📧 Sending pending booking notification to:', clientEmail);

    const loc = resolveClientEmailLocale(bookingData.locale);
    const L = BOOKING_PENDING_STRINGS[loc] || BOOKING_PENDING_STRINGS.en;

    const htmlContent = renderBookingPendingHtml(
      L,
      bookingData,
      formatVnd(bookingData.price),
    );

    return this.delivery.send({
      to: [{ email: clientEmail, name: clientName }],
      sender: this.defaultSender(),
      subject: L.subject.replace('{salonName}', bookingData.salonName),
      htmlContent,
    });
  }

  async sendBookingRejection(
    clientEmail: string,
    clientName: string,
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
      reason?: string;
      locale?: 'en' | 'ru' | 'vi';
    },
  ) {
    console.log('📧 Sending booking rejection to:', clientEmail);

    const loc = resolveClientEmailLocale(bookingData.locale);
    const L = BOOKING_REJECTION_STRINGS[loc] || BOOKING_REJECTION_STRINGS.en;

    const htmlContent = renderBookingRejectionHtml(L, bookingData);

    return this.delivery.send({
      to: [{ email: clientEmail, name: clientName }],
      sender: this.defaultSender(),
      subject: L.subject.replace('{salonName}', bookingData.salonName),
      htmlContent,
    });
  }
}
