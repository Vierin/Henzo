import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../constants/colors.dart';
import '../../services/auth_service.dart';
import '../../services/dashboard_api_service.dart';
import '../../utils/show_api_error.dart';
import '../../utils/color_hex.dart';
import '../../widgets/owner_training_session_card.dart';
import 'main_shell.dart';
import 'owner_training_session_detail_screen.dart';

// Базовая дата для вычисления смещений страниц
final _kBaseDate = DateTime(2020, 1, 1);
const int _kDayInitialPage = 10000;

int _pageForDay(DateTime day) {
  final d = DateTime(day.year, day.month, day.day);
  return _kDayInitialPage + d.difference(_kBaseDate).inDays;
}

DateTime _dayForPage(int page) {
  return _kBaseDate.add(Duration(days: page - _kDayInitialPage));
}

/// После остановки свайпа по ленте дней — ждём столько же, затем обновляем
/// активный пилл, заголовок месяца и Daily schedule.
const Duration _kStripScheduleDebounce = Duration(milliseconds: 1400);

class CalendarScreen extends StatefulWidget {
  const CalendarScreen({super.key});

  @override
  State<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends State<CalendarScreen> {
  final Map<int, int> _sessionCountByDay = <int, int>{};
  final Map<int, List<OwnerTrainingSession>> _sessionsByDay =
      <int, List<OwnerTrainingSession>>{};
  bool _isLoading = false;
  bool _isMonthExpanded = false;
  late final ValueNotifier<DateTime> _stripDayNotifier;
  late final ValueNotifier<DateTime> _scheduleDayNotifier;
  Timer? _stripScheduleDebounce;

  /// Пока доезжаем к дню по тапу — игнорируем onPageChanged, иначе промежуточные
  /// страницы перезапустят debounce и отложат подсветку.
  bool _suppressStripSchedulePageChanged = false;
  late PageController _dayPagerController;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    _stripDayNotifier = ValueNotifier<DateTime>(today);
    _scheduleDayNotifier = ValueNotifier<DateTime>(today);
    _dayPagerController = PageController(
      initialPage: _pageForDay(today),
      viewportFraction: 1 / 7,
    );
    _loadData();
  }

  void _clearStripScheduleDebounceTimer() {
    _stripScheduleDebounce?.cancel();
    _stripScheduleDebounce = null;
  }

  @override
  void dispose() {
    _clearStripScheduleDebounceTimer();
    _suppressStripSchedulePageChanged = false;
    _stripDayNotifier.dispose();
    _scheduleDayNotifier.dispose();
    _dayPagerController.dispose();
    super.dispose();
  }

  /// Один таймер на подсветку пилла + расписание (только после свайпа ленты).
  void _debounceStripAndScheduleDay(DateTime day) {
    _clearStripScheduleDebounceTimer();
    _stripScheduleDebounce = Timer(_kStripScheduleDebounce, () {
      _stripDayNotifier.value = day;
      _scheduleDayNotifier.value = day;
      _stripScheduleDebounce = null;
    });
  }

  Future<void> _loadData() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    final token = context.read<AuthService>().accessToken;
    if (token == null) {
      if (mounted) setState(() => _isLoading = false);
      return;
    }
    try {
      final now = DateTime.now();
      final from = now.subtract(const Duration(days: 30)).toIso8601String();
      final to = now.add(const Duration(days: 90)).toIso8601String();
      final sessions = await DashboardApiService.getOwnerTrainingSessions(
        token,
        fromIso: from,
        toIso: to,
      );
      final grouped = <int, List<OwnerTrainingSession>>{};
      final counts = <int, int>{};
      for (final session in sessions) {
        final local = session.startsAt.toLocal();
        final key = _dayKey(local);
        (grouped[key] ??= <OwnerTrainingSession>[]).add(session);
        counts[key] = (counts[key] ?? 0) + 1;
      }
      for (final list in grouped.values) {
        list.sort((a, b) => a.startsAt.compareTo(b.startsAt));
      }
      if (mounted) {
        setState(() {
          _sessionsByDay
            ..clear()
            ..addAll(grouped);
          _sessionCountByDay
            ..clear()
            ..addAll(counts);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        showApiError(context, e);
      }
    }
  }

  String? _ownerTrainerFallback() {
    final u = context.read<AuthService>().user;
    if (u == null) return null;
    final name = u.name;
    if (name != null && name.trim().isNotEmpty) return name.trim();
    final email = u.email.trim();
    if (email.isNotEmpty) return email;
    return null;
  }

  void _openCreateTraining() {
    final shell = context.findAncestorStateOfType<MainShellState>();
    if (shell != null) {
      shell.navigateToTab0Route('/trainings/new');
      return;
    }
    Navigator.of(context).pushNamed('/trainings/new');
  }

  String _monthNameRu(int month) {
    const months = [
      'Январь',
      'Февраль',
      'Март',
      'Апрель',
      'Май',
      'Июнь',
      'Июль',
      'Август',
      'Сентябрь',
      'Октябрь',
      'Ноябрь',
      'Декабрь',
    ];
    return months[month - 1];
  }

  /// Заголовок показывает месяц дня в ленте
  String _headerTitle(DateTime stripDay) {
    return '${_monthNameRu(stripDay.month)} ${stripDay.year}';
  }

  void _shiftMonth(int deltaMonths) {
    final strip = _stripDayNotifier.value;
    final targetMonth = DateTime(strip.year, strip.month + deltaMonths, 1);
    final daysInTargetMonth = DateTime(
      targetMonth.year,
      targetMonth.month + 1,
      0,
    ).day;
    final targetDay = strip.day.clamp(1, daysInTargetMonth);
    final nextSelected = DateTime(
      targetMonth.year,
      targetMonth.month,
      targetDay,
    );
    _jumpToDay(nextSelected);
  }

  /// Перепрыгнуть на конкретный день — используется из месячного вида и кнопки "Сегодня"
  void _jumpToDay(DateTime day) {
    final normalized = DateTime(day.year, day.month, day.day);
    _clearStripScheduleDebounceTimer();
    _stripDayNotifier.value = normalized;
    _scheduleDayNotifier.value = normalized;
    _dayPagerController.jumpToPage(_pageForDay(normalized));
  }

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

  Widget _buildMonthExpanded(DateTime stripDay) {
    final cells = _monthCells(stripDay);
    const dow = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderPrimary),
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
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: cells.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 7,
              mainAxisSpacing: 6,
              crossAxisSpacing: 6,
              childAspectRatio: 1.0,
            ),
            itemBuilder: (_, index) {
              final day = cells[index];
              if (day == null) return const SizedBox.shrink();
              final selected = _isSameDay(day, stripDay);
              return InkWell(
                onTap: () {
                  setState(() => _isMonthExpanded = false);
                  _jumpToDay(day);
                },
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  decoration: BoxDecoration(
                    color: selected
                        ? AppColors.primary500
                        : AppColors.backgroundSecondary,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: selected
                          ? AppColors.primary500
                          : AppColors.borderPrimary,
                    ),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    '${day.day}',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: selected ? Colors.white : AppColors.textPrimary,
                    ),
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  bool _isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  int _dayKey(DateTime d) => d.year * 10000 + d.month * 100 + d.day;

  /// Бесконечная лента дней — каждый пилл = 1/7 экрана.
  /// PageView сам плавно выравнивает ближайший день при отпускании — никакого jumpToPage.
  Widget _buildDayStrip() {
    return SizedBox(
      height: 74,
      child: PageView.builder(
        controller: _dayPagerController,
        physics: const _SmoothDayPageScrollPhysics(),
        onPageChanged: (page) {
          if (_suppressStripSchedulePageChanged) return;
          final day = _dayForPage(page);
          if (_isSameDay(day, _stripDayNotifier.value) &&
              _isSameDay(day, _scheduleDayNotifier.value)) {
            return;
          }
          _debounceStripAndScheduleDay(day);
        },
        itemBuilder: (context, index) {
          final day = _dayForPage(index);
          final sessionsCount = _sessionCountByDay[_dayKey(day)] ?? 0;
          final isToday = _isSameDay(day, DateTime.now());

          return ValueListenableBuilder<DateTime>(
            valueListenable: _stripDayNotifier,
            builder: (context, stripDay, _) {
              final selected = _isSameDay(day, stripDay);
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 3),
                child: GestureDetector(
                  onTap: () {
                    _clearStripScheduleDebounceTimer();
                    _stripDayNotifier.value = day;
                    _scheduleDayNotifier.value = day;
                    _suppressStripSchedulePageChanged = true;
                    _dayPagerController
                        .animateToPage(
                          index,
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeOutCubic,
                        )
                        .whenComplete(() {
                          if (mounted) {
                            _suppressStripSchedulePageChanged = false;
                          }
                        });
                  },
                  child: Container(
                    height: 74,
                    decoration: BoxDecoration(
                      color: selected
                          ? AppColors.primary500
                          : AppColors.backgroundPrimary,
                      borderRadius: BorderRadius.circular(22),
                      border: Border.all(
                        color: selected
                            ? AppColors.primary500
                            : isToday
                            ? AppColors.primary500.withOpacity(0.4)
                            : AppColors.borderPrimary,
                      ),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          _weekdayShort(day),
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            color: selected
                                ? Colors.white
                                : AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          '${day.day}',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: selected
                                ? Colors.white
                                : AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        if (sessionsCount > 0)
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: List.generate(
                              sessionsCount.clamp(1, 3),
                              (_) => Container(
                                width: 4,
                                height: 4,
                                margin: const EdgeInsets.symmetric(
                                  horizontal: 1,
                                ),
                                decoration: BoxDecoration(
                                  color: selected
                                      ? Colors.white70
                                      : AppColors.primary500,
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ),
                          )
                        else
                          const SizedBox(height: 4),
                      ],
                    ),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  String _weekdayShort(DateTime day) {
    const names = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    return names[day.weekday - 1];
  }

  @override
  Widget build(BuildContext context) {
    final trainerFb = _ownerTrainerFallback();
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      floatingActionButton: SafeArea(
        minimum: const EdgeInsets.only(bottom: 8),
        child: FloatingActionButton(
          onPressed: _openCreateTraining,
          backgroundColor: AppColors.primary500,
          foregroundColor: Colors.white,
          child: const Icon(Icons.add),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadData,
          color: AppColors.primary500,
          child: _isLoading
              ? const Center(
                  child: CircularProgressIndicator(color: AppColors.primary500),
                )
              : CustomScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  slivers: [
                    // ── Заголовок (месяц следует за лентой дней) ───────────
                    ValueListenableBuilder<DateTime>(
                      valueListenable: _stripDayNotifier,
                      builder: (context, stripDay, _) {
                        return SliverPadding(
                          padding: const EdgeInsets.fromLTRB(12, 16, 12, 0),
                          sliver: SliverToBoxAdapter(
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    _headerTitle(stripDay),
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                ),
                                OutlinedButton(
                                  onPressed: () {
                                    final now = DateTime.now();
                                    _jumpToDay(
                                      DateTime(now.year, now.month, now.day),
                                    );
                                  },
                                  style: OutlinedButton.styleFrom(
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    side: const BorderSide(
                                      color: AppColors.borderPrimary,
                                    ),
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 8,
                                    ),
                                  ),
                                  child: const Text(
                                    'Сегодня',
                                    style: TextStyle(
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                OutlinedButton.icon(
                                  onPressed: () => setState(
                                    () => _isMonthExpanded = !_isMonthExpanded,
                                  ),
                                  style: OutlinedButton.styleFrom(
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    side: const BorderSide(
                                      color: AppColors.borderPrimary,
                                    ),
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 8,
                                    ),
                                  ),
                                  icon: const SizedBox.shrink(),
                                  label: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(
                                        Icons.calendar_month_outlined,
                                        color: AppColors.textPrimary,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        _isMonthExpanded
                                            ? 'Свернуть'
                                            : 'Развернуть',
                                        style: const TextStyle(
                                          color: AppColors.textPrimary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),

                    // ── Месячный вид или лента дней ────────────────────────
                    if (_isMonthExpanded)
                      ValueListenableBuilder<DateTime>(
                        valueListenable: _stripDayNotifier,
                        builder: (context, stripDay, _) {
                          return SliverPadding(
                            padding: const EdgeInsets.fromLTRB(12, 0, 12, 0),
                            sliver: SliverToBoxAdapter(
                              child: GestureDetector(
                                onHorizontalDragEnd: (details) {
                                  const threshold = 90.0;
                                  if ((details.primaryVelocity ?? 0) <
                                      -threshold) {
                                    _shiftMonth(1);
                                  } else if ((details.primaryVelocity ?? 0) >
                                      threshold) {
                                    _shiftMonth(-1);
                                  }
                                },
                                child: _buildMonthExpanded(stripDay),
                              ),
                            ),
                          );
                        },
                      )
                    else
                      // Pinned — лента дней остаётся видна при скролле расписания
                      ValueListenableBuilder<DateTime>(
                        valueListenable: _stripDayNotifier,
                        builder: (context, stripDay, _) {
                          return SliverPersistentHeader(
                            pinned: true,
                            delegate: _PinnedDayStripDelegate(
                              height: 74 + 12,
                              backgroundColor: AppColors.backgroundSecondary,
                              stripDayKey: _dayKey(stripDay),
                              strip: Padding(
                                padding: const EdgeInsets.fromLTRB(
                                  12,
                                  12,
                                  12,
                                  0,
                                ),
                                child: _buildDayStrip(),
                              ),
                            ),
                          );
                        },
                      ),

                    // ── Расписание дня (обновляется с debounce после свайпа) ─
                    ValueListenableBuilder<DateTime>(
                      valueListenable: _scheduleDayNotifier,
                      builder: (context, scheduleDay, _) {
                        final daySessions =
                            _sessionsByDay[_dayKey(scheduleDay)] ??
                            const <OwnerTrainingSession>[];
                        return SliverPadding(
                          padding: const EdgeInsets.fromLTRB(12, 26, 12, 0),
                          sliver: SliverList(
                            delegate: SliverChildBuilderDelegate(
                              (context, index) {
                                if (index == 0) {
                                  return const Padding(
                                    padding: EdgeInsets.only(bottom: 16),
                                    child: Text(
                                      'Daily schedule',
                                      style: TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                  );
                                }
                                if (daySessions.isEmpty) {
                                  return Container(
                                    padding: const EdgeInsets.all(16),
                                    decoration: BoxDecoration(
                                      color: AppColors.backgroundPrimary,
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: AppColors.borderPrimary,
                                      ),
                                    ),
                                    child: const Text(
                                      'No trainings for selected day',
                                      style: TextStyle(
                                        color: AppColors.textSecondary,
                                        fontSize: 14,
                                      ),
                                    ),
                                  );
                                }
                                final cardIndex = index - 1;
                                final s = daySessions[cardIndex];
                                return Padding(
                                  padding: EdgeInsets.only(
                                    bottom: cardIndex == daySessions.length - 1
                                        ? 0
                                        : 12,
                                  ),
                                  child: OwnerTrainingSessionCard(
                                    session: s,
                                    trainingColor: parseHexColor(
                                      s.trainingDisplayColorHex,
                                    ),
                                    trainerFallbackName: trainerFb,
                                    onTap: () {
                                      Navigator.of(context).push<void>(
                                        MaterialPageRoute<void>(
                                          builder: (_) => OwnerTrainingSessionDetailScreen(
                                            session: s,
                                            trainingColor: parseHexColor(
                                              s.trainingDisplayColorHex,
                                            ),
                                            trainerFallbackName: trainerFb,
                                            onParticipantsChanged: _loadData,
                                            onEditSession:
                                                s.sessionId.isNotEmpty
                                                ? () {
                                                    final shell = context
                                                        .findAncestorStateOfType<
                                                          MainShellState
                                                        >();
                                                    shell?.navigateToTab0Route(
                                                      '/owner/session/edit',
                                                      arguments: s
                                                          .toRouteArgs(),
                                                    );
                                                  }
                                                : null,
                                            onEditService:
                                                s.trainingId.isNotEmpty
                                                ? () {
                                                    final shell = context
                                                        .findAncestorStateOfType<
                                                          MainShellState
                                                        >();
                                                    shell?.navigateToTab0Route(
                                                      '/services',
                                                      arguments: {
                                                        'editTrainingId':
                                                            s.trainingId,
                                                      },
                                                    );
                                                  }
                                                : null,
                                          ),
                                        ),
                                      );
                                    },
                                  ),
                                );
                              },
                              childCount: daySessions.isEmpty
                                  ? 2
                                  : daySessions.length + 1,
                            ),
                          ),
                        );
                      },
                    ),
                    const SliverToBoxAdapter(child: SizedBox(height: 20)),
                  ],
                ),
        ),
      ),
    );
  }
}

class _PinnedDayStripDelegate extends SliverPersistentHeaderDelegate {
  const _PinnedDayStripDelegate({
    required this.height,
    required this.backgroundColor,
    required this.stripDayKey,
    required this.strip,
  });

  final double height;
  final Color backgroundColor;

  /// Чтобы pinned-шапка пересобиралась при смене активного дня в ленте.
  final int stripDayKey;
  final Widget strip;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return ColoredBox(color: backgroundColor, child: strip);
  }

  @override
  double get maxExtent => height;

  @override
  double get minExtent => height;

  @override
  bool shouldRebuild(covariant _PinnedDayStripDelegate old) =>
      height != old.height ||
      backgroundColor != old.backgroundColor ||
      stripDayKey != old.stripDayKey;
}

class _SmoothDayPageScrollPhysics extends PageScrollPhysics {
  const _SmoothDayPageScrollPhysics({super.parent});

  @override
  _SmoothDayPageScrollPhysics applyTo(ScrollPhysics? ancestor) {
    return _SmoothDayPageScrollPhysics(parent: buildParent(ancestor));
  }
}
