export const notificationTranslations = {
  en: {
    newBookingConfirmed: 'New reservation',
    booked: 'Booked',
    bookingCancelled: 'Booking Cancelled',
    cancelledBy: 'Cancelled by',
    classBookingTitle: 'New class booking',
    classBookingBody: '{client} booked {class}',
  },
  ru: {
    newBookingConfirmed: 'Новая запись',
    booked: 'Записано',
    bookingCancelled: 'Бронирование отменено',
    cancelledBy: 'Отменено',
    classBookingTitle: 'Новая запись на занятие',
    classBookingBody: '{client} записался(ась) на {class}',
  },
  vi: {
    newBookingConfirmed: 'Đặt lịch mới',
    booked: 'Đã đặt',
    bookingCancelled: 'Đặt lịch đã bị hủy',
    cancelledBy: 'Đã hủy bởi',
    classBookingTitle: 'Đặt chỗ lớp học mới',
    classBookingBody: '{client} đã đặt {class}',
  },
};

export function getNotificationText(
  language: string,
  key: keyof typeof notificationTranslations.en,
): string {
  const lang = (language || 'en').toLowerCase();
  const translations =
    notificationTranslations[lang as keyof typeof notificationTranslations] ||
    notificationTranslations.en;
  return translations[key] || notificationTranslations.en[key];
}

export function formatNotificationTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}
