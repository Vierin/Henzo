import type { ClientEmailLocale } from './client-email-locale';

export type MagicLinkConfirmationStrings = {
  pageTitle: string;
  headerTitle: string;
  headerSubtitle: string;
  greeting: string;
  bodyHtml: string;
  buttonConfirm: string;
  detailsTitle: string;
  serviceLabel: string;
  dateTimeLabel: string;
  salonLabel: string;
  importantLabel: string;
  expiryLine: string;
  ignoreLine: string;
  fallbackLinkText: string;
  footer: string;
  subject: string;
};

/** {salonName} in subject; bodyHtml uses ${data.salonName} in template */
export const MAGIC_LINK_CONFIRMATION_STRINGS: Record<
  ClientEmailLocale,
  MagicLinkConfirmationStrings
> = {
  en: {
    pageTitle: 'Confirm Your Booking',
    headerTitle: '📧 Confirm Your Booking',
    headerSubtitle: 'Click the link below to complete your reservation',
    greeting: 'Hello!',
    bodyHtml:
      "<p>You've requested to book an appointment at <strong>{salonName}</strong>. Please confirm your booking by clicking the button below:</p>",
    buttonConfirm: 'Confirm Booking',
    detailsTitle: 'Booking Details',
    serviceLabel: 'Service:',
    dateTimeLabel: 'Date & Time:',
    salonLabel: 'Salon:',
    importantLabel: 'Important:',
    expiryLine: 'This confirmation link will expire in 1 hour.',
    ignoreLine: "If you didn't request this booking, please ignore this email.",
    fallbackLinkText:
      "If the button doesn't work, copy and paste this link into your browser:",
    footer: 'This is an automated message. Please do not reply to this email.',
    subject: 'Confirm Your Booking - {salonName}',
  },
  ru: {
    pageTitle: 'Подтвердите бронирование',
    headerTitle: '📧 Подтвердите бронирование',
    headerSubtitle: 'Нажмите на ссылку ниже, чтобы завершить запись',
    greeting: 'Здравствуйте!',
    bodyHtml:
      '<p>Вы оформили запись в <strong>{salonName}</strong>. Подтвердите бронирование, нажав кнопку ниже:</p>',
    buttonConfirm: 'Подтвердить запись',
    detailsTitle: 'Детали записи',
    serviceLabel: 'Услуга:',
    dateTimeLabel: 'Дата и время:',
    salonLabel: 'Салон:',
    importantLabel: 'Важно:',
    expiryLine: 'Ссылка для подтверждения действует 1 час.',
    ignoreLine:
      'Если вы не оформляли запись, просто проигнорируйте это письмо.',
    fallbackLinkText: 'Если кнопка не работает, скопируйте ссылку в браузер:',
    footer:
      'Это автоматическое сообщение. Пожалуйста, не отвечайте на это письмо.',
    subject: 'Подтверждение записи - {salonName}',
  },
  vi: {
    pageTitle: 'Xác nhận đặt chỗ',
    headerTitle: '📧 Xác nhận đặt chỗ',
    headerSubtitle: 'Nhấp vào liên kết bên dưới để hoàn tất đặt chỗ',
    greeting: 'Xin chào!',
    bodyHtml:
      '<p>Bạn đã yêu cầu đặt lịch tại <strong>{salonName}</strong>. Vui lòng xác nhận bằng cách nhấn nút bên dưới:</p>',
    buttonConfirm: 'Xác nhận đặt chỗ',
    detailsTitle: 'Chi tiết lịch hẹn',
    serviceLabel: 'Dịch vụ:',
    dateTimeLabel: 'Ngày & giờ:',
    salonLabel: 'Salon:',
    importantLabel: 'Lưu ý:',
    expiryLine: 'Liên kết xác nhận hết hạn sau 1 giờ.',
    ignoreLine: 'Nếu bạn không yêu cầu đặt chỗ, vui lòng bỏ qua email này.',
    fallbackLinkText:
      'Nếu nút không hoạt động, sao chép liên kết sau vào trình duyệt:',
    footer: 'Đây là tin nhắn tự động. Vui lòng không trả lời email này.',
    subject: 'Xác nhận đặt chỗ - {salonName}',
  },
};
