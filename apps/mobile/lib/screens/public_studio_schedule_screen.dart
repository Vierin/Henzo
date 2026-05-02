import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../utils/color_hex.dart';
import '../widgets/public/class_schedule_card.dart';

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
  static const int _defaultBookingPeriodDays = 14;
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
        final startsAt = DateTime.tryParse((map['startsAt'] ?? '').toString())
            ?.toLocal();
        if (startsAt == null) continue;
        final key = _dayKey(startsAt);
        (grouped[key] ??= <Map<String, dynamic>>[]).add(map);
      }
      for (final sessions in grouped.values) {
        sessions.sort((a, b) {
          final aa = DateTime.tryParse((a['startsAt'] ?? '').toString()) ??
              DateTime.fromMillisecondsSinceEpoch(0);
          final bb = DateTime.tryParse((b['startsAt'] ?? '').toString()) ??
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

  String _weekdayLetter(DateTime day) {
    const names = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    return names[day.weekday - 1];
  }

  String _monthTitle(DateTime d) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return '${months[d.month - 1]} ${d.day}, ${d.year}';
  }

  String _timeLabel(DateTime? dt) {
    if (dt == null) return '--:--';
    final h = dt.hour.toString().padLeft(2, '0');
    final mm = dt.minute.toString().padLeft(2, '0');
    return '$h:$mm';
  }

  String _formatVnd(num value) {
    final digits = value.round().toString();
    final out = StringBuffer();
    for (int i = 0; i < digits.length; i++) {
      out.write(digits[i]);
      final left = digits.length - i - 1;
      if (left > 0 && left % 3 == 0) {
        out.write('.');
      }
    }
    return out.toString();
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
        backgroundColor: AppColors.backgroundPrimary,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        title: const Text(
          'Schedule',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Container(
                  color: AppColors.backgroundPrimary,
                  padding: const EdgeInsets.fromLTRB(12, 6, 12, 10),
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
                            icon: const Icon(Icons.chevron_left),
                          ),
                          Expanded(
                            child: Center(
                              child: Text(
                                _monthTitle(_selectedDay),
                                style: const TextStyle(
                                  fontSize: 30 / 1.6,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
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
                            icon: const Icon(Icons.chevron_right),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: List.generate(7, (i) {
                          final day = _weekStart.add(Duration(days: i));
                          final isInRange = _isDayInRange(day);
                          final selected = day.year == _selectedDay.year &&
                              day.month == _selectedDay.month &&
                              day.day == _selectedDay.day;
                          return Expanded(
                            child: GestureDetector(
                              onTap: isInRange
                                  ? () => setState(() => _selectedDay = day)
                                  : null,
                              child: Column(
                                children: [
                                  Text(
                                    _weekdayLetter(day),
                                    style: TextStyle(
                                      color: isInRange
                                          ? AppColors.textSecondary
                                          : AppColors.textSecondary.withValues(
                                              alpha: 0.38,
                                            ),
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(height: 7),
                                  Container(
                                    width: 40,
                                    height: 40,
                                    decoration: BoxDecoration(
                                      color: selected
                                          ? AppColors.textPrimary
                                          : Colors.transparent,
                                      border: !selected && isInRange
                                          ? Border.all(
                                              color: AppColors.borderPrimary,
                                            )
                                          : null,
                                      shape: BoxShape.circle,
                                    ),
                                    alignment: Alignment.center,
                                    child: Text(
                                      '${day.day}',
                                      style: TextStyle(
                                        color: selected
                                            ? Colors.white
                                            : isInRange
                                            ? AppColors.textPrimary
                                            : AppColors.textSecondary
                                                  .withValues(alpha: 0.38),
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Booking window: ${_monthTitle(_minBookableDay)} - ${_monthTitle(_maxBookableDay)}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1, color: AppColors.borderPrimary),
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
                      : ListView.separated(
                          itemCount: sessions.length,
                          separatorBuilder: (_, __) => const Divider(
                            height: 1,
                            color: AppColors.borderPrimary,
                          ),
                          itemBuilder: (_, index) {
                            final s = sessions[index];
                            final training = s['training'] is Map
                                ? Map<String, dynamic>.from(s['training'] as Map)
                                : <String, dynamic>{};
                            final trainer = s['trainer'] is Map
                                ? (s['trainer']['name'] ?? '').toString()
                                : '';
                            final startsAt = DateTime.tryParse(
                              (s['startsAt'] ?? '').toString(),
                            )?.toLocal();
                            final duration = (training['duration'] as num?)?.toInt();
                            final price = (training['price'] as num?)?.toDouble();
                            final capacity = (s['capacity'] as num?)?.toInt();
                            final bookedCount = (s['bookedCount'] as num?)?.toInt() ?? 0;
                            final trainingColor = parseHexColor(
                              training['displayColor']?.toString(),
                            );
                            final hasCapacity = capacity != null && capacity > 0;
                            final isFull = hasCapacity && bookedCount >= capacity;
                            final sessionId = (s['id'] ?? '').toString();
                            final isBooking = _bookingInProgress.contains(sessionId);
                            return ClassScheduleCard(
                              timeLabel: _timeLabel(startsAt),
                              durationMin: duration,
                              className: (training['name'] ?? 'Class').toString(),
                              trainerName: trainer,
                              priceLabel: price != null ? _formatVnd(price) : null,
                              bookedCount: bookedCount,
                              capacity: capacity,
                              trainingColor: trainingColor,
                              isBooking: isBooking,
                              onBook: isFull ? null : () => _bookSession(s),
                            );
                          },
                        ),
                ),
              ],
            ),
    );
  }
}
