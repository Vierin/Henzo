import type { ClientEmailLocale } from './client-email-locale';

export type BookingPendingStrings = {
  headerTitle: string;
  headerSubtitle: string;
  awaitingTitle: string;
  awaitingLead: string;
  withinHours: string;
  outsideHours: string;
  requestedDetails: string;
  salonBlockTitle: string;
  whatsNext: string;
  bullet1: string;
  bullet2: string;
  bullet3: string;
  footer: string;
  subject: string;
  minutes: string;
  service: string;
  dateTime: string;
  duration: string;
  price: string;
  staff: string;
  salonLabel: string;
  address: string;
  phone: string;
};

export const BOOKING_PENDING_STRINGS: Record<
  ClientEmailLocale,
  BookingPendingStrings
> = {
  en: {
    headerTitle: 'Booking Request Received!',
    headerSubtitle: "We've received your booking request",
    awaitingTitle: 'Awaiting Salon Confirmation',
    awaitingLead: 'Your booking request has been sent to',
    withinHours:
      "Usually the salon confirms the booking within 2 hours. We'll notify you as soon as the salon confirms your appointment.",
    outsideHours:
      '<strong>The salon will confirm your booking when they open.</strong>',
    requestedDetails: 'Requested Appointment Details',
    salonBlockTitle: 'Salon Information',
    whatsNext: "What's Next?",
    bullet1: 'The salon will review your request',
    bullet2: "You'll receive a confirmation email once approved",
    bullet3: 'If there are any issues, the salon will contact you directly',
    footer: 'This is an automated message. Please do not reply to this email.',
    subject: 'Booking Request Received - {salonName}',
    minutes: 'minutes',
    service: 'Service',
    dateTime: 'Date & Time',
    duration: 'Duration',
    price: 'Price',
    staff: 'Staff',
    salonLabel: 'Salon:',
    address: 'Address:',
    phone: 'Phone:',
  },
  ru: {
    headerTitle: 'Запрос на бронирование получен!',
    headerSubtitle: 'Мы получили ваш запрос на бронирование',
    awaitingTitle: 'Ожидается подтверждение салона',
    awaitingLead: 'Ваш запрос отправлен в',
    withinHours:
      'Обычно салон подтверждает запись в течение 2 часов. Мы уведомим вас, как только запись будет подтверждена.',
    outsideHours:
      '<strong>Салон подтвердит запись, когда будет открыт.</strong>',
    requestedDetails: 'Детали запрошенной записи',
    salonBlockTitle: 'Информация о салоне',
    whatsNext: 'Что дальше?',
    bullet1: 'Салон рассмотрит ваш запрос',
    bullet2: 'После подтверждения вы получите письмо',
    bullet3: 'При необходимости салон свяжется с вами напрямую',
    footer:
      'Это автоматическое сообщение. Пожалуйста, не отвечайте на это письмо.',
    subject: 'Запрос на бронирование получен - {salonName}',
    minutes: 'мин',
    service: 'Услуга',
    dateTime: 'Дата и время',
    duration: 'Длительность',
    price: 'Цена',
    staff: 'Специалист',
    salonLabel: 'Салон:',
    address: 'Адрес:',
    phone: 'Телефон:',
  },
  vi: {
    headerTitle: 'Đã nhận yêu cầu đặt chỗ!',
    headerSubtitle: 'Chúng tôi đã nhận yêu cầu đặt chỗ của bạn',
    awaitingTitle: 'Đang chờ salon xác nhận',
    awaitingLead: 'Yêu cầu của bạn đã được gửi đến',
    withinHours:
      'Thông thường salon xác nhận trong vòng 2 giờ. Chúng tôi sẽ thông báo ngay khi salon xác nhận lịch hẹn.',
    outsideHours: '<strong>Salon sẽ xác nhận khi mở cửa.</strong>',
    requestedDetails: 'Chi tiết lịch hẹn đã yêu cầu',
    salonBlockTitle: 'Thông tin salon',
    whatsNext: 'Tiếp theo?',
    bullet1: 'Salon sẽ xem xét yêu cầu của bạn',
    bullet2: 'Bạn sẽ nhận email xác nhận sau khi được duyệt',
    bullet3: 'Nếu cần, salon sẽ liên hệ trực tiếp với bạn',
    footer: 'Đây là tin nhắn tự động. Vui lòng không trả lời email này.',
    subject: 'Đã nhận yêu cầu đặt chỗ - {salonName}',
    minutes: 'phút',
    service: 'Dịch vụ',
    dateTime: 'Ngày & Giờ',
    duration: 'Thời lượng',
    price: 'Giá',
    staff: 'Nhân viên',
    salonLabel: 'Salon:',
    address: 'Địa chỉ:',
    phone: 'Điện thoại:',
  },
};
