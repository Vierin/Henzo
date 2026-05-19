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

/// Passes list: `01.05 14:30`
String dateTimeLabelDayMonthHm(DateTime? dt) {
  if (dt == null) return 'Date TBD';
  final local = dt.toLocal();
  String two(int v) => v.toString().padLeft(2, '0');
  return '${two(local.day)}.${two(local.month)} '
      '${two(local.hour)}:${two(local.minute)}';
}
