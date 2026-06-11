import '../models/studio.dart';
import '../widgets/settings/owner_booking_period_sheet.dart';

DateTime normalizeDateOnly(DateTime date) =>
    DateTime(date.year, date.month, date.day);

int bookingPeriodDaysForStudio(Studio? studio) {
  final parsed = extractBookingPeriodDays(studio);
  if (parsed == null || parsed < 1) return kDefaultBookingPeriodDays;
  return parsed.clamp(kMinBookingPeriodDays, kMaxBookingPeriodDays);
}

/// Mirrors backend `rangeEnd` in `createRecurringSessions`.
DateTime recurringSessionsRangeEnd({
  required Studio? studio,
  DateTime? endsOnDate,
}) {
  final today = normalizeDateOnly(DateTime.now());
  final bookingHorizonEnd = today.add(
    Duration(days: bookingPeriodDaysForStudio(studio)),
  );
  if (endsOnDate == null) return bookingHorizonEnd;
  final endsOnOnly = normalizeDateOnly(endsOnDate);
  return endsOnOnly.isBefore(bookingHorizonEnd)
      ? endsOnOnly
      : bookingHorizonEnd;
}

/// Mirrors backend `buildOccurrenceDates`.
List<DateTime> buildRecurringOccurrenceDates({
  required DateTime startsFromDate,
  required List<int> daysOfWeek,
  required int weeksCount,
}) {
  final uniqueDays = daysOfWeek.toSet().toList()..sort();
  final anchor = normalizeDateOnly(startsFromDate);
  final all = <DateTime>[];

  for (var week = 0; week < weeksCount; week++) {
    for (final day in uniqueDays) {
      final mondayOffset = day - 1;
      final weekBase = anchor.add(Duration(days: week * 7));
      final weekDay = weekBase.weekday;
      final delta = mondayOffset - (weekDay - 1);
      final candidate = weekBase.add(Duration(days: delta));
      if (!candidate.isBefore(anchor)) {
        all.add(candidate);
      }
    }
  }

  all.sort((a, b) => a.compareTo(b));
  return all;
}

int countPlannedRecurringSessions({
  required Studio? studio,
  required DateTime startsFromDate,
  required DateTime endsOnDate,
  required List<int> daysOfWeek,
  required int weeksCount,
}) {
  if (daysOfWeek.isEmpty) return 0;

  final rangeEnd = recurringSessionsRangeEnd(
    studio: studio,
    endsOnDate: endsOnDate,
  );

  return buildRecurringOccurrenceDates(
    startsFromDate: startsFromDate,
    daysOfWeek: daysOfWeek,
    weeksCount: weeksCount,
  ).where((date) => !date.isAfter(rangeEnd)).length;
}
