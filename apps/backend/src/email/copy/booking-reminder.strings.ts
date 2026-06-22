import type { ClientEmailLocale } from './client-email-locale';

export type BookingReminderStrings = {
  pageTitle: string;
  eyebrow: string;
  greetingBefore: string;
  greetingHighlight: string;
  subheading: string;
  withPrefix: string;
  arriveEarlyBefore: string;
  arriveEarlyHighlight: string;
  arriveEarlyAfter: string;
  addToCalendar: string;
  getDirections: string;
  closingTitle: string;
  footerTagline: string;
  subject: string;
  dateLabel: string;
  timeLabel: string;
  instructorLabel: string;
  locationLabel: string;
  minutes: string;
  defaultClientName: string;
};

export const BOOKING_REMINDER_STRINGS: Record<
  ClientEmailLocale,
  BookingReminderStrings
> = {
  en: {
    pageTitle: 'Class Reminder',
    eyebrow: 'BOOKING REMINDER',
    greetingBefore: 'Hi {name}, your class is ',
    greetingHighlight: 'tomorrow',
    subheading: 'Just a friendly reminder about your upcoming class.',
    withPrefix: 'with',
    arriveEarlyBefore: 'Arrive ',
    arriveEarlyHighlight: '10–15 min early',
    arriveEarlyAfter: ' to get settled and make the most of your session.',
    addToCalendar: 'Add to calendar',
    getDirections: 'Get directions',
    closingTitle: 'We can’t wait to see you!',
    footerTagline: 'Henzo — book fitness your way',
    subject: 'Class reminder — {salonName}',
    dateLabel: 'Date',
    timeLabel: 'Time',
    instructorLabel: 'Instructor',
    locationLabel: 'Location',
    minutes: 'min',
    defaultClientName: 'there',
  },
  ru: {
    pageTitle: 'Напоминание о занятии',
    eyebrow: 'НАПОМИНАНИЕ О ЗАПИСИ',
    greetingBefore: 'Привет, {name}! Занятие ',
    greetingHighlight: 'завтра',
    subheading: 'Напоминаем о вашем предстоящем занятии.',
    withPrefix: 'с',
    arriveEarlyBefore: 'Приходите ',
    arriveEarlyHighlight: 'за 10–15 минут',
    arriveEarlyAfter: ', чтобы спокойно подготовиться к занятию.',
    addToCalendar: 'Добавить в календарь',
    getDirections: 'Как добраться',
    closingTitle: 'Ждём вас!',
    footerTagline: 'Henzo — бронируйте фитнес удобно',
    subject: 'Напоминание о занятии — {salonName}',
    dateLabel: 'Дата',
    timeLabel: 'Время',
    instructorLabel: 'Тренер',
    locationLabel: 'Локация',
    minutes: 'мин',
    defaultClientName: 'друг',
  },
  vi: {
    pageTitle: 'Nhắc lịch tập',
    eyebrow: 'NHẮC LỊCH HẸN',
    greetingBefore: 'Chào {name}, lớp học của bạn là ',
    greetingHighlight: 'ngày mai',
    subheading: 'Nhắc bạn về buổi tập sắp tới.',
    withPrefix: 'với',
    arriveEarlyBefore: 'Hãy đến ',
    arriveEarlyHighlight: 'trước 10–15 phút',
    arriveEarlyAfter: ' để chuẩn bị và tận hưởng buổi tập.',
    addToCalendar: 'Thêm vào lịch',
    getDirections: 'Chỉ đường',
    closingTitle: 'Hẹn gặp bạn!',
    footerTagline: 'Henzo — đặt lịch fitness dễ dàng',
    subject: 'Nhắc lịch tập — {salonName}',
    dateLabel: 'Ngày',
    timeLabel: 'Giờ',
    instructorLabel: 'Huấn luyện viên',
    locationLabel: 'Địa điểm',
    minutes: 'phút',
    defaultClientName: 'bạn',
  },
};
