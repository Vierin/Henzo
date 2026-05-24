import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoEmailDeliveryService } from './brevo-email-delivery.service';
import { renderContactMessageHtml } from './templates/transactional-email-templates';

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
          this.configService.get<string>('EMAIL_FROM') || 'noreply@henzo.app',
        name:
          this.configService.get<string>('EMAIL_FROM_NAME') ||
          'Henzo Contact Form',
      },
      subject: data.subject,
      htmlContent,
    });
  }
}
