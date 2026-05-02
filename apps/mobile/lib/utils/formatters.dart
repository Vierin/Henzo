/// Shared formatting helpers for client UI (VND, time).

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

String formatTime24(DateTime dt) {
  final h = dt.hour.toString().padLeft(2, '0');
  final m = dt.minute.toString().padLeft(2, '0');
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
  final h = dt.hour.toString().padLeft(2, '0');
  final m = dt.minute.toString().padLeft(2, '0');
  return '$h:$m';
}

/// Passes list: `01.05 14:30`
String dateTimeLabelDayMonthHm(DateTime? dt) {
  if (dt == null) return 'Date TBD';
  String two(int v) => v.toString().padLeft(2, '0');
  return '${two(dt.day)}.${two(dt.month)} ${two(dt.hour)}:${two(dt.minute)}';
}
