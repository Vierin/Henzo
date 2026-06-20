export const notificationTranslations = {
  en: {
    newBookingConfirmed: 'New reservation',
    booked: 'Booked',
    bookingCancelled: 'Booking Cancelled',
    cancelledBy: 'Cancelled by',
    classBookingTitle: 'New class booking',
    classBookingBody: '{client} booked {class}',
    reminder24hTitle: 'Class reminder — tomorrow',
    reminder24hBody: '{class} at {studio} starts tomorrow at {time}',
    reminder1hTitle: 'Class starts in 1 hour',
    reminder1hBody: '{class} at {studio} starts at {time}',
    waitlistPromotedTitle: 'Spot opened up!',
    waitlistPromotedBody:
      'A spot opened in {class} at {studio}. You are now booked!',
    ownerBookedTitle: "You're booked",
    ownerBookedBody: '{studio} booked you for {class} on {date}.',
    sessionCancelledTitle: 'Class cancelled',
    sessionCancelledBody: '{class} at {studio} on {date} has been cancelled.',
    sessionRescheduledTitle: 'Class time changed',
    sessionRescheduledBody: '{class} at {studio} moved to {date}.',
    newReviewTitle: 'New review ⭐',
    newReviewBody: '{client} left a {rating}★ review for {studio}',
  },
  ru: {
    newBookingConfirmed: 'Новая запись',
    booked: 'Записано',
    bookingCancelled: 'Бронирование отменено',
    cancelledBy: 'Отменено',
    classBookingTitle: 'Новая запись на занятие',
    classBookingBody: '{client} записался(ась) на {class}',
    reminder24hTitle: 'Напоминание — завтра занятие',
    reminder24hBody: '{class} в {studio} начинается завтра в {time}',
    reminder1hTitle: 'Занятие начнётся через 1 час',
    reminder1hBody: '{class} в {studio} начинается в {time}',
    waitlistPromotedTitle: 'Появилось место!',
    waitlistPromotedBody:
      'Место в {class} в {studio} освободилось. Вы записаны!',
    ownerBookedTitle: 'Вас записали',
    ownerBookedBody: '{studio} записал(а) вас на {class} — {date}.',
    sessionCancelledTitle: 'Занятие отменено',
    sessionCancelledBody: '{class} в {studio} {date} отменено.',
    sessionRescheduledTitle: 'Время занятия изменено',
    sessionRescheduledBody: '{class} в {studio} перенесено на {date}.',
    newReviewTitle: 'Новый отзыв ⭐',
    newReviewBody: '{client} оставил(а) отзыв {rating}★ о студии {studio}',
  },
  vi: {
    newBookingConfirmed: 'Đặt lịch mới',
    booked: 'Đã đặt',
    bookingCancelled: 'Đặt lịch đã bị hủy',
    cancelledBy: 'Đã hủy bởi',
    classBookingTitle: 'Đặt chỗ lớp học mới',
    classBookingBody: '{client} đã đặt {class}',
    reminder24hTitle: 'Nhắc nhở — ngày mai có lớp',
    reminder24hBody: '{class} tại {studio} bắt đầu vào ngày mai lúc {time}',
    reminder1hTitle: 'Lớp học bắt đầu sau 1 giờ',
    reminder1hBody: '{class} tại {studio} bắt đầu lúc {time}',
    waitlistPromotedTitle: 'Có chỗ trống!',
    waitlistPromotedBody:
      'Có chỗ trống trong {class} tại {studio}. Bạn đã được đặt chỗ!',
    ownerBookedTitle: 'Bạn đã được đặt chỗ',
    ownerBookedBody: '{studio} đã đặt chỗ cho bạn vào {class} — {date}.',
    sessionCancelledTitle: 'Lớp học đã bị hủy',
    sessionCancelledBody: '{class} tại {studio} ngày {date} đã bị hủy.',
    sessionRescheduledTitle: 'Thay đổi thời gian lớp học',
    sessionRescheduledBody: '{class} tại {studio} đã được dời sang {date}.',
    newReviewTitle: 'Đánh giá mới ⭐',
    newReviewBody: '{client} đã để lại đánh giá {rating}★ cho {studio}',
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
