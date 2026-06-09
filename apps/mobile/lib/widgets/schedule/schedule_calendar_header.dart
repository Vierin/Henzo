import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import 'calendar_day_pill.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Shared title row: screen title + Today + Expand/Collapse.
class ScheduleCalendarTitleRow extends StatelessWidget {
  const ScheduleCalendarTitleRow({
    super.key,
    this.overtitle,
    this.overtitleStyle,
    required this.title,
    required this.titleStyle,
    required this.onToday,
    required this.isMonthExpanded,
    required this.onToggleMonthExpanded,
    this.todayLabel = 'Today',
    this.expandLabel = 'Expand',
    this.collapseLabel = 'Collapse',
    this.padding = const EdgeInsets.fromLTRB(16, 10, 16, 8),
    this.actionsSpacing = 8,
    this.overtitleGap = 12,
  });

  final String? overtitle;
  final TextStyle? overtitleStyle;
  final String title;
  final TextStyle titleStyle;
  final VoidCallback onToday;
  final bool isMonthExpanded;
  final VoidCallback onToggleMonthExpanded;
  final String todayLabel;
  final String expandLabel;
  final String collapseLabel;
  final EdgeInsetsGeometry padding;
  final double actionsSpacing;
  final double overtitleGap;

  @override
  Widget build(BuildContext context) {
    final studioLine = overtitle?.trim();
    final overtitleTextStyle =
        overtitleStyle ??
        TextStyle(
          fontSize: 14.sp,
          fontWeight: FontWeight.w400,
          letterSpacing: 0.4,
          color: AppColors.textSecondary,
          height: 1.1,
        );

    return Padding(
      padding: padding,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (studioLine != null && studioLine.isNotEmpty) ...[
                  Text(
                    studioLine,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: overtitleTextStyle,
                  ),
                  SizedBox(height: overtitleGap),
                ],
                Text(
                  title,
                  style: titleStyle,
                ),
              ],
            ),
          ),
          ScheduleCalendarTodayButton(
            label: todayLabel,
            onTap: onToday,
          ),
          SizedBox(width: actionsSpacing),
          ScheduleCalendarExpandButton(
            isExpanded: isMonthExpanded,
            expandLabel: expandLabel,
            collapseLabel: collapseLabel,
            onTap: onToggleMonthExpanded,
          ),
        ],
      ),
    );
  }
}

class ScheduleCalendarTodayButton extends StatelessWidget {
  const ScheduleCalendarTodayButton({
    super.key,
    required this.onTap,
    this.label = 'Today',
  });

  final VoidCallback onTap;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.primary500,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: SizedBox(
          height: 30,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Center(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 13.sp,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                  height: 1.1,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class ScheduleCalendarExpandButton extends StatelessWidget {
  const ScheduleCalendarExpandButton({
    super.key,
    required this.isExpanded,
    required this.onTap,
    this.expandLabel = 'Expand',
    this.collapseLabel = 'Collapse',
  });

  final bool isExpanded;
  final VoidCallback onTap;
  final String expandLabel;
  final String collapseLabel;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.backgroundPrimary,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: SizedBox(
          height: 30,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                SvgPicture.asset(
                  'assets/icons/icon-calendar.svg',
                  width: 13,
                  height: 12,
                  fit: BoxFit.contain,
                  excludeFromSemantics: true,
                  colorFilter: const ColorFilter.mode(
                    AppColors.textPrimary,
                    BlendMode.srcIn,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  isExpanded ? collapseLabel : expandLabel,
                  style: TextStyle(
                    fontSize: 13.sp,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                    height: 1.1,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Browse schedule etalon: «JUL 2026».
class ScheduleCalendarMonthYearText extends StatelessWidget {
  const ScheduleCalendarMonthYearText({
    super.key,
    required this.day,
    this.style,
  });

  final DateTime day;
  final TextStyle? style;

  static TextStyle monthYearTextStyle() => TextStyle(
    fontSize: 14.sp,
    fontWeight: FontWeight.w500,
    letterSpacing: -0.3,
    color: AppColors.textPrimary,
    height: 1.1,
  );

  @override
  Widget build(BuildContext context) {
    final localeCode = context.watch<LocaleProvider>().localeCode;
    return Text(
      CalendarDayPill.monthYearUpper(day, localeCode),
      style: style ?? monthYearTextStyle(),
    );
  }
}

/// Right-aligned month label (collapsed strip + expanded card header).
class ScheduleCalendarMonthYearAlign extends StatelessWidget {
  const ScheduleCalendarMonthYearAlign({
    super.key,
    required this.day,
    this.style,
  });

  final DateTime day;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerRight,
      child: ScheduleCalendarMonthYearText(day: day, style: style),
    );
  }
}

/// Right-aligned month label under the title/actions row (collapsed strip).
class ScheduleCalendarMonthYearLabel extends StatelessWidget {
  const ScheduleCalendarMonthYearLabel({
    super.key,
    required this.dayListenable,
    this.padding = const EdgeInsets.fromLTRB(16, 13, 20, 8),
    this.textStyle,
  });

  final ValueListenable<DateTime> dayListenable;
  final EdgeInsetsGeometry padding;
  final TextStyle? textStyle;

  static TextStyle monthYearTextStyle() =>
      ScheduleCalendarMonthYearText.monthYearTextStyle();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: ValueListenableBuilder<DateTime>(
        valueListenable: dayListenable,
        builder: (context, day, _) {
          return ScheduleCalendarMonthYearAlign(
            day: day,
            style: textStyle,
          );
        },
      ),
    );
  }
}

/// Top-right label inside expanded month card (studio name, etc.).
class ScheduleMonthCardTopLabel extends StatelessWidget {
  const ScheduleMonthCardTopLabel({
    super.key,
    required this.label,
    this.textStyle,
  });

  final String label;
  final TextStyle? textStyle;

  @override
  Widget build(BuildContext context) {
    if (label.trim().isEmpty) return const SizedBox.shrink();

    final style =
        textStyle ??
        TextStyle(
          fontSize: 12.sp,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.4,
          color: AppColors.textSecondary,
          height: 1.1,
        );

    return Align(
      alignment: Alignment.centerRight,
      child: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        textAlign: TextAlign.right,
        style: style,
      ),
    );
  }
}
