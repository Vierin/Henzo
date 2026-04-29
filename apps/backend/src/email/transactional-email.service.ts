import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoEmailDeliveryService } from './brevo-email-delivery.service';
import {
  BUSINESS_REGISTRATION_STRINGS,
  MAGIC_LINK_CONFIRMATION_STRINGS,
  resolveClientEmailLocale,
} from './copy';
import {
  renderBusinessRegistrationMagicLinkHtml,
  renderContactMessageHtml,
  renderMagicLinkConfirmationHtml,
} from './templates/transactional-email-templates';

@Injectable()
export class TransactionalEmailService {
  constructor(
    private readonly delivery: BrevoEmailDeliveryService,
    private readonly configService: ConfigService,
  ) {}

  async sendContactMessage(data: {
    to: string;
    subject: string;
    template: string;
    context: {
      name: string;
      email: string;
      message: string;
      timestamp: string;
    };
  }) {
    console.log('📧 Sending contact message to:', data.to);

    const htmlContent = renderContactMessageHtml(data.context);

    return this.delivery.send({
      to: [{ email: data.to, name: 'Henzo Team' }],
      sender: {
        email:
          this.configService.get<string>('BREVO_FROM_EMAIL') ||
          'noreply@henzo.app',
        name: 'Henzo Contact Form',
      },
      subject: data.subject,
      htmlContent,
    });
  }

  async sendMagicLinkConfirmation(
    clientEmail: string,
    data: {
      confirmUrl: string;
      serviceName: string;
      salonName: string;
      date: string;
      time: string;
      locale?: 'en' | 'ru' | 'vi';
    },
  ) {
    console.log('📧 Sending magic link confirmation to:', clientEmail);

    const loc = resolveClientEmailLocale(data.locale);
    const L =
      MAGIC_LINK_CONFIRMATION_STRINGS[loc] ||
      MAGIC_LINK_CONFIRMATION_STRINGS.en;
    const htmlContent = renderMagicLinkConfirmationHtml(
      {
        confirmUrl: data.confirmUrl,
        serviceName: data.serviceName,
        salonName: data.salonName,
        date: data.date,
        time: data.time,
      },
      L,
    );
    const subject = L.subject.replace('{salonName}', data.salonName);

    return this.delivery.send({
      to: [{ email: clientEmail, name: 'Guest' }],
      sender: {
        email:
          this.configService.get<string>('BREVO_FROM_EMAIL') ||
          'noreply@henzo.app',
        name: 'Henzo Booking System',
      },
      subject,
      htmlContent,
    });
  }

  async sendBusinessRegistrationMagicLink(
    email: string,
    name: string,
    registerUrl: string,
    locale?: 'en' | 'ru' | 'vi',
  ) {
    console.log('📧 Sending business registration magic link to:', email);

    const loc = resolveClientEmailLocale(locale);
    const L =
      BUSINESS_REGISTRATION_STRINGS[loc] || BUSINESS_REGISTRATION_STRINGS.en;
    const htmlContent = renderBusinessRegistrationMagicLinkHtml(
      name,
      registerUrl,
      L,
    );

    return this.delivery.send({
      to: [{ email, name }],
      sender: {
        email:
          this.configService.get<string>('BREVO_FROM_EMAIL') ||
          'noreply@henzo.app',
        name: 'Henzo Business Platform',
      },
      subject: L.subject,
      htmlContent,
    });
  }
}
