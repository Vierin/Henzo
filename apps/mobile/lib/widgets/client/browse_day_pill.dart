import 'package:flutter/material.dart';

import '../../constants/colors.dart';
import '../schedule/calendar_day_pill.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Compact day cell for client Browse strip (weekday + date, 2:3 aspect).
class BrowseDayPill extends StatelessWidget {
  const BrowseDayPill({
    super.key,
    required this.day,
    required this.selected,
    this.isToday,
    this.onTap,
  });

  final DateTime day;
  final bool selected;
  final bool? isToday;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final today = isToday ?? CalendarDayPill.isSameDay(day, DateTime.now());
    final bg = selected
        ? AppColors.primary500
        : today
        ? AppColors.primary100
        : AppColors.backgroundPrimary;

    Widget pill = AspectRatio(
      aspectRatio: 2 / 3,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              CalendarDayPill.weekdayShort(day),
              style: TextStyle(
                fontSize: 11.sp,
                fontWeight: FontWeight.w500,
                letterSpacing: -0.3,
                height: 1.1,
                color: selected ? Colors.white : AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '${day.day}',
              style: TextStyle(
                fontSize: 17.sp,
                fontWeight: FontWeight.w600,
                letterSpacing: -0.3,
                height: 1.1,
                color: selected ? Colors.white : AppColors.textPrimary,
              ),
            ),
          ],
        ),
      ),
    );

    if (onTap != null) {
      return GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: SizedBox(width: double.infinity, child: pill),
      );
    }
    return pill;
  }
}
