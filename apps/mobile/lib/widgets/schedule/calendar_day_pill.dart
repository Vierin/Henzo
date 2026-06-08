import 'package:flutter/material.dart';

import '../../constants/colors.dart';
import '../../utils/henzo_haptics.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// PageView physics for day strip (7 pills visible per viewport).
class SmoothDayPageScrollPhysics extends PageScrollPhysics {
  const SmoothDayPageScrollPhysics({super.parent});

  @override
  SmoothDayPageScrollPhysics applyTo(ScrollPhysics? ancestor) {
    return SmoothDayPageScrollPhysics(parent: buildParent(ancestor));
  }
}

/// Light ticks while dragging day strip; muted during programmatic scrolls.
class CalendarDayStripScrollHaptics {
  int? _lastTickIndex;
  int _suppressCount = 0;

  void beginSuppress() => _suppressCount++;

  void endSuppress({int? index}) {
    if (_suppressCount > 0) _suppressCount--;
    if (index != null) _lastTickIndex = index;
  }

  void markIndex(int index) => _lastTickIndex = index;

  void onScrollIndex(int index) {
    if (_suppressCount > 0) {
      _lastTickIndex = index;
      return;
    }
    if (_lastTickIndex == index) return;
    _lastTickIndex = index;
    HenzoHaptics.scrollTick();
  }

  void jumpScroll(
    ScrollController controller, {
    required double offset,
    required int index,
  }) {
    beginSuppress();
    controller.jumpTo(offset);
    endSuppress(index: index);
  }

  void animateScroll(
    ScrollController controller, {
    required double offset,
    required int index,
    Duration duration = const Duration(milliseconds: 280),
    Curve curve = Curves.easeOutCubic,
  }) {
    beginSuppress();
    controller
        .animateTo(
          offset,
          duration: duration,
          curve: curve,
        )
        .whenComplete(() => endSuppress(index: index));
  }
}

/// Day pill in owner calendar strip and client studio schedule.
class CalendarDayPill extends StatelessWidget {
  const CalendarDayPill({
    super.key,
    required this.day,
    required this.selected,
    required this.sessionsCount,
    this.isToday,
    this.enabled = true,
    this.showBorder = false,
    this.highlightTodayWhenUnselected = true,
    this.onTap,
  });

  final DateTime day;
  final bool selected;
  final int sessionsCount;
  final bool? isToday;
  final bool enabled;
  final bool showBorder;

  /// When false, unselected today has no fill (e.g. Browse on beige).
  final bool highlightTodayWhenUnselected;
  final VoidCallback? onTap;

  static const _weekdayNames = [
    'MON',
    'TUE',
    'WED',
    'THU',
    'FRI',
    'SAT',
    'SUN',
  ];

  static const _monthNames = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ];

  static String weekdayShort(DateTime day) => _weekdayNames[day.weekday - 1];

  static String monthYearUpperEn(DateTime d) =>
      '${_monthNames[d.month - 1]} ${d.year}';

  static String monthDayYearUpperEn(DateTime d) =>
      '${_monthNames[d.month - 1]} ${d.day}, ${d.year}';

  static bool isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  static DateTime dateOnly(DateTime d) => DateTime(d.year, d.month, d.day);

  /// ISO week start (Monday) for [day].
  static DateTime weekStartMonday(DateTime day) {
    final d = dateOnly(day);
    return d.subtract(Duration(days: d.weekday - DateTime.monday));
  }

  /// Leftmost strip index so the week containing [day] starts on Monday.
  static int stripIndexForWeekStart({
    required DateTime day,
    required DateTime stripStart,
    required int itemCount,
  }) {
    if (itemCount <= 0) return 0;
    final start = dateOnly(stripStart);
    final monday = weekStartMonday(day);
    final aligned = monday.isBefore(start) ? start : monday;
    return aligned.difference(start).inDays.clamp(0, itemCount - 1);
  }

  @override
  Widget build(BuildContext context) {
    final today = isToday ?? isSameDay(day, DateTime.now());
    final canTap = enabled && onTap != null;

    final Color unselectedColor;
    if (today && !selected) {
      unselectedColor = highlightTodayWhenUnselected
          ? AppColors.primary100
          : Colors.transparent;
    } else {
      unselectedColor = AppColors.backgroundPrimary;
    }

    Widget pill = Container(
      height: 86,
      decoration: BoxDecoration(
        color: selected ? AppColors.primary500 : unselectedColor,
        borderRadius: BorderRadius.circular(12),
        border: showBorder
            ? Border.all(
                color: selected
                    ? AppColors.primary500
                    : today
                    ? AppColors.primary500.withValues(alpha: 0.45)
                    : AppColors.borderPrimary,
              )
            : null,
      ),
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            weekdayShort(day),
            style: TextStyle(
              fontSize: 11.sp,
              fontWeight: FontWeight.w400,
              letterSpacing: -0.3,
              color: selected ? Colors.white : AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            '${day.day}',
            style: TextStyle(
              fontSize: 18.sp,
              fontWeight: FontWeight.w600,
              letterSpacing: -0.3,
              color: selected ? Colors.white : AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            '$sessionsCount',
            style: TextStyle(
              fontSize: 11.sp,
              fontWeight: FontWeight.w400,
              color: selected ? Colors.white : AppColors.primary500,
            ),
          ),
        ],
      ),
    );

    if (!enabled) {
      pill = Opacity(opacity: 0.38, child: pill);
    }

    if (canTap) {
      return GestureDetector(onTap: onTap, child: pill);
    }
    return pill;
  }
}
