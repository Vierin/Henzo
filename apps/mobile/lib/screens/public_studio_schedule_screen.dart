import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';

import '../constants/layout.dart';

import '../l10n/locale_provider.dart';
import '../services/api_client.dart';

import '../services/auth_service.dart';
import '../services/client_schedule_store.dart';
import '../services/dashboard_api_service.dart';

import '../utils/formatters.dart';
import '../utils/load_error_message.dart';

import '../widgets/common/henzo_header_back_button.dart';
import '../widgets/dashboard/owner_daily_schedule_session_card.dart';

import '../widgets/client/browse_day_pill.dart';
import '../widgets/schedule/calendar_day_pill.dart';
import '../widgets/schedule/schedule_calendar_header.dart';
import '../widgets/schedule/schedule_day_empty_card.dart';
import 'public_class_detail_screen.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

class PublicStudioScheduleScreen extends StatefulWidget {
  const PublicStudioScheduleScreen({
    super.key,

    required this.studioId,

    required this.studioName,

    this.bookingPeriodDays,

    this.studioLocationCount = 1,
  });

  final String studioId;

  final String studioName;

  final int? bookingPeriodDays;

  final int studioLocationCount;

  @override
  State<PublicStudioScheduleScreen> createState() =>
      _PublicStudioScheduleScreenState();
}

class _PublicStudioScheduleScreenState
    extends State<PublicStudioScheduleScreen> {
  static const double _kDayPillGap = 7;

  static const int _defaultBookingPeriodDays = 30;

  static const int _minBookingPeriodDays = 1;

  static const int _maxBookingPeriodDays = 60;

  final Map<int, List<Map<String, dynamic>>> _sessionsByDay =
      <int, List<Map<String, dynamic>>>{};

  late final ScrollController _dayStripScrollController;

  double? _dayStripViewportWidth;
  final CalendarDayStripScrollHaptics _dayStripHaptics =
      CalendarDayStripScrollHaptics();

  late final ValueNotifier<DateTime> _stripDayNotifier;

  late final ValueNotifier<DateTime> _scheduleDayNotifier;

  final ValueNotifier<DateTime> _stripPagerDayNotifier = ValueNotifier(
    DateTime.now(),
  );

  late DateTime _minBookableDay;

  late DateTime _maxBookableDay;

  bool _loading = true;

  String? _loadError;

  bool _isMonthExpanded = false;

  Set<String> _bookedSessionIds = {};

  @override
  void initState() {
    super.initState();

    final now = DateTime.now();
    final today = _normalizeDay(now);

    _stripDayNotifier = ValueNotifier<DateTime>(today);
    _scheduleDayNotifier = ValueNotifier<DateTime>(today);
    _stripPagerDayNotifier.value = today;

    _minBookableDay = today;

    _maxBookableDay = today.add(
      const Duration(days: _defaultBookingPeriodDays),
    );

    _dayStripScrollController = ScrollController();
    _dayStripScrollController.addListener(_onStripScrolled);

    _loadSchedule();
  }

  @override
  void dispose() {
    _dayStripScrollController.removeListener(_onStripScrolled);
    _stripDayNotifier.dispose();
    _scheduleDayNotifier.dispose();
    _stripPagerDayNotifier.dispose();
    _dayStripScrollController.dispose();

    super.dispose();
  }

  void _onStripScrolled() {
    final w = _dayStripViewportWidth;
    if (w == null || !_dayStripScrollController.hasClients) return;
    final stride = _dayStride(w);
    if (stride <= 0) return;
    final index = (_dayStripScrollController.offset / stride)
        .round()
        .clamp(0, _bookableDayCount - 1);
    _dayStripHaptics.onScrollIndex(index);
    final day = _bookableDayAt(index);
    final normalized = _normalizeDay(day);
    if (_stripPagerDayNotifier.value == normalized) return;
    _stripPagerDayNotifier.value = normalized;
  }

  int get _bookableDayCount =>
      _maxBookableDay.difference(_minBookableDay).inDays + 1;

  DateTime _bookableDayAt(int index) =>
      _minBookableDay.add(Duration(days: index));

  Future<void> _loadSchedule() async {
    if (!mounted) return;

    setState(() {
      _loading = true;

      _loadError = null;
    });

    try {
      final parsedBookingPeriod =
          (widget.bookingPeriodDays ?? _defaultBookingPeriodDays).clamp(
            _minBookingPeriodDays,
            _maxBookingPeriodDays,
          );

      final now = DateTime.now();

      final minDay = _normalizeDay(now);

      final maxDay = minDay.add(Duration(days: parsedBookingPeriod));

      final clampedSelectedDay = _clampDay(
        _scheduleDayNotifier.value,
        minDay,
        maxDay,
      );

      // Full bookable window (not only from selected day — avoids gaps on reload).
      final from = minDay;
      final to = endOfLocalDay(maxDay);

      final raw = await ApiClient.get(
        '/studios/${widget.studioId}/schedule?from=${Uri.encodeComponent(from.toUtc().toIso8601String())}&to=${Uri.encodeComponent(to.toUtc().toIso8601String())}&limit=500',

        null,
      );

      final list = raw is List
          ? raw
          : (raw is Map<String, dynamic> && raw['data'] is List
                ? raw['data'] as List
                : <dynamic>[]);

      final grouped = <int, List<Map<String, dynamic>>>{};

      for (final item in list) {
        if (item is! Map) continue;

        final map = Map<String, dynamic>.from(item);

        final startsAt = parseApiDateTime(map['startsAt']);

        if (startsAt == null) continue;

        final key = _dayKey(startsAt);

        (grouped[key] ??= <Map<String, dynamic>>[]).add(map);
      }

      for (final sessions in grouped.values) {
        sessions.sort((a, b) {
          final aa =
              parseApiDateTime(a['startsAt']) ??
              DateTime.fromMillisecondsSinceEpoch(0);

          final bb =
              parseApiDateTime(b['startsAt']) ??
              DateTime.fromMillisecondsSinceEpoch(0);

          return aa.compareTo(bb);
        });
      }

      if (!mounted) return;

      final selectedKey = _dayKey(clampedSelectedDay);

      DateTime? nextDayWithSessions;

      if (!grouped.containsKey(selectedKey) && grouped.isNotEmpty) {
        final sortedKeys = grouped.keys.toList()..sort();

        final fallbackKey = sortedKeys.firstWhere(
          (k) => k >= selectedKey,

          orElse: () => sortedKeys.first,
        );

        nextDayWithSessions = _dateFromDayKey(fallbackKey);
      }

      final scheduleDay = nextDayWithSessions != null
          ? _clampDay(nextDayWithSessions, minDay, maxDay)
          : clampedSelectedDay;

      setState(() {
        _sessionsByDay
          ..clear()
          ..addAll(grouped);

        _minBookableDay = minDay;

        _maxBookableDay = maxDay;

        _stripDayNotifier.value = scheduleDay;
        _scheduleDayNotifier.value = scheduleDay;
        _stripPagerDayNotifier.value = scheduleDay;

        _loading = false;

        _loadError = null;
      });
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _scrollScheduleStripToIndex(
          _scheduleStripIndexForWeekStart(scheduleDay),
        );
      });
      _loadBookedSessionIds();
    } catch (e) {
      if (!mounted) return;

      setState(() {
        _loading = false;

        _loadError = loadErrorMessage(context.read<LocaleProvider>(), e);
      });
    }
  }

  Future<void> _loadBookedSessionIds() async {
    if (!mounted) return;
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) return;
    try {
      final items = await ClientScheduleStore.loadFullSchedule(token);
      if (!mounted) return;
      final ids = <String>{};
      for (final item in items) {
        final sid = item['sessionId']?.toString();
        if (sid != null && sid.isNotEmpty) ids.add(sid);
      }
      setState(() => _bookedSessionIds = ids);
    } catch (_) {}
  }

  int _dayKey(DateTime d) => d.year * 10000 + d.month * 100 + d.day;

  DateTime _normalizeDay(DateTime d) => DateTime(d.year, d.month, d.day);

  DateTime _clampDay(DateTime d, DateTime minDay, DateTime maxDay) {
    final normalized = _normalizeDay(d);

    if (normalized.isBefore(minDay)) return minDay;

    if (normalized.isAfter(maxDay)) return maxDay;

    return normalized;
  }

  bool _isDayInRange(DateTime day) {
    final normalized = _normalizeDay(day);

    return !normalized.isBefore(_minBookableDay) &&
        !normalized.isAfter(_maxBookableDay);
  }

  DateTime _dateFromDayKey(int key) {
    final year = key ~/ 10000;

    final month = (key % 10000) ~/ 100;

    final day = key % 100;

    return DateTime(year, month, day);
  }

  List<Map<String, dynamic>> _sessionsForDay(DateTime day) {
    return _sessionsByDay[_dayKey(day)] ?? const [];
  }

  double _dayPillWidth(double viewportWidth) =>
      viewportWidth / 7 - _kDayPillGap;

  double _dayStride(double viewportWidth) => viewportWidth / 7;

  void _scrollScheduleStripToIndex(
    int index, {
    bool animate = false,
  }) {
    void tryScroll() {
      final w = _dayStripViewportWidth;
      if (w == null || !_dayStripScrollController.hasClients) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) tryScroll();
        });
        return;
      }
      final offset = index.clamp(0, _bookableDayCount - 1) * _dayStride(w);
      final clampedIndex = index.clamp(0, _bookableDayCount - 1);
      if (animate) {
        _dayStripHaptics.animateScroll(
          _dayStripScrollController,
          offset: offset,
          index: clampedIndex,
        );
      } else {
        _dayStripHaptics.jumpScroll(
          _dayStripScrollController,
          offset: offset,
          index: clampedIndex,
        );
      }
    }

    tryScroll();
  }

  void _applyScheduleDay(DateTime day) {
    final normalized = _normalizeDay(day);
    if (!_isDayInRange(normalized)) return;
    _stripDayNotifier.value = normalized;
    _scheduleDayNotifier.value = normalized;
    _stripPagerDayNotifier.value = normalized;
  }

  int _scheduleStripIndexForWeekStart(DateTime day) =>
      CalendarDayPill.stripIndexForWeekStart(
        day: day,
        stripStart: _minBookableDay,
        itemCount: _bookableDayCount,
      );

  void _goToToday() {
    final today = _normalizeDay(DateTime.now());
    if (!_isDayInRange(today)) return;
    _applyScheduleDay(today);
    _scrollScheduleStripToIndex(
      _scheduleStripIndexForWeekStart(today),
      animate: true,
    );
  }

  void _jumpScheduleToDay(DateTime day) {
    final normalized = _normalizeDay(day);
    if (!_isDayInRange(normalized)) return;
    _applyScheduleDay(normalized);
    _scrollScheduleStripToIndex(
      _scheduleStripIndexForWeekStart(normalized),
      animate: true,
    );
  }

  void _syncStripPagerToSelectedDay() {
    _scrollScheduleStripToIndex(
      _scheduleStripIndexForWeekStart(_stripDayNotifier.value),
      animate: true,
    );
  }

  List<DateTime?> _scheduleMonthCells(DateTime monthDate) {
    final firstDay = DateTime(monthDate.year, monthDate.month, 1);
    final daysInMonth = DateUtils.getDaysInMonth(
      monthDate.year,
      monthDate.month,
    );
    final startOffset = firstDay.weekday - 1;
    final totalCells = ((startOffset + daysInMonth + 6) ~/ 7) * 7;
    return List.generate(totalCells, (index) {
      final dayNum = index - startOffset + 1;
      if (dayNum < 1 || dayNum > daysInMonth) return null;
      return DateTime(monthDate.year, monthDate.month, dayNum);
    });
  }

  Widget _buildScheduleMonthExpanded(DateTime monthAnchor) {
    final monthStart = DateTime(monthAnchor.year, monthAnchor.month, 1);
    final cells = _scheduleMonthCells(monthStart);
    const dow = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    return Container(
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
                    dow[i],
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
          ValueListenableBuilder<DateTime>(
            valueListenable: _stripDayNotifier,
            builder: (context, selectedDay, _) {
              return GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: cells.length,
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 7,
                  mainAxisSpacing: 8,
                  crossAxisSpacing: 4,
                  childAspectRatio: 1,
                ),
                itemBuilder: (_, index) {
                  final day = cells[index];
                  if (day == null) return const SizedBox.shrink();
                  final inRange = _isDayInRange(day);
                  final selected = CalendarDayPill.isSameDay(day, selectedDay);
                  return Center(
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        customBorder: const CircleBorder(),
                        onTap: inRange
                            ? () {
                                setState(() => _isMonthExpanded = false);
                                _jumpScheduleToDay(day);
                              }
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
                                  : AppColors.backgroundTertiary,
                            ),
                            child: Text(
                              '${day.day}',
                              style: TextStyle(
                                fontSize: 14.sp,
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
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _scheduleTodayButton() {
    return Material(
      color: AppColors.primary500,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: _goToToday,
        borderRadius: BorderRadius.circular(999),
        child: SizedBox(
          height: 30,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Center(
              child: Text(
                'Today',
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

  static const _dayStripBlockHeight = 78.0; // 4 gap + Browse strip (~74)

  void _toggleScheduleMonthExpanded() {
    final wasExpanded = _isMonthExpanded;
    setState(() => _isMonthExpanded = !_isMonthExpanded);
    if (wasExpanded) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _syncStripPagerToSelectedDay();
      });
    }
  }

  Widget _buildCalendarHeader({required bool showMonthLabel}) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 4, 0, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              HenzoHeaderBackButton(
                onPressed: () => Navigator.of(context).pop(),
                leadingPadding: 0,
              ),
              const Spacer(),
              _scheduleTodayButton(),
              const SizedBox(width: 8),
              ScheduleCalendarExpandButton(
                isExpanded: _isMonthExpanded,
                expandLabel: context.read<LocaleProvider>().t('common.expand'),
                collapseLabel:
                    context.read<LocaleProvider>().t('common.collapse'),
                onTap: _toggleScheduleMonthExpanded,
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (showMonthLabel)
            ValueListenableBuilder<DateTime>(
              valueListenable: _stripPagerDayNotifier,
              builder: (context, pagerDay, _) {
                return Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    CalendarDayPill.monthYearUpper(
                      pagerDay,
                      context.read<LocaleProvider>().localeCode,
                    ),
                    style: TextStyle(
                      fontSize: 14.sp,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.3,
                      color: AppColors.textPrimary,
                    ),
                  ),
                );
              },
            )
          else
            const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildCalendarSection({required bool showMonthLabel}) {
    return Container(
      color: AppColors.backgroundSecondary,
      padding: const EdgeInsets.fromLTRB(
        kScreenPaddingHorizontal,
        0,
        kScreenPaddingHorizontal,
        10,
      ),
      child: Column(
        children: [
          _buildCalendarHeader(showMonthLabel: showMonthLabel),
          if (_loading)
            const SizedBox(height: _dayStripBlockHeight)
          else if (!_isMonthExpanded) ...[
            const SizedBox(height: 4),
            _buildDayStrip(),
          ] else
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: ValueListenableBuilder<DateTime>(
                valueListenable: _stripDayNotifier,
                builder: (context, stripDay, _) =>
                    _buildScheduleMonthExpanded(stripDay),
              ),
            ),
        ],
      ),
    );
  }

  OwnerTrainingSession? _mapOwnerSession(Map<String, dynamic> item) {
    final training = item['training'] is Map
        ? Map<String, dynamic>.from(item['training'] as Map)
        : <String, dynamic>{};

    final startsAt = parseApiDateTime(item['startsAt']);

    if (startsAt == null) return null;

    final durationMin = (training['duration'] as num?)?.toInt() ?? 60;

    final endsAt =
        parseApiDateTime(item['endsAt']) ??
        startsAt.add(Duration(minutes: durationMin));

    final trainer = item['trainer'] is Map
        ? Map<String, dynamic>.from(item['trainer'] as Map)
        : <String, dynamic>{};

    return OwnerTrainingSession(
      sessionId: (item['id'] ?? item['sessionId'] ?? '').toString(),

      trainingId: (training['id'] ?? '').toString(),

      startsAt: startsAt,

      endsAt: endsAt,

      status: (item['status'] ?? 'ACTIVE').toString(),

      capacity: (item['capacity'] as num?)?.toInt() ?? 0,

      enrolledCount: (item['bookedCount'] as num?)?.toInt() ?? 0,

      attendedCount: (item['bookedCount'] as num?)?.toInt() ?? 0,

      trainingName: (training['name'] ?? 'Class').toString(),

      trainingPrice: (training['price'] as num?)?.toDouble(),

      trainingDurationMinutes: durationMin,

      trainingDisplayColorHex: training['displayColor']?.toString(),
      trainingLanguage: (training['language'] as String?)?.trim().isNotEmpty ==
              true
          ? (training['language'] as String).trim()
          : null,
      trainerName: (trainer['name'] ?? '').toString().trim(),

      trainerId: trainer['id']?.toString(),

      locationId: item['locationId']?.toString(),

      locationName: item['locationName']?.toString(),
    );
  }

  void _openClassDetail(Map<String, dynamic> raw) {
    final sessionId = (raw['id'] ?? raw['sessionId'] ?? '').toString();
    final startsAt = parseApiDateTime(raw['startsAt']);
    if (sessionId.isEmpty || startsAt == null) return;

    Navigator.of(context)
        .push(
          MaterialPageRoute(
            builder: (_) => PublicClassDetailScreen(
              studioId: widget.studioId,
              sessionId: sessionId,
              sessionStartsAtHint: startsAt,
            ),
          ),
        )
        .then((_) {
          if (mounted) _loadSchedule();
        });
  }

  Widget _buildDayStrip() {
    return LayoutBuilder(
      builder: (context, constraints) {
        _dayStripViewportWidth = constraints.maxWidth;
        final viewportWidth = constraints.maxWidth;
        final pillWidth = _dayPillWidth(viewportWidth);
        final stripHeight = pillWidth * 3 / 2;
        return SizedBox(
          height: stripHeight,
          child: NotificationListener<ScrollNotification>(
            onNotification: (ScrollNotification n) {
              if (n.metrics.axis != Axis.horizontal) return false;
              _onStripScrolled();
              return false;
            },
            child: ListView.separated(
              controller: _dayStripScrollController,
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(
                parent: AlwaysScrollableScrollPhysics(),
              ),
              clipBehavior: Clip.none,
              itemCount: _bookableDayCount,
              separatorBuilder: (context, index) =>
                  const SizedBox(width: _kDayPillGap),
              itemBuilder: (_, index) {
                final day = _bookableDayAt(index);
                return SizedBox(
                  width: pillWidth,
                  child: ValueListenableBuilder<DateTime>(
                    valueListenable: _stripDayNotifier,
                    builder: (context, stripDay, _) {
                      final selected = CalendarDayPill.isSameDay(day, stripDay);
                      return BrowseDayPill(
                        day: day,
                        selected: selected,
                        localeCode: context
                            .read<LocaleProvider>()
                            .localeCode,
                        onTap: _isDayInRange(day)
                            ? () => _applyScheduleDay(day)
                            : null,
                      );
                    },
                  ),
                );
              },
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: SafeArea(
        child: Column(
          children: [
            _buildCalendarSection(showMonthLabel: !_loading),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : ValueListenableBuilder<DateTime>(
                      valueListenable: _scheduleDayNotifier,
                      builder: (context, scheduleDay, _) {
                        final sessions = _sessionsForDay(scheduleDay);
                        if (_loadError != null) {
                          return Center(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 24,
                              ),

                              child: Column(
                                mainAxisSize: MainAxisSize.min,

                                children: [
                                  Text(
                                    'Failed to load schedule',

                                    style: TextStyle(
                                      fontWeight: FontWeight.w700,

                                      color: AppColors.textPrimary,
                                    ),
                                  ),

                                  const SizedBox(height: 8),

                                  Text(
                                    _loadError!,

                                    textAlign: TextAlign.center,

                                    style: TextStyle(
                                      color: AppColors.textSecondary,
                                    ),
                                  ),

                                  const SizedBox(height: 12),

                                  FilledButton(
                                    onPressed: _loadSchedule,
                                    child: const Text('Retry'),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }
                        if (sessions.isEmpty) {
                          final locale = context.watch<LocaleProvider>();
                          return ListView(
                            padding: const EdgeInsets.fromLTRB(
                              kScreenPaddingHorizontal,
                              12,
                              kScreenPaddingHorizontal,
                              24,
                            ),
                            children: [
                              ScheduleDayEmptyCard(
                                title: locale.t(
                                  'schedule.noTrainingsSelectedDay',
                                ),
                              ),
                            ],
                          );
                        }
                        return ListView.separated(
                          padding: const EdgeInsets.fromLTRB(12, 4, 12, 24),
                          itemCount: sessions.length,
                          separatorBuilder: (_, _) =>
                              const SizedBox(height: 8),
                          itemBuilder: (_, index) {
                            final raw = sessions[index];
                            final session = _mapOwnerSession(raw);
                            if (session == null) {
                              return const SizedBox.shrink();
                            }
                            final loc =
                                session.locationName?.trim() ?? '';
                            final studioLabel =
                                widget.studioName.trim().isNotEmpty
                                ? widget.studioName.trim()
                                : 'Studio';
                            final subtitle =
                                loc.isNotEmpty ? loc : studioLabel;
                            final trainerLine = scheduleTrainerLineOrNull(
                              session,
                              null,
                            );
                            final price = session.trainingPrice;
                            final rawSessionId =
                                (raw['id'] ?? raw['sessionId'] ?? '')
                                    .toString();
                            final alreadyBooked =
                                _bookedSessionIds.contains(rawSessionId);
                            return OwnerDailyScheduleSessionCard(
                              session: session,
                              subtitleLabel: subtitle,
                              showLocationPin: loc.isNotEmpty,
                              trainerLine: trainerLine,
                              showSubtitleLeadingIcon:
                                  subtitle.isNotEmpty,
                              dimPastSessions: false,
                              trailingPriceLabel: price != null
                                  ? formatVnd(price)
                                  : null,
                              trailingPriceColor: AppColors.textPrimary,
                              bookActionLabel: context
                                  .read<LocaleProvider>()
                                  .t('booking.book'),
                              onBookAgain: alreadyBooked
                                  ? null
                                  : () => _openClassDetail(raw),
                              isBooked: alreadyBooked,
                              onTap: () => _openClassDetail(raw),
                            );
                          },
                        );
                    },
                  ),
            ),
          ],
        ),
      ),
    );
  }
}
