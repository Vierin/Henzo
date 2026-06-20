import 'dart:async';

import 'package:flutter/material.dart';
import 'common/henzo_modal.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

const int _kGridCrossCount = 7;
const int _kGridRowCount = 6;
const double _kGridCrossSpacing = 4;
const double _kGridMainSpacing = 6;
const double _kDowRowHeight = 16;
const double _kDowToGridGap = 12;
const double _kCalendarBodyExtraHeight = 10;
const double _kActionButtonRadius = 12;
const double _kActionButtonMinHeight = 48;

List<DateTime?> _monthCells(DateTime monthDate) {
  final firstDay = DateTime(monthDate.year, monthDate.month, 1);
  final daysInMonth = DateTime(monthDate.year, monthDate.month + 1, 0).day;
  final startOffset = firstDay.weekday - 1;
  final totalCells = ((startOffset + daysInMonth + 6) ~/ 7) * 7;
  return List.generate(totalCells, (index) {
    final dayNum = index - startOffset + 1;
    if (dayNum < 1 || dayNum > daysInMonth) return null;
    return DateTime(monthDate.year, monthDate.month, dayNum);
  });
}

String _monthYearLabel(DateTime monthFirst, LocaleProvider loc) {
  final months = loc.tList('calendar.months');
  if (months.length >= monthFirst.month) {
    return '${months[monthFirst.month - 1].toUpperCase()} ${monthFirst.year}';
  }
  return '${monthFirst.year}';
}

List<String> _weekdayLabels(LocaleProvider loc) => [
  loc.t('addTraining.weekdayMon'),
  loc.t('addTraining.weekdayTue'),
  loc.t('addTraining.weekdayWed'),
  loc.t('addTraining.weekdayThu'),
  loc.t('addTraining.weekdayFri'),
  loc.t('addTraining.weekdaySat'),
  loc.t('addTraining.weekdaySun'),
];

DateTime _dateOnly(DateTime d) => DateTime(d.year, d.month, d.day);

DateTime _firstMonthInRange(DateTime firstDate) =>
    DateTime(firstDate.year, firstDate.month, 1);

DateTime _lastMonthInRange(DateTime lastDate) =>
    DateTime(lastDate.year, lastDate.month, 1);

int _countMonthPages(DateTime firstDate, DateTime lastDate) {
  final a = _firstMonthInRange(firstDate);
  final b = _lastMonthInRange(lastDate);
  return (b.year - a.year) * 12 + b.month - a.month + 1;
}

DateTime _pageToMonth(DateTime rangeFirstMonth, int page) =>
    DateTime(rangeFirstMonth.year, rangeFirstMonth.month + page, 1);

int _monthToPage(DateTime rangeFirstMonth, DateTime monthFirst) =>
    (monthFirst.year - rangeFirstMonth.year) * 12 +
    (monthFirst.month - rangeFirstMonth.month);

double _gridTileSize(double gridWidth) =>
    (gridWidth - (_kGridCrossCount - 1) * _kGridCrossSpacing) /
    _kGridCrossCount;

double _gridHeight(double tileSize) =>
    _kGridRowCount * tileSize + (_kGridRowCount - 1) * _kGridMainSpacing;

double _calendarBodyHeight(double gridWidth) =>
    _kDowRowHeight +
    _kDowToGridGap +
    _gridHeight(_gridTileSize(gridWidth)) +
    _kCalendarBodyExtraHeight;

/// Month grid matching Schedule expanded calendar; header row: ◀ month ▶.
/// Horizontal swipe on the grid changes the month.
Future<DateTime?> showScheduleStyleDatePicker({
  required BuildContext context,
  required DateTime initialDate,
  required DateTime firstDate,
  required DateTime lastDate,
}) {
  final first = _dateOnly(firstDate);
  final last = _dateOnly(lastDate);
  var initial = _dateOnly(initialDate);
  if (initial.isBefore(first)) initial = first;
  if (initial.isAfter(last)) initial = last;

  return showHenzoModalBottomSheet<DateTime>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => _ScheduleStyleDatePickerSheet(
      initialSelected: initial,
      firstDate: first,
      lastDate: last,
    ),
  );
}

class _ScheduleStyleDatePickerSheet extends StatefulWidget {
  const _ScheduleStyleDatePickerSheet({
    required this.initialSelected,
    required this.firstDate,
    required this.lastDate,
  });

  final DateTime initialSelected;
  final DateTime firstDate;
  final DateTime lastDate;

  @override
  State<_ScheduleStyleDatePickerSheet> createState() =>
      _ScheduleStyleDatePickerSheetState();
}

class _ScheduleStyleDatePickerSheetState
    extends State<_ScheduleStyleDatePickerSheet> {
  late DateTime _rangeFirstMonth;
  late int _monthPageCount;
  late PageController _pageController;
  late final ValueNotifier<int> _pageIndexNotifier;
  late final ValueNotifier<DateTime> _selectedNotifier;
  var _pickerPageAnimating = false;

  @override
  void initState() {
    super.initState();
    _selectedNotifier = ValueNotifier(widget.initialSelected);
    _rangeFirstMonth = _firstMonthInRange(widget.firstDate);
    _monthPageCount = _countMonthPages(widget.firstDate, widget.lastDate);
    var monthFirst = DateTime(
      widget.initialSelected.year,
      widget.initialSelected.month,
      1,
    );
    var page = _monthToPage(_rangeFirstMonth, monthFirst);
    if (page < 0) page = 0;
    if (page >= _monthPageCount) page = _monthPageCount - 1;
    _pageIndexNotifier = ValueNotifier(page);
    _pageController = PageController(initialPage: page);
  }

  @override
  void dispose() {
    _pageController.dispose();
    _pageIndexNotifier.dispose();
    _selectedNotifier.dispose();
    super.dispose();
  }

  bool _inRange(DateTime d) =>
      !d.isBefore(widget.firstDate) && !d.isAfter(widget.lastDate);

  Future<void> _animatePickerToPage(int page) async {
    if (page < 0 || page >= _monthPageCount) return;
    if (_pickerPageAnimating) return;
    if (!_pageController.hasClients) return;
    if (_pageIndexNotifier.value == page) return;
    _pickerPageAnimating = true;
    try {
      await _pageController.animateToPage(
        page,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOutCubic,
      );
    } finally {
      if (mounted) {
        _pickerPageAnimating = false;
      }
    }
  }

  void _prevMonth() {
    if (_pickerPageAnimating) return;
    final cur = _pageIndexNotifier.value;
    if (cur <= 0) return;
    unawaited(_animatePickerToPage(cur - 1));
  }

  void _nextMonth() {
    if (_pickerPageAnimating) return;
    final cur = _pageIndexNotifier.value;
    if (cur >= _monthPageCount - 1) return;
    unawaited(_animatePickerToPage(cur + 1));
  }

  @override
  Widget build(BuildContext context) {
    final loc = context.watch<LocaleProvider>();
    final weekdayLabels = _weekdayLabels(loc);
    final bottomInset = MediaQuery.paddingOf(context).bottom;

    return Material(
      color: AppColors.backgroundSecondary,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, 6, 16, 16 + bottomInset),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.borderPrimary,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            ),
            const SizedBox(height: 2),
            ValueListenableBuilder<int>(
              valueListenable: _pageIndexNotifier,
              builder: (context, pageIndex, _) {
                final monthFirst = _pageToMonth(_rangeFirstMonth, pageIndex);
                final canPrev = pageIndex > 0;
                final canNext = pageIndex < _monthPageCount - 1;
                return Row(
                  children: [
                    IconButton(
                      onPressed: (canPrev && !_pickerPageAnimating)
                          ? _prevMonth
                          : null,
                      icon: const Icon(Icons.chevron_left_rounded),
                      iconSize: 28,
                      color: AppColors.textSecondary,
                      padding: const EdgeInsets.all(12),
                      constraints: const BoxConstraints(
                        minWidth: 56,
                        minHeight: 56,
                      ),
                      splashRadius: 28,
                    ),
                    Expanded(
                      child: Text(
                        _monthYearLabel(monthFirst, loc),
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 14.sp,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.3,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: (canNext && !_pickerPageAnimating)
                          ? _nextMonth
                          : null,
                      icon: const Icon(Icons.chevron_right_rounded),
                      iconSize: 28,
                      color: AppColors.textSecondary,
                      padding: const EdgeInsets.all(12),
                      constraints: const BoxConstraints(
                        minWidth: 56,
                        minHeight: 56,
                      ),
                      splashRadius: 28,
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: 8),
            LayoutBuilder(
              builder: (context, constraints) {
                final gridWidth = constraints.maxWidth - 24;
                final tileSize = _gridTileSize(gridWidth);
                final bodyH = _calendarBodyHeight(gridWidth);
                return Container(
                  width: double.infinity,
                  padding: const EdgeInsets.fromLTRB(12, 14, 12, 0),
                  decoration: BoxDecoration(
                    color: AppColors.backgroundPrimary,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: SizedBox(
                    height: bodyH,
                    child: PageView.builder(
                      controller: _pageController,
                      onPageChanged: (i) => _pageIndexNotifier.value = i,
                      itemCount: _monthPageCount,
                      itemBuilder: (_, page) {
                        final month = _pageToMonth(_rangeFirstMonth, page);
                        return RepaintBoundary(
                          child: _PickerMonthPage(
                            monthFirst: month,
                            tileSize: tileSize,
                            weekdayLabels: weekdayLabels,
                            selectedListenable: _selectedNotifier,
                            firstDate: widget.firstDate,
                            lastDate: widget.lastDate,
                          ),
                        );
                      },
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 16),
            Builder(
              builder: (context) {
                final actionShape = RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(_kActionButtonRadius),
                );
                return ValueListenableBuilder<DateTime>(
                  valueListenable: _selectedNotifier,
                  builder: (context, selected, _) {
                    return Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => Navigator.of(context).pop(),
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size(
                                0,
                                _kActionButtonMinHeight,
                              ),
                              side: const BorderSide(
                                color: AppColors.borderPrimary,
                              ),
                              shape: actionShape,
                            ),
                            child: Text(loc.t('common.cancel')),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: FilledButton(
                            onPressed: _inRange(selected)
                                ? () => Navigator.of(context).pop(selected)
                                : null,
                            style: FilledButton.styleFrom(
                              minimumSize: const Size(
                                0,
                                _kActionButtonMinHeight,
                              ),
                              backgroundColor: AppColors.primary500,
                              foregroundColor: Colors.white,
                              shape: actionShape,
                            ),
                            child: Text(loc.t('common.done')),
                          ),
                        ),
                      ],
                    );
                  },
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _PickerMonthPage extends StatelessWidget {
  const _PickerMonthPage({
    required this.monthFirst,
    required this.tileSize,
    required this.weekdayLabels,
    required this.selectedListenable,
    required this.firstDate,
    required this.lastDate,
  });

  final DateTime monthFirst;
  final double tileSize;
  final List<String> weekdayLabels;
  final ValueNotifier<DateTime> selectedListenable;
  final DateTime firstDate;
  final DateTime lastDate;

  bool _sameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  bool _inRange(DateTime d) => !d.isBefore(firstDate) && !d.isAfter(lastDate);

  Widget _buildDayCell(DateTime day, DateTime selected) {
    final inRange = _inRange(day);
    final isSelected = _sameDay(day, selected);
    final today = _sameDay(day, DateTime.now());
    final circleSize = tileSize * 0.82;
    return Align(
      alignment: Alignment.topCenter,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: inRange ? () => selectedListenable.value = day : null,
          child: Opacity(
            opacity: inRange ? 1 : 0.28,
            child: Container(
              width: circleSize,
              height: circleSize,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isSelected
                    ? AppColors.primary500
                    : (today
                          ? AppColors.primary100
                          : AppColors.backgroundTertiary),
                border: Border.all(
                  color: isSelected
                      ? AppColors.primary500
                      : AppColors.borderPrimary.withValues(alpha: 0.5),
                ),
              ),
              child: Text(
                '${day.day}',
                style: TextStyle(
                  fontSize: 14.sp,
                  fontWeight: FontWeight.w500,
                  color: isSelected ? Colors.white : AppColors.textPrimary,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cells = _monthCells(monthFirst);
    return Column(
      children: [
        SizedBox(
          height: _kDowRowHeight,
          child: Row(
            children: List.generate(
              _kGridCrossCount,
              (i) => Expanded(
                child: Center(
                  child: Text(
                    weekdayLabels[i],
                    style: TextStyle(
                      fontSize: 11.sp,
                      fontWeight: FontWeight.w400,
                      letterSpacing: -0.3,
                      height: 1,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
        SizedBox(height: _kDowToGridGap),
        SizedBox(
          height: _gridHeight(tileSize),
          child: ValueListenableBuilder<DateTime>(
            valueListenable: selectedListenable,
            builder: (context, selected, _) {
              return GridView.builder(
                padding: EdgeInsets.zero,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: cells.length,
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: _kGridCrossCount,
                  mainAxisSpacing: _kGridMainSpacing,
                  crossAxisSpacing: _kGridCrossSpacing,
                  childAspectRatio: 1,
                ),
                itemBuilder: (_, index) {
                  final day = cells[index];
                  if (day == null) return const SizedBox.shrink();
                  return _buildDayCell(day, selected);
                },
              );
            },
          ),
        ),
      ],
    );
  }
}
