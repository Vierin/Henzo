import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ContactDto } from './dto/contact.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class ContactService {
  constructor(private readonly emailService: EmailService) {}

  async sendMessage(contactDto: ContactDto) {
    const { name, email, message } = contactDto;

    await this.emailService.sendContactMessage({
      to: 'hello@henzo.app',
      subject: `New Beta Request from ${name}`,
      template: 'contact-message',
      context: {
        name,
        email,
        message,
        timestamp: new Date().toLocaleString(),
      },
    });

    return {
      success: true,
      message:
        'Your message has been sent successfully. We will get back to you soon!',
    };
  }

  async sendAppFeedback(contactDto: ContactDto) {
    const { name, email, message } = contactDto;
    const sent = await this.notifyTelegram({ name, email, message });
    if (!sent) {
      throw new ServiceUnavailableException(
        'Feedback delivery is not configured. Please try again later.',
      );
    }

    return {
      success: true,
      message: 'Your feedback has been sent. Thank you!',
    };
  }

  private async notifyTelegram(payload: {
    name: string;
    email: string;
    message: string;
  }): Promise<boolean> {
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const chatId = process.env.TELEGRAM_FEEDBACK_CHAT_ID?.trim();
    if (!token || !chatId) return false;

    const text = [
      '📱 Henzo app feedback',
      '',
      `👤 ${payload.name}`,
      `✉️ ${payload.email}`,
      '',
      payload.message,
    ].join('\n');

    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: text.slice(0, 4096),
          }),
        },
      );
      if (!res.ok) {
        const body = await res.text();
        console.error('Telegram feedback notify failed:', body);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Telegram feedback notify error:', error);
      return false;
    }
  }
}
