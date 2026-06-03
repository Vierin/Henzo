import 'dart:async';

import 'package:flutter/material.dart';
import 'common/henzo_modal.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';import '../l10n/locale_provider.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Same month abbreviations as [CalendarScreen] header.
const _kEnMon = [
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

const _kDow = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const int _kGridCrossCount = 7;
const double _kGridCrossSpacing = 4;
const double _kGridMainSpacing = 8;
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

String _monthYearLabel(DateTime monthFirst) =>
    '${_kEnMon[monthFirst.month - 1]} ${monthFirst.year}';

DateTime _dateOnly(DateTime d) => DateTime(d.year, d.month, d.day);

bool _monthIntersectsRange(
  DateTime monthFirst,
  DateTime firstDate,
  DateTime lastDate,
) {
  final monthEnd = DateTime(monthFirst.year, monthFirst.month + 1, 0);
  return !monthEnd.isBefore(firstDate) && !monthFirst.isAfter(lastDate);
}

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
  late DateTime _monthFirst;
  late DateTime _selected;
  late PageController _pageController;
  /// Last page reported by [PageView.onPageChanged] (settled index).
  late int _settledPickerPage;
  var _pickerPageAnimating = false;

  @override
  void initState() {
    super.initState();
    _selected = widget.initialSelected;
    _rangeFirstMonth = _firstMonthInRange(widget.firstDate);
    _monthPageCount = _countMonthPages(widget.firstDate, widget.lastDate);
    _monthFirst = DateTime(_selected.year, _selected.month, 1);
    if (!_monthIntersectsRange(
      _monthFirst,
      widget.firstDate,
      widget.lastDate,
    )) {
      _monthFirst = _rangeFirstMonth;
    }
    var page = _monthToPage(_rangeFirstMonth, _monthFirst);
    if (page < 0) page = 0;
    if (page >= _monthPageCount) page = _monthPageCount - 1;
    _monthFirst = _pageToMonth(_rangeFirstMonth, page);
    _settledPickerPage = page;
    _pageController = PageController(initialPage: page);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  bool _sameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  bool _inRange(DateTime d) =>
      !d.isBefore(widget.firstDate) && !d.isAfter(widget.lastDate);

  bool get _canPrevMonth => _settledPickerPage > 0;

  bool get _canNextMonth => _settledPickerPage < _monthPageCount - 1;

  int _readPickerPageForArrows() {
    if (!_pageController.hasClients) return _settledPickerPage;
    final p = _pageController.page;
    if (p == null) return _settledPickerPage;
    return p.round().clamp(0, _monthPageCount - 1);
  }

  Future<void> _animatePickerToPage(int page) async {
    if (page < 0 || page >= _monthPageCount) return;
    if (_pickerPageAnimating) return;
    if (!_pageController.hasClients) return;
    final cur = _readPickerPageForArrows();
    if (cur == page) return;
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
    if (!_canPrevMonth || _pickerPageAnimating) return;
    final cur = _readPickerPageForArrows();
    if (cur <= 0) return;
    unawaited(_animatePickerToPage(cur - 1));
  }

  void _nextMonth() {
    if (!_canNextMonth || _pickerPageAnimating) return;
    final cur = _readPickerPageForArrows();
    if (cur >= _monthPageCount - 1) return;
    unawaited(_animatePickerToPage(cur + 1));
  }

  double _calendarBodyHeight(double innerWidth) {
    const dowRow = 18.0;
    const gap = 12.0;
    final tile =
        (innerWidth - (_kGridCrossCount - 1) * _kGridCrossSpacing) /
        _kGridCrossCount;
    const rows = 6;
    final gridH = rows * tile + (rows - 1) * _kGridMainSpacing;
    return dowRow + gap + gridH;
  }

  Widget _buildDayCell(DateTime day) {
    final inRange = _inRange(day);
    final selected = _sameDay(day, _selected);
    final today = _sameDay(day, DateTime.now());
    return Center(
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: inRange ? () => setState(() => _selected = day) : null,
          child: Opacity(
            opacity: inRange ? 1 : 0.28,
            child: Container(
              width: 36,
              height: 36,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: selected
                    ? AppColors.primary500
                    : (today
                          ? AppColors.primary100
                          : AppColors.backgroundTertiary),
                border: Border.all(
                  color: selected
                      ? AppColors.primary500
                      : AppColors.borderPrimary.withValues(alpha: 0.5),
                ),
              ),
              child: Text(
                '${day.day}',
                style: TextStyle(
                  fontSize: 14.sp,
                  fontWeight: FontWeight.w500,
                  color: selected ? Colors.white : AppColors.textPrimary,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMonthPage(DateTime monthFirst) {
    final cells = _monthCells(monthFirst);
    return Column(
      children: [
        Row(
          children: List.generate(
            _kGridCrossCount,
            (i) => Expanded(
              child: Center(
                child: Text(
                  _kDow[i],
                  style: TextStyle(
                    fontSize: 11.sp,
                    fontWeight: FontWeight.w400,
                    letterSpacing: -0.3,
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: cells.length,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: _kGridCrossCount,
            mainAxisSpacing: _kGridMainSpacing,
            crossAxisSpacing: _kGridCrossSpacing,
            childAspectRatio: 1.0,
          ),
          itemBuilder: (_, index) {
            final day = cells[index];
            if (day == null) return const SizedBox.shrink();
            return _buildDayCell(day);
          },
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.paddingOf(context).bottom;

    return Material(
      color: AppColors.backgroundSecondary,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, 12, 16, 16 + bottomInset),
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
            const SizedBox(height: 12),
            Row(
              children: [
                IconButton(
                  onPressed: (_canPrevMonth && !_pickerPageAnimating)
                      ? _prevMonth
                      : null,
                  icon: const Icon(Icons.chevron_left_rounded),
                  color: AppColors.textSecondary,
                ),
                Expanded(
                  child: Text(
                    _monthYearLabel(_monthFirst),
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
                  onPressed: (_canNextMonth && !_pickerPageAnimating)
                      ? _nextMonth
                      : null,
                  icon: const Icon(Icons.chevron_right_rounded),
                  color: AppColors.textSecondary,
                ),
              ],
            ),
            const SizedBox(height: 8),
            LayoutBuilder(
              builder: (context, constraints) {
                final innerW = constraints.maxWidth - 24;
                final bodyH = _calendarBodyHeight(innerW);
                return Container(
                  width: double.infinity,
                  padding: const EdgeInsets.fromLTRB(12, 16, 12, 16),
                  decoration: BoxDecoration(
                    color: AppColors.backgroundPrimary,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: SizedBox(
                    height: bodyH,
                    child: PageView.builder(
                      controller: _pageController,
                      onPageChanged: (i) {
                        setState(() {
                          _settledPickerPage = i;
                          _monthFirst = _pageToMonth(_rangeFirstMonth, i);
                        });
                      },
                      itemCount: _monthPageCount,
                      itemBuilder: (_, page) {
                        final month = _pageToMonth(_rangeFirstMonth, page);
                        return _buildMonthPage(month);
                      },
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 16),
            Consumer<LocaleProvider>(
              builder: (context, loc, _) {
                final actionShape = RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(_kActionButtonRadius),
                );
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
                        onPressed: _inRange(_selected)
                            ? () => Navigator.of(context).pop(_selected)
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
            ),
          ],
        ),
      ),
    );
  }
}
