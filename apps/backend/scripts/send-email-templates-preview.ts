/**
 * Send all Henzo email templates to a test inbox for visual review.
 * Usage: node scripts/run-with-env.mjs npx tsx scripts/send-email-templates-preview.ts [email]
 */
import {
  BOOKING_CONFIRMATION_STRINGS,
  BOOKING_REMINDER_STRINGS,
} from '../src/email/copy';
import {
  renderBookingConfirmationHtml,
  renderBookingReminderHtml,
} from '../src/email/templates/client-booking-templates';
import {
  renderContactMessageHtml,
  renderOtpEmailHtml,
  renderTrainerInviteHtml,
} from '../src/email/templates/transactional-email-templates';
import {
  formatVnd,
  generateGoogleCalendarUrl,
  generateGoogleMapsUrl,
} from '../src/email/email-helpers';

const TARGET_EMAIL = process.argv[2] || 'ivanvierin@gmail.com';
const FILTER = process.argv[3]?.toLowerCase();
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@henzo.app';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'Henzo';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://henzo.app';

const SAMPLE_BOOKING = {
  serviceName: 'Стрижка + укладка',
  date: '25 июня 2026',
  time: '14:30',
  duration: 90,
  price: 450_000,
  salonName: 'Beauty Studio Henzo',
  salonAddress: '12 Nguyễn Huệ, Quận 1, Ho Chi Minh City',
  salonPhone: '+84 90 123 4567',
  staffName: 'Анна',
  dateTime: new Date('2026-06-25T07:30:00.000Z'),
  salonTimezone: 'Asia/Ho_Chi_Minh',
};

type TemplateItem = { label: string; subject: string; html: string };

function buildTemplates(): TemplateItem[] {
  const priceFormatted = formatVnd(SAMPLE_BOOKING.price);
  const calendarUrl = generateGoogleCalendarUrl(SAMPLE_BOOKING);
  const mapsUrl = generateGoogleMapsUrl(SAMPLE_BOOKING.salonAddress);
  const locales = ['en', 'ru', 'vi'] as const;

  const items: TemplateItem[] = [
    {
      label: 'contact-message',
      subject: '[TEST] Contact form message',
      html: renderContactMessageHtml({
        name: 'Иван Вьерин',
        email: 'ivanvierin@gmail.com',
        message:
          'Здравствуйте! Хочу узнать о подключении салона к Henzo.\nМожно ли получить демо?',
        timestamp: new Date().toLocaleString('ru-RU'),
      }),
    },
    {
      label: 'otp-client',
      subject: '[TEST] OTP — client (RU)',
      html: renderOtpEmailHtml('482731', 'client', 'ru'),
    },
    {
      label: 'otp-owner',
      subject: '[TEST] OTP — business owner (RU)',
      html: renderOtpEmailHtml('482731', 'owner', 'ru'),
    },
    {
      label: 'trainer-invite',
      subject: `[TEST] Trainer invite (RU) — ${SAMPLE_BOOKING.salonName}`,
      html: renderTrainerInviteHtml(
        `${FRONTEND_URL}/trainer-invite/preview-token-abc123`,
        SAMPLE_BOOKING.salonName,
        'ru',
      ),
    },
  ];

  for (const locale of locales) {
    const confirmStrings = BOOKING_CONFIRMATION_STRINGS[locale];
    items.push({
      label: `booking-confirmation-${locale}`,
      subject: `[TEST] Booking confirmation (${locale.toUpperCase()}) — ${SAMPLE_BOOKING.salonName}`,
      html: renderBookingConfirmationHtml(
        confirmStrings,
        SAMPLE_BOOKING,
        priceFormatted,
        calendarUrl,
        mapsUrl,
      ),
    });
  }

  for (const locale of locales) {
    const reminderStrings = BOOKING_REMINDER_STRINGS[locale];
    items.push({
      label: `booking-reminder-${locale}`,
      subject: `[TEST] Booking reminder (${locale.toUpperCase()}) — ${SAMPLE_BOOKING.salonName}`,
      html: renderBookingReminderHtml(
        reminderStrings,
        SAMPLE_BOOKING,
        priceFormatted,
      ),
    });
  }

  return items;
}

async function sendEmail(subject: string, html: string): Promise<void> {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'api-key': BREVO_API_KEY,
    },
    body: JSON.stringify({
      to: [{ email: TARGET_EMAIL, name: 'Ivan' }],
      sender: { email: EMAIL_FROM, name: EMAIL_FROM_NAME },
      subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Brevo ${response.status}: ${errorText}`);
  }

  const result = (await response.json()) as { messageId?: string };
  console.log(`  ✅ sent (messageId: ${result.messageId ?? 'n/a'})`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  if (!BREVO_API_KEY) {
    console.error('❌ BREVO_API_KEY is not set. Check .env.local');
    process.exit(1);
  }

  const templates = buildTemplates().filter(
    (t) => !FILTER || t.label.includes(FILTER),
  );
  console.log(
    `📧 Sending ${templates.length} templates to ${TARGET_EMAIL}...\n`,
  );

  let sent = 0;
  for (const [index, template] of templates.entries()) {
    console.log(`[${index + 1}/${templates.length}] ${template.label}`);
    try {
      await sendEmail(template.subject, template.html);
      sent += 1;
      await sleep(500);
    } catch (error) {
      console.error(`  ❌ failed:`, error);
    }
  }

  console.log(`\nDone: ${sent}/${templates.length} sent to ${TARGET_EMAIL}`);
  if (sent < templates.length) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal:', error);
  process.exit(1);
});
