import 'package:intl/intl.dart';
import 'package:latlong2/latlong.dart';

/// Shared formatting helpers for client UI (VND, time).

/// API timestamps are UTC ISO strings; convert once for display and filters.
DateTime? parseApiDateTime(Object? raw) {
  if (raw == null) return null;
  final text = raw.toString().trim();
  if (text.isEmpty) return null;
  return DateTime.tryParse(text)?.toLocal();
}

String formatVnd(num value) {
  final digits = value.round().toString();
  final out = StringBuffer();
  for (int i = 0; i < digits.length; i++) {
    out.write(digits[i]);
    final left = digits.length - i - 1;
    if (left > 0 && left % 3 == 0) out.write('.');
  }
  return out.toString();
}

/// Compact price for browse cards: `200K VND`; empty when free/unknown.
/// Studio review cards: `12.05.2023`
String formatReviewDateLabel(DateTime? createdAt) {
  if (createdAt == null) return '';
  final local = createdAt.toLocal();
  String two(int v) => v.toString().padLeft(2, '0');
  return '${two(local.day)}.${two(local.month)}.${local.year}';
}

/// Review cards: `2 days ago`, `3 h ago`, or short date when older.
String formatRelativeReviewDateLabel(
  DateTime? createdAt, {
  required String daysAgoTemplate,
  required String hoursAgoTemplate,
  required String justNowLabel,
}) {
  if (createdAt == null) return '';
  final local = createdAt.toLocal();
  final diff = DateTime.now().difference(local);
  if (diff.inDays >= 7) {
    String two(int v) => v.toString().padLeft(2, '0');
    return '${two(local.day)}.${two(local.month)}.${local.year}';
  }
  if (diff.inDays >= 1) {
    return daysAgoTemplate.replaceAll('{count}', '${diff.inDays}');
  }
  if (diff.inHours >= 1) {
    return hoursAgoTemplate.replaceAll('{count}', '${diff.inHours}');
  }
  return justNowLabel;
}

/// Studio logo for cards: `logoUrl`, else first `photos[]` entry.
String? resolveStudioBrandImageUrl(Map<String, dynamic>? studio) {
  if (studio == null) return null;
  for (final key in ['logoUrl', 'logo_url', 'logo']) {
    final raw = studio[key]?.toString().trim();
    if (raw != null && raw.isNotEmpty) return raw;
  }
  final photos = studio['photos'];
  if (photos is List) {
    for (final p in photos) {
      final url = p?.toString().trim();
      if (url != null && url.isNotEmpty) return url;
    }
  }
  return null;
}

/// Client UI: `1,8 km` or `450 m` (templates use `{value}` placeholder).
String? formatDistanceKmLabel(
  double? km, {
  String kmTemplate = '{value} km',
  String mTemplate = '{value} m',
}) {
  if (km == null) return null;
  if (km < 1) {
    final meters = (km * 1000).round();
    return mTemplate.replaceAll('{value}', '$meters');
  }
  final text = km.toStringAsFixed(1).replaceAll('.', ',');
  return kmTemplate.replaceAll('{value}', text);
}

/// Browse studio cards: API `distance` when present, else Haversine from client.
double? resolveStudioDistanceKm({
  double? apiDistanceKm,
  double? clientLat,
  double? clientLon,
  double? studioLat,
  double? studioLng,
}) {
  if (apiDistanceKm != null) return apiDistanceKm;
  if (clientLat == null || clientLon == null) return null;
  if (studioLat == null || studioLng == null) return null;
  const d = Distance();
  final meters = d.as(
    LengthUnit.Meter,
    LatLng(clientLat, clientLon),
    LatLng(studioLat, studioLng),
  );
  return meters / 1000.0;
}

/// Browse studio list: `1,23 km` (always km, 2 decimals, comma separator).
String formatBrowseStudioDistanceLabel(
  double? km, {
  String kmTemplate = '{value} km',
}) {
  if (km == null) return '';
  final text = km.toStringAsFixed(2).replaceAll('.', ',');
  return kmTemplate.replaceAll('{value}', text);
}

String formatCompactVndLabel(double? price) {
  if (price == null || price <= 0) return '';
  final r = price.round();
  if (r >= 1000) {
    final k = r / 1000;
    if (r % 1000 == 0) {
      return '${k.round()}K VND';
    }
    return '${k.toStringAsFixed(1).replaceAll('.', ',')}K VND';
  }
  return '${formatVnd(r)} VND';
}

/// Booking cards: `12.06.26`
String formatBookingCardDate(DateTime dt) {
  final local = dt.toLocal();
  String two(int v) => v.toString().padLeft(2, '0');
  final yy = (local.year % 100).toString().padLeft(2, '0');
  return '${two(local.day)}.${two(local.month)}.$yy';
}

String formatTime24(DateTime dt) {
  final local = dt.toLocal();
  final h = local.hour.toString().padLeft(2, '0');
  final m = local.minute.toString().padLeft(2, '0');
  return '$h:$m';
}

String formatMinutesSliderLabel(double minutes) {
  final safe = minutes.round().clamp(0, 1440);
  final h = (safe ~/ 60).toString().padLeft(2, '0');
  final m = (safe % 60).toString().padLeft(2, '0');
  return '$h:$m';
}

String timeLabelHm(DateTime? dt) {
  if (dt == null) return '--:--';
  return formatTime24(dt);
}

/// Passes card left column: `7 Jun` (locale-aware).
String formatPassCardDayMonth(DateTime dt, String localeTag) {
  return DateFormat('d MMM', localeTag).format(dt.toLocal());
}

/// Mon–Sun column headers for calendar grids (uppercase).
List<String> calendarWeekdayHeaders(String localeCode) {
  return List.generate(7, (i) {
    final d = DateTime(2024, 1, 1 + i);
    return DateFormat('EEE', localeCode).format(d).toUpperCase();
  });
}

/// Short weekday label for day pills (`MON` / `ПН` / …).
String formatCalendarWeekdayShort(DateTime day, String localeCode) =>
    DateFormat('EEE', localeCode).format(day).toUpperCase();

/// Month + year header (`JUN 2026` / `ИЮН 2026` / …).
String formatCalendarMonthYearUpper(DateTime day, String localeCode) =>
    DateFormat('MMM yyyy', localeCode).format(day).toUpperCase();

/// Month, day, year (`JUN 9, 2026`).
String formatCalendarMonthDayYearUpper(DateTime day, String localeCode) {
  final monthDay = DateFormat('MMM d', localeCode).format(day).toUpperCase();
  return '$monthDay, ${day.year}';
}

/// Browse sticky date pill (`MON 9`).
String formatBrowseCompactDateLabel(DateTime day, String localeCode) {
  final weekday = DateFormat('EEE', localeCode).format(day).toUpperCase();
  return '$weekday ${day.day}';
}

/// Weekday, day, month (`MON, 9 JUN`).
String formatCalendarWeekdayDayMonthUpper(DateTime day, String localeCode) =>
    DateFormat('EEE, d MMM', localeCode).format(day).toUpperCase();

/// Passes list: `01.05 14:30`
String dateTimeLabelDayMonthHm(DateTime? dt) {
  if (dt == null) return 'Date TBD';
  final local = dt.toLocal();
  String two(int v) => v.toString().padLeft(2, '0');
  return '${two(local.day)}.${two(local.month)} '
      '${two(local.hour)}:${two(local.minute)}';
}

/// Local calendar day at 00:00 (schedule `from`).
DateTime startOfLocalDay(DateTime d) {
  final local = d.toLocal();
  return DateTime(local.year, local.month, local.day);
}

/// Local calendar day at 23:59:59.999 (inclusive schedule `to`).
DateTime endOfLocalDay(DateTime d) {
  final start = startOfLocalDay(d);
  return DateTime(
    start.year,
    start.month,
    start.day,
    23,
    59,
    59,
    999,
  );
}
