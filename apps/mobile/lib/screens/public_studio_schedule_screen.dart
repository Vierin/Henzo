import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/brand_typography.dart';
import '../constants/colors.dart';
import '../constants/layout.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../services/dashboard_api_service.dart';
import '../utils/formatters.dart';
import '../widgets/dashboard/owner_daily_schedule_session_card.dart';
import '../widgets/schedule/calendar_day_pill.dart';

class PublicStudioScheduleScreen extends StatefulWidget {
  const PublicStudioScheduleScreen({
    super.key,
    required this.studioId,
    required this.studioName,
    this.bookingPeriodDays,
  });

  final String studioId;
  final String studioName;
  final int? bookingPeriodDays;

  @override
  State<PublicStudioScheduleScreen> createState() =>
      _PublicStudioScheduleScreenState();
}

class _PublicStudioScheduleScreenState extends State<PublicStudioScheduleScreen> {
  static const int _defaultBookingPeriodDays = 28;
  static const int _minBookingPeriodDays = 1;
  static const int _maxBookingPeriodDays = 60;

  final Map<int, List<Map<String, dynamic>>> _sessionsByDay =
      <int, List<Map<String, dynamic>>>{};
  final Set<String> _bookingInProgress = <String>{};
  late DateTime _selectedDay;
  late DateTime _weekStart;
  late DateTime _minBookableDay;
  late DateTime _maxBookableDay;
  bool _loading = true;
  String? _loadError;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _selectedDay = _normalizeDay(now);
    _minBookableDay = _selectedDay;
    _maxBookableDay = _selectedDay.add(
      const Duration(days: _defaultBookingPeriodDays),
    );
    _weekStart = _selectedDay.subtract(Duration(days: _selectedDay.weekday - 1));
    _loadSchedule();
  }

  Future<void> _loadSchedule() async {
    if (!mounted) return;
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      final parsedBookingPeriod = (widget.bookingPeriodDays ??
              _defaultBookingPeriodDays)
          .clamp(_minBookingPeriodDays, _maxBookingPeriodDays);
      final now = DateTime.now();
      final minDay = _normalizeDay(now);
      final maxDay = minDay.add(Duration(days: parsedBookingPeriod));
      final clampedSelectedDay = _clampDay(_selectedDay, minDay, maxDay);
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
          final aa = parseApiDateTime(a['startsAt']) ??
              DateTime.fromMillisecondsSinceEpoch(0);
          final bb = parseApiDateTime(b['startsAt']) ??
              DateTime.fromMillisecondsSinceEpoch(0);
          return aa.compareTo(bb);
        });
      }
      if (!mounted) return;
      final selectedKey = _dayKey(_selectedDay);
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
        _selectedDay = clampedSelectedDay;
        _weekStart = _selectedDay.subtract(Duration(days: _selectedDay.weekday - 1));
        if (nextDayWithSessions != null) {
          final clampedNext = _clampDay(nextDayWithSessions, minDay, maxDay);
          _selectedDay = clampedNext;
          _weekStart = _selectedDay.subtract(Duration(days: _selectedDay.weekday - 1));
        }
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

  bool _canGoPreviousWeek() {
    final next = _selectedDay.subtract(const Duration(days: 7));
    return _isDayInRange(next);
  }

  bool _canGoNextWeek() {
    final next = _selectedDay.add(const Duration(days: 7));
    return _isDayInRange(next);
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
      trainerName: (trainer['name'] ?? '—').toString(),
      trainerId: trainer['id']?.toString(),
    );
  }

  Future<void> _bookSession(Map<String, dynamic> session) async {
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please sign in to book a class')),
      );
      return;
    }

    final sessionId = (session['id'] ?? '').toString();
    if (sessionId.isEmpty || _bookingInProgress.contains(sessionId)) return;
    setState(() => _bookingInProgress.add(sessionId));
    try {
      final raw = await ApiClient.post(
        '/studios/sessions/$sessionId/book',
        token,
        body: const <String, dynamic>{},
      );
      if (!mounted) return;
      final map = raw is Map<String, dynamic> ? raw : <String, dynamic>{};
      final booking = map['booking'] is Map<String, dynamic>
          ? map['booking'] as Map<String, dynamic>
          : null;
      final alreadyBooked = map['alreadyBooked'] == true;
      if (booking != null) {
        session['bookedCount'] =
            (booking['bookedCount'] as num?)?.toInt() ?? session['bookedCount'];
      } else if (!alreadyBooked && session['bookedCount'] is num) {
        session['bookedCount'] = (session['bookedCount'] as num).toInt() + 1;
      }
      setState(() {});
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            alreadyBooked
                ? 'You are already booked for this class'
                : 'You have successfully booked this training',
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Booking failed: $e')),
      );
    } finally {
      if (!mounted) return;
      setState(() => _bookingInProgress.remove(sessionId));
    }
  }

  @override
  Widget build(BuildContext context) {
    final sessions = _sessionsForDay(_selectedDay);
    final canGoPrevWeek = _canGoPreviousWeek();
    final canGoNextWeek = _canGoNextWeek();
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: AppBar(
        backgroundColor: AppColors.backgroundSecondary,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: Text(
          'Schedule',
          style: BrandTypography.appBarTitle(context),
        ),
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
                      Row(
                        children: [
                          IconButton(
                            onPressed: canGoPrevWeek
                                ? () {
                                    setState(() {
                                      _weekStart = _weekStart.subtract(
                                        const Duration(days: 7),
                                      );
                                      _selectedDay = _selectedDay.subtract(
                                        const Duration(days: 7),
                                      );
                                    });
                                  }
                                : null,
                            icon: const Icon(Icons.chevron_left_rounded),
                            color: AppColors.textSecondary,
                          ),
                          Expanded(
                            child: Text(
                              _monthTitle(_selectedDay),
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                letterSpacing: -0.3,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ),
                          IconButton(
                            onPressed: canGoNextWeek
                                ? () {
                                    setState(() {
                                      _weekStart = _weekStart.add(
                                        const Duration(days: 7),
                                      );
                                      _selectedDay = _selectedDay.add(
                                        const Duration(days: 7),
                                      );
                                    });
                                  }
                                : null,
                            icon: const Icon(Icons.chevron_right_rounded),
                            color: AppColors.textSecondary,
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      SizedBox(
                        height: 86,
                        child: Row(
                          children: List.generate(7, (i) {
                            final day = _weekStart.add(Duration(days: i));
                            final isInRange = _isDayInRange(day);
                            final selected = CalendarDayPill.isSameDay(
                              day,
                              _selectedDay,
                            );
                            return Expanded(
                              child: Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 3,
                                ),
                                child: CalendarDayPill(
                                  day: day,
                                  selected: selected,
                                  sessionsCount:
                                      _sessionsForDay(day).length,
                                  enabled: isInRange,
                                  onTap: isInRange
                                      ? () => setState(
                                          () => _selectedDay = day,
                                        )
                                      : null,
                                ),
                              ),
                            );
                          }),
                        ),
                      ),
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
                  child: _loadError != null
                      ? Center(
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
                        )
                      : sessions.isEmpty
                      ? Center(
                          child: Text(
                            'No classes for selected day',
                            style: TextStyle(
                              color: AppColors.textSecondary.withValues(alpha: 0.9),
                            ),
                          ),
                        )
                      : ListView.builder(
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
                            final capacity =
                                (raw['capacity'] as num?)?.toInt() ?? 0;
                            final bookedCount =
                                (raw['bookedCount'] as num?)?.toInt() ?? 0;
                            final hasCapacity = capacity > 0;
                            final isFull =
                                hasCapacity && bookedCount >= capacity;
                            final sessionId =
                                (raw['id'] ?? '').toString();
                            final isBooking =
                                _bookingInProgress.contains(sessionId);
                            final trainerLabel =
                                ownerDailyScheduleTrainerLabel(
                              session,
                              null,
                            );
                            return OwnerDailyScheduleSessionCard(
                              session: session,
                              subtitleLabel: trainerLabel,
                              showSubtitleLeadingIcon: true,
                              dimPastSessions: false,
                              bookActionLabel: 'Book',
                              bookActionLoading: isBooking,
                              onBookAgain: isFull || isBooking
                                  ? null
                                  : () => _bookSession(raw),
                              onTap: () {},
                            );
                          },
                        ),
                ),
              ],
            ),
    );
  }
}
