import 'dart:async';

import 'package:flutter/material.dart';

import '../constants/brand_typography.dart';

import '../constants/colors.dart';

import '../constants/layout.dart';

import '../services/api_client.dart';

import '../services/dashboard_api_service.dart';

import '../utils/formatters.dart';

import '../widgets/dashboard/owner_daily_schedule_session_card.dart';

import '../widgets/schedule/calendar_day_pill.dart';
import 'public_class_detail_screen.dart';

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
  static const int _defaultBookingPeriodDays = 28;

  static const int _minBookingPeriodDays = 1;

  static const int _maxBookingPeriodDays = 60;

  static const Duration _kStripScheduleDebounce = Duration(milliseconds: 1400);

  final Map<int, List<Map<String, dynamic>>> _sessionsByDay =
      <int, List<Map<String, dynamic>>>{};

  late final PageController _dayPagerController;

  late final ValueNotifier<DateTime> _stripDayNotifier;

  late final ValueNotifier<DateTime> _scheduleDayNotifier;

  final ValueNotifier<DateTime> _stripPagerDayNotifier = ValueNotifier(
    DateTime.now(),
  );

  Timer? _stripScheduleDebounce;

  late DateTime _minBookableDay;

  late DateTime _maxBookableDay;

  bool _loading = true;

  String? _loadError;

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

    _dayPagerController = PageController(
      initialPage: 0,
      viewportFraction: 1 / 7,
    );
    _dayPagerController.addListener(_onStripPagerScrolled);

    _loadSchedule();
  }

  @override
  void dispose() {
    _clearStripScheduleDebounceTimer();
    _dayPagerController.removeListener(_onStripPagerScrolled);
    _stripDayNotifier.dispose();
    _scheduleDayNotifier.dispose();
    _stripPagerDayNotifier.dispose();
    _dayPagerController.dispose();

    super.dispose();
  }

  void _clearStripScheduleDebounceTimer() {
    _stripScheduleDebounce?.cancel();
    _stripScheduleDebounce = null;
  }

  void _onStripPagerScrolled() {
    if (!mounted || !_dayPagerController.hasClients) return;
    final page = _dayPagerController.page;
    if (page == null) return;
    final day = _bookableDayAt(page.round().clamp(0, _bookableDayCount - 1));
    final normalized = DateTime(day.year, day.month, day.day);
    if (_stripPagerDayNotifier.value == normalized) return;
    _stripPagerDayNotifier.value = normalized;
  }

  void _debounceStripAndScheduleDay(DateTime day) {
    _clearStripScheduleDebounceTimer();
    _stripScheduleDebounce = Timer(_kStripScheduleDebounce, () {
      if (!mounted) return;
      _stripDayNotifier.value = day;
      _scheduleDayNotifier.value = day;
      _stripScheduleDebounce = null;
    });
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

      setState(() {
        _sessionsByDay
          ..clear()
          ..addAll(grouped);

        _minBookableDay = minDay;

        _maxBookableDay = maxDay;

        final scheduleDay = nextDayWithSessions != null
            ? _clampDay(nextDayWithSessions, minDay, maxDay)
            : clampedSelectedDay;

        _stripDayNotifier.value = scheduleDay;
        _scheduleDayNotifier.value = scheduleDay;
        _stripPagerDayNotifier.value = scheduleDay;

        _loading = false;

        _loadError = null;
      });
    } catch (e) {
      if (!mounted) return;

      setState(() {
        _loading = false;

        _loadError = e.toString();
      });
    }
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

  String _monthTitle(DateTime d) => CalendarDayPill.monthDayYearUpperEn(d);

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
    return SizedBox(
      height: 86,
      child: NotificationListener<ScrollNotification>(
        onNotification: (ScrollNotification n) {
          if (n.metrics.axis == Axis.horizontal) {
            _onStripPagerScrolled();
          }
          return false;
        },
        child: PageView.builder(
          controller: _dayPagerController,
          physics: const SmoothDayPageScrollPhysics(),
          padEnds: false,
          itemCount: _bookableDayCount,
          onPageChanged: (index) {
            final day = _bookableDayAt(index);
            final normalized = DateTime(day.year, day.month, day.day);
            if (_stripPagerDayNotifier.value != normalized) {
              _stripPagerDayNotifier.value = normalized;
            }
            if (CalendarDayPill.isSameDay(day, _stripDayNotifier.value) &&
                CalendarDayPill.isSameDay(day, _scheduleDayNotifier.value)) {
              return;
            }
            _debounceStripAndScheduleDay(normalized);
          },
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
                        ? () {
                            _clearStripScheduleDebounceTimer();
                            final normalized = DateTime(
                              day.year,
                              day.month,
                              day.day,
                            );
                            _stripDayNotifier.value = normalized;
                            _scheduleDayNotifier.value = normalized;
                            _stripPagerDayNotifier.value = normalized;
                          }
                        : null,
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,

      appBar: AppBar(
        backgroundColor: AppColors.backgroundSecondary,

        foregroundColor: AppColors.textPrimary,

        elevation: 0,

        scrolledUnderElevation: 0,

        title: Text('Schedule', style: BrandTypography.appBarTitle(context)),
      ),

      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Container(
                  color: AppColors.backgroundSecondary,

                  padding: const EdgeInsets.fromLTRB(
                    kScreenPaddingHorizontal,

                    8,

                    kScreenPaddingHorizontal,

                    10,
                  ),

                  child: Column(
                    children: [
                      ValueListenableBuilder<DateTime>(
                        valueListenable: _stripPagerDayNotifier,
                        builder: (context, pagerDay, _) {
                          return Text(
                            _monthTitle(pagerDay),
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.3,
                              color: AppColors.textPrimary,
                            ),
                          );
                        },
                      ),

                      const SizedBox(height: 8),

                      _buildDayStrip(),

                      const SizedBox(height: 8),

                      Text(
                        'Booking window: '
                        '${_monthTitle(_minBookableDay)} – '
                        '${_monthTitle(_maxBookableDay)}',

                        style: const TextStyle(
                          fontSize: 12,

                          color: AppColors.textSecondary,

                          fontWeight: FontWeight.w500,

                          letterSpacing: -0.3,
                        ),
                      ),
                    ],
                  ),
                ),

                Expanded(
                  child: ValueListenableBuilder<DateTime>(
                    valueListenable: _scheduleDayNotifier,
                    builder: (context, scheduleDay, _) {
                      final sessions = _sessionsForDay(scheduleDay);
                      if (_loadError != null) {
                        return Center(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 24),

                            child: Column(
                              mainAxisSize: MainAxisSize.min,

                              children: [
                                const Text(
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

                                  style: const TextStyle(
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
                      return ListView.builder(
                          padding: const EdgeInsets.fromLTRB(
                            kScreenPaddingHorizontal,

                            12,

                            kScreenPaddingHorizontal,

                            24,
                          ),

                          itemCount: sessions.length,

                          itemBuilder: (_, index) {
                            final raw = sessions[index];

                            final session = _mapOwnerSession(raw);

                            if (session == null) {
                              return const SizedBox.shrink();
                            }

                            final locName =
                                session.locationName?.trim() ?? '';
                            final hasMultiple =
                                widget.studioLocationCount > 1;
                            final studioLabel =
                                widget.studioName.trim().isNotEmpty
                                ? widget.studioName.trim()
                                : 'Studio';
                            final subtitleLabel = hasMultiple
                                ? (locName.isNotEmpty
                                      ? locName
                                      : studioLabel)
                                : studioLabel;
                            final rows = layoutOwnerSessionCardRows(
                              session: session,
                              subtitleLabel: subtitleLabel,
                              showLocationPin: hasMultiple,
                            );

                            final price = session.trainingPrice;

                            return OwnerDailyScheduleSessionCard(
                              session: session,

                              subtitleLabel: rows.subtitleLabel,

                              showLocationPin: rows.showLocationPin,

                              showSubtitleLeadingIcon:
                                  rows.showSubtitleLeadingIcon,

                              trainerLine: rows.trainerLine,

                              dimPastSessions: false,

                              trailingPriceLabel: price != null
                                  ? formatVnd(price)
                                  : null,

                              bookActionLabel: 'Book',

                              onBookAgain: () => _openClassDetail(raw),

                              onTap: () => _openClassDetail(raw),
                            );
                          },
                        );
                    },
                  ),
                ),
              ],
            ),
    );
  }
}
