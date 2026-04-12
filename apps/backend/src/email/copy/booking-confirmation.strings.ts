import type { ClientEmailLocale } from './client-email-locale';

export type BookingConfirmationStrings = {
  title: string;
  subtitle: string;
  thankYou: string;
  appointmentDetails: string;
  service: string;
  dateTime: string;
  duration: string;
  minutes: string;
  price: string;
  staff: string;
  salonInfo: string;
  name: string;
  address: string;
  phone: string;
  notProvided: string;
  important: string;
  rescheduleNote: string;
  addToCalendar: string;
  getDirections: string;
  importantLabel: string;
  footer: string;
  subject: string;
};

export const BOOKING_CONFIRMATION_STRINGS: Record<
  ClientEmailLocale,
  BookingConfirmationStrings
> = {
  en: {
    title: 'Booking Confirmed!',
    subtitle: 'Your appointment at {salonName} has been confirmed',
    thankYou:
      'Thank you for booking with us. Here are your appointment details:',
    appointmentDetails: 'Appointment Details',
    service: 'Service',
    dateTime: 'Date & Time',
    duration: 'Duration',
    minutes: 'minutes',
    price: 'Price',
    staff: 'Staff',
    salonInfo: 'Salon Information',
    name: 'Name',
    address: 'Address',
    phone: 'Phone',
    notProvided: 'Not provided',
    important: 'Please arrive 5-10 minutes before your appointment time.',
    rescheduleNote:
      'If you need to reschedule or cancel, please contact the salon directly.',
    addToCalendar: 'Add to Google Calendar',
    getDirections: 'Get Directions',
    importantLabel: 'Important:',
    footer:
      'This is an automated message. Please do not reply to this email.',
    subject: 'Booking Confirmation - {salonName}',
  },
  ru: {
    title: 'Бронирование подтверждено!',
    subtitle: 'Ваша запись в {salonName} подтверждена',
    thankYou: 'Спасибо за бронирование. Детали записи:',
    appointmentDetails: 'Детали записи',
    service: 'Услуга',
    dateTime: 'Дата и время',
    duration: 'Длительность',
    minutes: 'мин',
    price: 'Цена',
    staff: 'Специалист',
    salonInfo: 'Информация о салоне',
    name: 'Название',
    address: 'Адрес',
    phone: 'Телефон',
    notProvided: 'Не указано',
    important: 'Пожалуйста, приходите за 5–10 минут до времени записи.',
    rescheduleNote:
      'Чтобы перенести или отменить запись, свяжитесь с салоном напрямую.',
    addToCalendar: 'Добавить в Google Календарь',
    getDirections: 'Как добраться',
    importantLabel: 'Важно:',
    footer:
      'Это автоматическое сообщение. Пожалуйста, не отвечайте на это письмо.',
    subject: 'Подтверждение бронирования - {salonName}',
  },
  vi: {
    title: 'Đặt chỗ đã được xác nhận!',
    subtitle: 'Lịch hẹn của bạn tại {salonName} đã được xác nhận',
    thankYou: 'Cảm ơn bạn đã đặt chỗ. Chi tiết lịch hẹn:',
    appointmentDetails: 'Chi tiết lịch hẹn',
    service: 'Dịch vụ',
    dateTime: 'Ngày & Giờ',
    duration: 'Thời lượng',
    minutes: 'phút',
    price: 'Giá',
    staff: 'Nhân viên',
    salonInfo: 'Thông tin salon',
    name: 'Tên',
    address: 'Địa chỉ',
    phone: 'Điện thoại',
    notProvided: 'Chưa cung cấp',
    important: 'Vui lòng đến trước 5-10 phút so với giờ hẹn.',
    rescheduleNote:
      'Nếu cần đổi lịch hoặc hủy, vui lòng liên hệ trực tiếp với salon.',
    addToCalendar: 'Thêm vào Google Calendar',
    getDirections: 'Chỉ đường',
    importantLabel: 'Lưu ý:',
    footer: 'Đây là tin nhắn tự động. Vui lòng không trả lời email này.',
    subject: 'Xác nhận đặt chỗ - {salonName}',
  },
};
