import 'package:flutter/material.dart';

import '../../constants/colors.dart';

/// PageView physics for day strip (7 pills visible per viewport).
class SmoothDayPageScrollPhysics extends PageScrollPhysics {
  const SmoothDayPageScrollPhysics({super.parent});

  @override
  SmoothDayPageScrollPhysics applyTo(ScrollPhysics? ancestor) {
    return SmoothDayPageScrollPhysics(parent: buildParent(ancestor));
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
    this.showBorder = true,
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

  @override
  Widget build(BuildContext context) {
    final today = isToday ?? isSameDay(day, DateTime.now());
    final canTap = enabled && onTap != null;

    final Color unselectedColor;
    if (today && !selected) {
      unselectedColor = highlightTodayWhenUnselected
          ? AppColors.primary50
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
              fontSize: 11,
              fontWeight: FontWeight.w400,
              letterSpacing: -0.3,
              color: selected ? Colors.white : AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            '${day.day}',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              letterSpacing: -0.3,
              color: selected ? Colors.white : AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            '$sessionsCount',
            style: TextStyle(
              fontSize: 11,
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
