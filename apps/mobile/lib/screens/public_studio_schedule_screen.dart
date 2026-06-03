import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';

import '../constants/layout.dart';

import '../services/api_client.dart';

import '../services/auth_service.dart';
import '../services/client_schedule_store.dart';
import '../services/dashboard_api_service.dart';

import '../utils/formatters.dart';

import '../widgets/common/henzo_header_back_button.dart';
import '../widgets/dashboard/owner_daily_schedule_session_card.dart';

import '../widgets/schedule/calendar_day_pill.dart';
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
  static const int _defaultBookingPeriodDays = 30;

  static const int _minBookingPeriodDays = 1;

  static const int _maxBookingPeriodDays = 60;

  final Map<int, List<Map<String, dynamic>>> _sessionsByDay =
      <int, List<Map<String, dynamic>>>{};

  late final ScrollController _dayStripScrollController;

  double? _dayStripViewportWidth;

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
    final stride = w / 7;
    final index = (_dayStripScrollController.offset / stride)
        .round()
        .clamp(0, _bookableDayCount - 1);
    final day = _bookableDayAt(index);
    final normalized = DateTime(day.year, day.month, day.day);
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

      final from = clampedSelectedDay;

      final to = maxDay;

      final raw = await ApiClient.get(
        '/studios/${widget.studioId}/schedule?from=${Uri.encodeComponent(from.toUtc().toIso8601String())}&to=${Uri.encodeComponent(to.toUtc().toIso8601String())}&limit=400',

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
        if (!mounted || !_dayStripScrollController.hasClients) return;
        final w = _dayStripViewportWidth;
        if (w == null) return;
        final index = scheduleDay.difference(_minBookableDay).inDays;
        _dayStripScrollController.jumpTo(index * w / 7);
      });
      _loadBookedSessionIds();
    } catch (e) {
      if (!mounted) return;

      setState(() {
        _loading = false;

        _loadError = e.toString();
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

  void _goToToday() {
    _jumpScheduleToDay(DateTime.now());
  }

  void _jumpScheduleToDay(DateTime day) {
    final normalized = _normalizeDay(day);
    if (!_isDayInRange(normalized)) return;
    final index = normalized.difference(_minBookableDay).inDays;
    _stripDayNotifier.value = normalized;
    _scheduleDayNotifier.value = normalized;
    _stripPagerDayNotifier.value = normalized;
    final w = _dayStripViewportWidth;
    if (w != null && _dayStripScrollController.hasClients) {
      _dayStripScrollController.animateTo(
        index * w / 7,
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOutCubic,
      );
    }
  }

  void _syncStripPagerToSelectedDay() {
    _jumpScheduleToDay(_stripDayNotifier.value);
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
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: 14, vertical: 8),
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
    );
  }

  static const _expandButtonLabelWidth = 72.0;
  static const _dayStripBlockHeight = 90.0; // 4 gap + 86 strip

  Widget _scheduleExpandButton() {
    final label = _isMonthExpanded ? 'Collapse' : 'Expand';
    return Material(
      color: AppColors.backgroundPrimary,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: () {
          final wasExpanded = _isMonthExpanded;
          setState(() => _isMonthExpanded = !_isMonthExpanded);
          if (wasExpanded) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (!mounted) return;
              _syncStripPagerToSelectedDay();
            });
          }
        },
        borderRadius: BorderRadius.circular(999),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
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
              SizedBox(
                width: _expandButtonLabelWidth,
                child: Text(
                  label,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13.sp,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                    height: 1.1,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
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
              ),
              const Spacer(),
              _scheduleTodayButton(),
              const SizedBox(width: 8),
              _scheduleExpandButton(),
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
                    CalendarDayPill.monthYearUpperEn(pagerDay),
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
        final stride = constraints.maxWidth / 7;
        return SizedBox(
          height: 86,
          child: NotificationListener<ScrollNotification>(
            onNotification: (ScrollNotification n) {
              if (n.metrics.axis != Axis.horizontal) return false;
              _onStripScrolled();
              if (n is ScrollEndNotification) {
                final w = _dayStripViewportWidth;
                if (w == null || !_dayStripScrollController.hasClients) {
                  return false;
                }
                final s = w / 7;
                final index = (_dayStripScrollController.offset / s)
                    .round()
                    .clamp(0, _bookableDayCount - 1);
                final target = index * s;
                if ((_dayStripScrollController.offset - target).abs() > 0.5) {
                  _dayStripScrollController.animateTo(
                    target,
                    duration: const Duration(milliseconds: 200),
                    curve: Curves.easeOutCubic,
                  );
                }
              }
              return false;
            },
            child: ListView.builder(
              controller: _dayStripScrollController,
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(
                parent: AlwaysScrollableScrollPhysics(),
              ),
              itemCount: _bookableDayCount,
              itemExtent: stride,
              itemBuilder: (_, index) {
                final day = _bookableDayAt(index);
                return ValueListenableBuilder<DateTime>(
                  valueListenable: _stripDayNotifier,
                  builder: (context, stripDay, _) {
                    final selected = CalendarDayPill.isSameDay(day, stripDay);
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 3),
                      child: CalendarDayPill(
                        day: day,
                        selected: selected,
                        sessionsCount: _sessionsForDay(day).length,
                        enabled: _isDayInRange(day),
                        onTap: _isDayInRange(day)
                            ? () => _jumpScheduleToDay(day)
                            : null,
                      ),
                    );
                  },
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
                          return Center(
                            child: Text(
                              'No classes for selected day',
                              style: TextStyle(
                                color: AppColors.textSecondary.withValues(
                                  alpha: 0.9,
                                ),
                              ),
                            ),
                          );
                        }
                        return ListView.separated(
                          padding: const EdgeInsets.fromLTRB(12, 4, 12, 24),
                          itemCount: sessions.length,
                          separatorBuilder: (_, __) =>
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
                              bookActionLabel: 'Book',
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
