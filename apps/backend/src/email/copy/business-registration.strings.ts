import type { ClientEmailLocale } from './client-email-locale';

export type BusinessRegistrationStrings = {
  pageTitle: string;
  headerTitle: string;
  greeting: string;
  intro: string;
  buttonLabel: string;
  fallbackText: string;
  expiryText: string;
  ignoreText: string;
  footerText: string;
  subject: string;
};

export const BUSINESS_REGISTRATION_STRINGS: Record<
  ClientEmailLocale,
  BusinessRegistrationStrings
> = {
  en: {
    pageTitle: 'Complete Your Business Registration - Henzo',
    headerTitle: '🚀 Complete Your Business Registration',
    greeting: 'Hi {name},',
    intro:
      'Thank you for your interest in Henzo! Click the button below to complete your business account registration:',
    buttonLabel: 'Complete Registration',
    fallbackText: 'Or copy and paste this link into your browser:',
    expiryText: 'This link will expire in 24 hours.',
    ignoreText:
      "If you didn't request this registration, please ignore this email.",
    footerText:
      'This is an automated message from Henzo. Please do not reply to this email.',
    subject: 'Complete Your Business Registration - Henzo',
  },
  ru: {
    pageTitle: 'Завершите регистрацию бизнеса - Henzo',
    headerTitle: '🚀 Завершите регистрацию бизнеса',
    greeting: 'Здравствуйте, {name}!',
    intro:
      'Спасибо за интерес к Henzo! Нажмите кнопку ниже, чтобы завершить регистрацию бизнес-аккаунта:',
    buttonLabel: 'Завершить регистрацию',
    fallbackText: 'Или скопируйте и вставьте эту ссылку в браузер:',
    expiryText: 'Ссылка действует 24 часа.',
    ignoreText:
      'Если вы не запрашивали регистрацию, просто проигнорируйте это письмо.',
    footerText:
      'Это автоматическое сообщение от Henzo. Пожалуйста, не отвечайте на это письмо.',
    subject: 'Завершите регистрацию бизнеса - Henzo',
  },
  vi: {
    pageTitle: 'Hoàn tất đăng ký doanh nghiệp - Henzo',
    headerTitle: '🚀 Hoàn tất đăng ký doanh nghiệp',
    greeting: 'Xin chào {name},',
    intro:
      'Cảm ơn bạn đã quan tâm đến Henzo! Nhấn nút bên dưới để hoàn tất đăng ký tài khoản doanh nghiệp:',
    buttonLabel: 'Hoàn tất đăng ký',
    fallbackText: 'Hoặc sao chép và dán liên kết này vào trình duyệt:',
    expiryText: 'Liên kết này sẽ hết hạn sau 24 giờ.',
    ignoreText: 'Nếu bạn không yêu cầu đăng ký, vui lòng bỏ qua email này.',
    footerText:
      'Đây là email tự động từ Henzo. Vui lòng không trả lời email này.',
    subject: 'Hoàn tất đăng ký doanh nghiệp - Henzo',
  },
};
