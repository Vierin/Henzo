import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type BrevoSendPayload = {
  to: { email: string; name: string }[];
  sender: { email: string; name: string };
  subject: string;
  htmlContent: string;
};

@Injectable()
export class BrevoEmailDeliveryService {
  private readonly brevoApiKey: string;
  private readonly brevoApiUrl = 'https://api.brevo.com/v3/smtp/email';

  constructor(private readonly configService: ConfigService) {
    this.brevoApiKey = this.configService.get<string>('BREVO_API_KEY') || '';
    if (this.brevoApiKey) {
      console.log('✅ Brevo initialized');
    } else {
      console.warn('⚠️ BREVO_API_KEY not found in environment variables');
    }
  }

  get hasApiKey(): boolean {
    return !!this.brevoApiKey;
  }

  async send(emailData: BrevoSendPayload): Promise<unknown> {
    if (!this.brevoApiKey) {
      console.error(
        '❌ BREVO_API_KEY is not configured. Email cannot be sent.',
      );
      throw new Error('BREVO_API_KEY is not configured');
    }

    const recipientEmails = emailData.to.map((recipient) => recipient.email);
    console.log('📧 Attempting to send email via Brevo:', {
      to: recipientEmails,
      subject: emailData.subject,
      hasApiKey: !!this.brevoApiKey,
    });

    const response = await fetch(this.brevoApiUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'api-key': this.brevoApiKey,
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      const errorData = await response.text();
      let errorMessage = `Brevo API error: ${response.status} - ${errorData}`;

      if (response.status === 401) {
        try {
          const errorJson = JSON.parse(errorData);
          if (
            errorJson.code === 'unauthorized' &&
            errorJson.message?.includes('IP address')
          ) {
            errorMessage = `Brevo IP authorization required: ${errorJson.message}. Please add your IP address at https://app.brevo.com/security/authorised_ips`;
            console.error('❌ Brevo IP authorization error:', errorMessage);
          }
        } catch {
          // keep original message
        }
      }

      console.error('❌ Brevo API error response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('✅ Email sent via Brevo successfully:', {
      messageId: result.messageId,
      to: recipientEmails,
    });
    return result;
  }

  async testAccountConnection(): Promise<boolean> {
    if (!this.brevoApiKey) {
      console.error('❌ Brevo API key not configured');
      return false;
    }

    const response = await fetch('https://api.brevo.com/v3/account', {
      headers: {
        Accept: 'application/json',
        'api-key': this.brevoApiKey,
      },
    });

    if (response.ok) {
      console.log('✅ Brevo API connection verified');
      return true;
    }
    console.error('❌ Brevo API connection failed:', response.status);
    return false;
  }
}
