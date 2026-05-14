import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../l10n/locale_provider.dart';

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

/// Month grid matching Schedule expanded calendar; header row: ◀ month ▶.
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

  return showModalBottomSheet<DateTime>(
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
  late DateTime _monthFirst;
  late DateTime _selected;

  @override
  void initState() {
    super.initState();
    _selected = widget.initialSelected;
    _monthFirst = DateTime(_selected.year, _selected.month, 1);
    if (!_monthIntersectsRange(
      _monthFirst,
      widget.firstDate,
      widget.lastDate,
    )) {
      _monthFirst = DateTime(widget.firstDate.year, widget.firstDate.month, 1);
    }
  }

  bool _sameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  bool _inRange(DateTime d) =>
      !d.isBefore(widget.firstDate) && !d.isAfter(widget.lastDate);

  bool _canPrevMonth() {
    final prev = DateTime(_monthFirst.year, _monthFirst.month - 1, 1);
    return _monthIntersectsRange(prev, widget.firstDate, widget.lastDate);
  }

  bool _canNextMonth() {
    final next = DateTime(_monthFirst.year, _monthFirst.month + 1, 1);
    return _monthIntersectsRange(next, widget.firstDate, widget.lastDate);
  }

  void _prevMonth() {
    if (!_canPrevMonth()) return;
    setState(
      () => _monthFirst = DateTime(_monthFirst.year, _monthFirst.month - 1, 1),
    );
  }

  void _nextMonth() {
    if (!_canNextMonth()) return;
    setState(
      () => _monthFirst = DateTime(_monthFirst.year, _monthFirst.month + 1, 1),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cells = _monthCells(_monthFirst);
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
                  onPressed: _canPrevMonth() ? _prevMonth : null,
                  icon: const Icon(Icons.chevron_left_rounded),
                  color: AppColors.textSecondary,
                ),
                Expanded(
                  child: Text(
                    _monthYearLabel(_monthFirst),
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.3,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: _canNextMonth() ? _nextMonth : null,
                  icon: const Icon(Icons.chevron_right_rounded),
                  color: AppColors.textSecondary,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(12, 16, 12, 16),
              decoration: BoxDecoration(
                color: AppColors.backgroundPrimary,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                children: [
                  Row(
                    children: List.generate(
                      7,
                      (i) => Expanded(
                        child: Center(
                          child: Text(
                            _kDow[i],
                            style: const TextStyle(
                              fontSize: 11,
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
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 7,
                          mainAxisSpacing: 8,
                          crossAxisSpacing: 4,
                          childAspectRatio: 1.0,
                        ),
                    itemBuilder: (_, index) {
                      final day = cells[index];
                      if (day == null) return const SizedBox.shrink();
                      final inRange = _inRange(day);
                      final selected = _sameDay(day, _selected);
                      final today = _sameDay(day, DateTime.now());
                      return Center(
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            customBorder: const CircleBorder(),
                            onTap: inRange
                                ? () => setState(() => _selected = day)
                                : null,
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
                                        : AppColors.borderPrimary.withValues(
                                            alpha: 0.5,
                                          ),
                                  ),
                                ),
                                child: Text(
                                  '${day.day}',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                    color: selected
                                        ? Colors.white
                                        : AppColors.textPrimary,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Consumer<LocaleProvider>(
              builder: (context, loc, _) {
                return Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.of(context).pop(),
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
                          backgroundColor: AppColors.primary500,
                          foregroundColor: Colors.white,
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
