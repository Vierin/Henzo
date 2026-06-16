import 'package:flutter/material.dart';

import '../../../widgets/schedule/calendar_day_pill.dart';
import '../client_search_constants.dart';

DateTime calendarDateOnly(DateTime d) => DateTime(d.year, d.month, d.day);

DateTime exploreStripStart() =>
    CalendarDayPill.weekStartMonday(calendarDateOnly(DateTime.now()));

DateTime exploreDayAt(int index) =>
    exploreStripStart().add(Duration(days: index));

int exploreDayKey(DateTime d) => d.year * 10000 + d.month * 100 + d.day;

double browsePillWidth(double viewportWidth) =>
    viewportWidth / 7 - kBrowseDayPillGap;

double browseDayStride(double viewportWidth) => viewportWidth / 7;

bool isDayInExploreHorizon(DateTime day) {
  final normalized = calendarDateOnly(day);
  final diff = normalized.difference(exploreStripStart()).inDays;
  return diff >= 0 && diff < kExploreHorizonDays;
}

int browseStripIndexForWeekStart(DateTime day) =>
    CalendarDayPill.stripIndexForWeekStart(
      day: day,
      stripStart: exploreStripStart(),
      itemCount: kExploreHorizonDays,
    );

DateTime browseMonthWindowStart() {
  final start = exploreStripStart();
  return DateTime(start.year, start.month, 1);
}

DateTime browseMonthWindowEnd() {
  final windowStart = browseMonthWindowStart();
  return DateTime(
    windowStart.year,
    windowStart.month + kBrowseMaxMonthSpan - 1,
    1,
  );
}

bool canShiftBrowseMonth(DateTime stripDay, int deltaMonths) {
  final targetMonthStart = DateTime(
    stripDay.year,
    stripDay.month + deltaMonths,
    1,
  );
  return !targetMonthStart.isBefore(browseMonthWindowStart()) &&
      !targetMonthStart.isAfter(browseMonthWindowEnd());
}

List<DateTime?> browseMonthCells(DateTime monthDate) {
  final firstDay = DateTime(monthDate.year, monthDate.month, 1);
  final daysInMonth = DateUtils.getDaysInMonth(
    monthDate.year,
    monthDate.month,
  );
  final startOffset = firstDay.weekday - 1;
  final totalCells = ((startOffset + daysInMonth + 6) ~/ 7) * 7;
  return List.generate(totalCells, (index) {
    final dayNum = index - startOffset + 1;
    if (dayNum < 1 || dayNum > daysInMonth) return null;
    return DateTime(monthDate.year, monthDate.month, dayNum);
  });
}

/// Snap to 30-minute steps for [RangeSlider] (min 05:00, max 24:00).
RangeValues alignTimeRangeToSlider(RangeValues r) {
  int step30(int v) => ((v / 30.0).round() * 30).clamp(300, 1440);
  var a = step30(r.start.round());
  var b = step30(r.end.round());
  if (b < a) b = a;
  return RangeValues(a.toDouble(), b.toDouble());
}
