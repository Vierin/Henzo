import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import '../../services/auth_service.dart';
import '../../services/trainer_api_service.dart';
import '../../utils/formatters.dart';
import 'trainer_session_card.dart';
import 'trainer_home_screen.dart' show TrainerSessionEnrollmentsScreen;

class TrainerScheduleScreen extends StatefulWidget {
  const TrainerScheduleScreen({super.key});

  @override
  State<TrainerScheduleScreen> createState() => _TrainerScheduleScreenState();
}

class _TrainerScheduleScreenState extends State<TrainerScheduleScreen> {
  DateTime _selectedDay = DateTime.now();
  Map<String, List<Map<String, dynamic>>> _sessionsByDay = {};
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final token = context.read<AuthService>().accessToken;
    if (token == null) return;
    setState(() => _loading = true);
    try {
      final now = DateTime.now();
      final from = DateTime(now.year, now.month, 1);
      final to = DateTime(now.year, now.month + 2, 0, 23, 59, 59);
      final result = await TrainerApiService.getSessions(token, from: from, to: to);
      final sessions = (result['sessions'] as List?)
              ?.whereType<Map>()
              .map((e) => Map<String, dynamic>.from(e))
              .toList() ??
          [];
      final grouped = <String, List<Map<String, dynamic>>>{};
      for (final s in sessions) {
        final d = parseApiDateTime(s['startsAt'] as String?);
        if (d == null) continue;
        final key = _dayKey(d);
        grouped.putIfAbsent(key, () => []).add(s);
      }
      if (!mounted) return;
      setState(() {
        _sessionsByDay = grouped;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _dayKey(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  List<Map<String, dynamic>> get _selectedSessions =>
      _sessionsByDay[_dayKey(_selectedDay)] ?? [];

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: EdgeInsets.fromLTRB(kScreenPaddingHorizontal, 16, kScreenPaddingHorizontal, 0),
              child: Text(
                locale.t('shell.tabSchedule'),
                style: TextStyle(
                  fontSize: 22.sp,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                  letterSpacing: -0.4,
                ),
              ),
            ),
            const SizedBox(height: 12),
            // Day strip
            _DayStrip(
              selected: _selectedDay,
              hasSessions: (d) => _sessionsByDay.containsKey(_dayKey(d)),
              onSelect: (d) => setState(() => _selectedDay = d),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _selectedSessions.isEmpty
                  ? Center(
                      child: Text(
                        locale.t('dashboard.noClassesToday'),
                        style: TextStyle(color: AppColors.textSecondary, fontSize: 14.sp),
                      ),
                    )
                  : ListView.builder(
                      padding: EdgeInsets.symmetric(
                        horizontal: kScreenPaddingHorizontal,
                        vertical: 4,
                      ),
                      itemCount: _selectedSessions.length,
                      itemBuilder: (_, i) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: TrainerSessionCard(
                          session: _selectedSessions[i],
                          onTap: () => Navigator.of(context).push(
                            MaterialPageRoute<void>(
                              builder: (_) => TrainerSessionEnrollmentsScreen(
                                session: _selectedSessions[i],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DayStrip extends StatefulWidget {
  const _DayStrip({
    required this.selected,
    required this.hasSessions,
    required this.onSelect,
  });

  final DateTime selected;
  final bool Function(DateTime) hasSessions;
  final ValueChanged<DateTime> onSelect;

  @override
  State<_DayStrip> createState() => _DayStripState();
}

class _DayStripState extends State<_DayStrip> {
  final _scrollController = ScrollController();
  bool _isUserScrolling = false;

  static const double _itemWidth = 48;
  static const double _itemMargin = 3;
  static const double _itemExtent = _itemWidth + _itemMargin * 2;

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _snapToNearest() {
    final offset = _scrollController.offset;
    final nearest = (offset / _itemExtent).round() * _itemExtent;
    final clamped = nearest.clamp(
      _scrollController.position.minScrollExtent,
      _scrollController.position.maxScrollExtent,
    );
    if ((clamped - offset).abs() < 0.5) return;
    _scrollController.animateTo(
      clamped,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOut,
    );
  }

  String _dayKey(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  String _weekdayShort(DateTime d) {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return labels[d.weekday - 1];
  }

  @override
  Widget build(BuildContext context) {
    final today = DateTime.now();
    final days = List.generate(
      31,
      (i) => DateTime(today.year, today.month, today.day + i - 7),
    );

    return SizedBox(
      height: 64,
      child: NotificationListener(
        onNotification: (notification) {
          if (notification is ScrollStartNotification &&
              notification.dragDetails != null) {
            _isUserScrolling = true;
          }
          if (notification is ScrollEndNotification && _isUserScrolling) {
            _isUserScrolling = false;
            _snapToNearest();
          }
          return false;
        },
        child: ListView.builder(
          controller: _scrollController,
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          itemCount: days.length,
          itemBuilder: (_, i) {
            final d = days[i];
            final isSelected = _dayKey(d) == _dayKey(widget.selected);
            final hasDot = widget.hasSessions(d);
            return GestureDetector(
              onTap: () => widget.onSelect(d),
              child: Container(
                width: _itemWidth,
                margin: const EdgeInsets.symmetric(horizontal: _itemMargin),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.primary500 : Colors.white,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      _weekdayShort(d),
                      style: TextStyle(
                        fontSize: 10.sp,
                        color: isSelected
                            ? Colors.white70
                            : AppColors.textSecondary,
                      ),
                    ),
                    Text(
                      '${d.day}',
                      style: TextStyle(
                        fontSize: 16.sp,
                        fontWeight: FontWeight.w700,
                        color: isSelected
                            ? Colors.white
                            : AppColors.textPrimary,
                      ),
                    ),
                    if (hasDot)
                      Container(
                        width: 5,
                        height: 5,
                        decoration: BoxDecoration(
                          color: isSelected
                              ? Colors.white
                              : AppColors.primary500,
                          shape: BoxShape.circle,
                        ),
                      )
                    else
                      const SizedBox(height: 5),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
