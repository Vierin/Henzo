/// Fallback copy when bundled app.json is stale (e.g. after hot reload).
const Map<String, Map<String, String>> clientStudioDetailDefaults = {
  'en': {
    'shareInvite': '{name} invites you to check out {studio} on Henzo',
    'share': 'Share',
    'addressCopied': 'Address copied',
    'readMore': 'Show more',
    'readLess': 'Read less',
    'viewSchedule': 'View schedule',
    'viewScheduleSubtitle': 'See all classes and book',
    'reviewsTitle': 'Reviews',
    'reviewsSeeMore': 'See more',
    'reviewsRating': '{rating} ({count} reviews)',
    'reviewsDaysAgo': '{count} days ago',
    'reviewsHoursAgo': '{count} h ago',
    'reviewsJustNow': 'Just now',
    'reviewsOnCount': 'on {count} reviews',
    'upcomingClassesTitle': 'Upcoming classes',
  },
  'ru': {
    'shareInvite': '{name} приглашает вас посмотреть {studio} в Henzo',
    'share': 'Поделиться',
    'addressCopied': 'Адрес скопирован',
    'readMore': 'Показать ещё',
    'readLess': 'Свернуть',
    'viewSchedule': 'Расписание',
    'viewScheduleSubtitle': 'Все занятия и слоты',
    'reviewsTitle': 'Отзывы',
    'reviewsSeeMore': 'Ещё',
    'reviewsRating': '{rating} ({count} отзывов)',
    'reviewsDaysAgo': '{count} дн. назад',
    'reviewsHoursAgo': '{count} ч. назад',
    'reviewsJustNow': 'Только что',
    'reviewsOnCount': 'на {count} отзывов',
    'upcomingClassesTitle': 'Ближайшие занятия',
  },
  'vi': {
    'shareInvite': '{name} mời bạn xem {studio} trên Henzo',
    'share': 'Chia sẻ',
    'addressCopied': 'Đã sao chép địa chỉ',
    'readMore': 'Xem thêm',
    'readLess': 'Thu gọn',
    'viewSchedule': 'Xem lịch',
    'viewScheduleSubtitle': 'Tất cả lớp và khung giờ',
    'reviewsTitle': 'Đánh giá',
    'reviewsSeeMore': 'Xem thêm',
    'reviewsRating': '{rating} ({count} đánh giá)',
    'reviewsDaysAgo': '{count} ngày trước',
    'reviewsHoursAgo': '{count} giờ trước',
    'reviewsJustNow': 'Vừa xong',
    'reviewsOnCount': 'trên {count} đánh giá',
    'upcomingClassesTitle': 'Lớp sắp tới',
  },
};

void mergeClientStudioDetailDefaults(
  Map<String, dynamic> strings,
  String localeCode,
) {
  final defaults =
      clientStudioDetailDefaults[localeCode] ??
      clientStudioDetailDefaults['en']!;
  final raw = strings['clientStudioDetail'];
  final merged = raw is Map
      ? Map<String, dynamic>.from(raw)
      : <String, dynamic>{};
  for (final entry in defaults.entries) {
    merged.putIfAbsent(entry.key, () => entry.value);
  }
  strings['clientStudioDetail'] = merged;
}
