import type { ClientEmailLocale } from './client-email-locale';

export type BookingReminderStrings = {
  pageTitle: string;
  greeting: string;
  headerTitle: string;
  headerSubtitleBefore: string;
  headerSubtitleAfter: string;
  reminderTitle: string;
  reminderLead: string;
  appointmentDetails: string;
  salonInfo: string;
  importantLabel: string;
  importantBody: string;
  rescheduleLine: string;
  footer: string;
  subject: string;
  minutes: string;
  service: string;
  dateTime: string;
  duration: string;
  price: string;
  staff: string;
  salon: string;
  address: string;
  phone: string;
};

export const BOOKING_REMINDER_STRINGS: Record<
  ClientEmailLocale,
  BookingReminderStrings
> = {
  en: {
    pageTitle: 'Appointment Reminder',
    greeting: 'Hello,',
    headerTitle: 'Appointment Reminder',
    headerSubtitleBefore: 'Your appointment at',
    headerSubtitleAfter: 'is coming up!',
    reminderTitle: "Don't forget!",
    reminderLead:
      'Your appointment is scheduled soon. We look forward to seeing you!',
    appointmentDetails: 'Appointment Details',
    salonInfo: 'Salon Information',
    importantLabel: 'Important:',
    importantBody:
      'Please arrive 5-10 minutes before your appointment time.',
    rescheduleLine:
      'If you need to reschedule or cancel, please contact the salon directly as soon as possible.',
    footer: 'This is an automated reminder. Please do not reply to this email.',
    subject: 'Appointment Reminder - {salonName}',
    minutes: 'minutes',
    service: 'Service',
    dateTime: 'Date & Time',
    duration: 'Duration',
    price: 'Price',
    staff: 'Staff',
    salon: 'Salon:',
    address: 'Address:',
    phone: 'Phone:',
  },
  ru: {
    pageTitle: 'Напоминание о записи',
    greeting: 'Здравствуйте!',
    headerTitle: 'Напоминание о записи',
    headerSubtitleBefore: 'Ваша запись в',
    headerSubtitleAfter: 'скоро!',
    reminderTitle: 'Не забудьте!',
    reminderLead: 'Ваша запись скоро состоится. Будем рады видеть вас!',
    appointmentDetails: 'Детали записи',
    salonInfo: 'Информация о салоне',
    importantLabel: 'Важно:',
    importantBody:
      'Пожалуйста, приходите за 5–10 минут до времени записи.',
    rescheduleLine:
      'Чтобы перенести или отменить запись, свяжитесь с салоном как можно скорее.',
    footer:
      'Это автоматическое напоминание. Пожалуйста, не отвечайте на это письмо.',
    subject: 'Напоминание о записи - {salonName}',
    minutes: 'мин',
    service: 'Услуга',
    dateTime: 'Дата и время',
    duration: 'Длительность',
    price: 'Цена',
    staff: 'Специалист',
    salon: 'Салон:',
    address: 'Адрес:',
    phone: 'Телефон:',
  },
  vi: {
    pageTitle: 'Nhắc lịch hẹn',
    greeting: 'Xin chào,',
    headerTitle: 'Nhắc lịch hẹn',
    headerSubtitleBefore: 'Lịch hẹn của bạn tại',
    headerSubtitleAfter: 'sắp tới!',
    reminderTitle: 'Đừng quên!',
    reminderLead: 'Lịch hẹn của bạn sắp đến. Hẹn gặp bạn!',
    appointmentDetails: 'Chi tiết lịch hẹn',
    salonInfo: 'Thông tin salon',
    importantLabel: 'Lưu ý:',
    importantBody: 'Vui lòng đến trước 5-10 phút so với giờ hẹn.',
    rescheduleLine:
      'Nếu cần đổi lịch hoặc hủy, vui lòng liên hệ salon sớm nhất có thể.',
    footer: 'Đây là nhắc nhở tự động. Vui lòng không trả lời email này.',
    subject: 'Nhắc lịch hẹn - {salonName}',
    minutes: 'phút',
    service: 'Dịch vụ',
    dateTime: 'Ngày & Giờ',
    duration: 'Thời lượng',
    price: 'Giá',
    staff: 'Nhân viên',
    salon: 'Salon:',
    address: 'Địa chỉ:',
    phone: 'Điện thoại:',
  },
};
