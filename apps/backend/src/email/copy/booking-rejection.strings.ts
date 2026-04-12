import type { ClientEmailLocale } from './client-email-locale';

export type BookingRejectionStrings = {
  pageTitle: string;
  greeting: string;
  headerTitle: string;
  headerSubtitle: string;
  rejectionTitle: string;
  rejectionLeadBefore: string;
  rejectionLeadAfter: string;
  reasonLabel: string;
  requestedDetails: string;
  salonContact: string;
  whatCanYouDo: string;
  bullet1: string;
  bullet2: string;
  bullet3: string;
  apology: string;
  footerThankYou: string;
  footerAuto: string;
  subject: string;
  service: string;
  dateTime: string;
  salon: string;
  phone: string;
};

export const BOOKING_REJECTION_STRINGS: Record<
  ClientEmailLocale,
  BookingRejectionStrings
> = {
  en: {
    pageTitle: 'Booking Request Update',
    greeting: 'Hello,',
    headerTitle: 'Booking Request Update',
    headerSubtitle: 'Update regarding your appointment request',
    rejectionTitle: 'Booking Request Not Confirmed',
    rejectionLeadBefore: 'Unfortunately,',
    rejectionLeadAfter: 'was unable to confirm your booking request.',
    reasonLabel: 'Reason:',
    requestedDetails: 'Requested Appointment Details',
    salonContact: 'Salon Contact',
    whatCanYouDo: 'What Can You Do?',
    bullet1: 'Try booking a different time slot',
    bullet2: 'Contact the salon directly for more information',
    bullet3: 'Explore other available services',
    apology:
      'We apologize for any inconvenience. Please feel free to make another booking request or contact the salon directly.',
    footerThankYou: 'Thank you for using Henzo Booking System',
    footerAuto:
      'This is an automated message. Please do not reply to this email.',
    subject: 'Booking Request Update - {salonName}',
    service: 'Service',
    dateTime: 'Date & Time',
    salon: 'Salon:',
    phone: 'Phone:',
  },
  ru: {
    pageTitle: 'Обновление по запросу',
    greeting: 'Здравствуйте!',
    headerTitle: 'Обновление по запросу',
    headerSubtitle: 'Информация о вашем запросе на запись',
    rejectionTitle: 'Запрос не подтверждён',
    rejectionLeadBefore: 'К сожалению,',
    rejectionLeadAfter: 'не смог подтвердить вашу запись.',
    reasonLabel: 'Причина:',
    requestedDetails: 'Детали запрошенной записи',
    salonContact: 'Контакты салона',
    whatCanYouDo: 'Что можно сделать?',
    bullet1: 'Выберите другое время',
    bullet2: 'Свяжитесь с салоном напрямую',
    bullet3: 'Посмотрите другие услуги',
    apology:
      'Приносим извинения за неудобства. Вы можете оформить новый запрос или связаться с салоном.',
    footerThankYou: 'Спасибо, что пользуетесь Henzo',
    footerAuto:
      'Это автоматическое сообщение. Пожалуйста, не отвечайте на это письмо.',
    subject: 'Обновление по запросу - {salonName}',
    service: 'Услуга',
    dateTime: 'Дата и время',
    salon: 'Салон:',
    phone: 'Телефон:',
  },
  vi: {
    pageTitle: 'Cập nhật yêu cầu đặt chỗ',
    greeting: 'Xin chào,',
    headerTitle: 'Cập nhật yêu cầu đặt chỗ',
    headerSubtitle: 'Thông tin về yêu cầu lịch hẹn của bạn',
    rejectionTitle: 'Chưa xác nhận đặt chỗ',
    rejectionLeadBefore: 'Rất tiếc,',
    rejectionLeadAfter: 'không thể xác nhận yêu cầu đặt chỗ của bạn.',
    reasonLabel: 'Lý do:',
    requestedDetails: 'Chi tiết lịch hẹn đã yêu cầu',
    salonContact: 'Liên hệ salon',
    whatCanYouDo: 'Bạn có thể làm gì?',
    bullet1: 'Thử đặt khung giờ khác',
    bullet2: 'Liên hệ trực tiếp với salon',
    bullet3: 'Xem các dịch vụ khác',
    apology:
      'Xin lỗi vì sự bất tiện. Bạn có thể đặt lại hoặc liên hệ salon trực tiếp.',
    footerThankYou: 'Cảm ơn bạn đã sử dụng Henzo',
    footerAuto: 'Đây là tin nhắn tự động. Vui lòng không trả lời email này.',
    subject: 'Cập nhật yêu cầu đặt chỗ - {salonName}',
    service: 'Dịch vụ',
    dateTime: 'Ngày & Giờ',
    salon: 'Salon:',
    phone: 'Điện thoại:',
  },
};
