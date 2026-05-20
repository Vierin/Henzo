import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import '../../models/salon.dart';
import '../../models/training_location_item.dart';
import '../../services/auth_service.dart';
import '../../services/cache/salon_cache.dart';
import '../../services/cache/owner_sessions_cache.dart';
import '../../services/dashboard_api_service.dart';
import '../../utils/show_api_error.dart';
import '../../utils/color_hex.dart';
import '../../widgets/dashboard/owner_daily_schedule_block.dart';
import '../../widgets/schedule/calendar_day_pill.dart';
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

DateTime _calendarDateOnly(DateTime d) => DateTime(d.year, d.month, d.day);

/// После остановки свайпа по ленте дней — ждём столько же, затем обновляем
/// активный пилл, заголовок месяца и Daily schedule.
const Duration _kStripScheduleDebounce = Duration(milliseconds: 1400);

class CalendarScreen extends StatefulWidget {
  const CalendarScreen({super.key});

  @override
  State<CalendarScreen> createState() => CalendarScreenState();
}

class CalendarScreenState extends State<CalendarScreen> {
  Salon? _salon;
  final Map<int, int> _sessionCountByDay = <int, int>{};
  final Map<int, List<OwnerTrainingSession>> _sessionsByDay =
      <int, List<OwnerTrainingSession>>{};
  bool _isLoading = false;
  bool _isMonthExpanded = false;
  late final ValueNotifier<DateTime> _stripDayNotifier;
  late final ValueNotifier<DateTime> _scheduleDayNotifier;

  /// День по центру ленты пиллов — для подписи месяца при скролле (не ждать debounce).
  final ValueNotifier<DateTime> _stripPagerDayNotifier = ValueNotifier(
    _calendarDateOnly(DateTime.now()),
  );
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
    _stripPagerDayNotifier.value = today;
    _dayPagerController = PageController(
      initialPage: _pageForDay(today),
      viewportFraction: 1 / 7,
    );
    _dayPagerController.addListener(_onStripPagerScrolled);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _syncStripPagerDayFromController();
    });
  }

  bool _sessionsLoadStarted = false;
  OwnerSessionsCache? _sessionsCache;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final cache = context.read<OwnerSessionsCache>();
    if (_sessionsCache != cache) {
      _sessionsCache?.removeListener(_onOwnerSessionsCacheChanged);
      _sessionsCache = cache;
      _sessionsCache!.addListener(_onOwnerSessionsCacheChanged);
    }
  }

  bool _sessionsReloadInFlight = false;

  void _onOwnerSessionsCacheChanged() {
    if (!mounted || !_sessionsLoadStarted) return;
    if (!context.read<OwnerSessionsCache>().needsRefresh) return;
    if (_sessionsReloadInFlight) return;
    setState(() {
      _sessionsByDay.clear();
      _sessionCountByDay.clear();
    });
    unawaited(_reloadSessionsFromCache());
  }

  Future<void> _reloadSessionsFromCache() async {
    if (_sessionsReloadInFlight) return;
    _sessionsReloadInFlight = true;
    try {
      await _loadData(showLoading: false);
    } finally {
      _sessionsReloadInFlight = false;
    }
  }

  /// Called when the Schedule tab is first shown (avoids fetch on app cold start).
  void ensureSessionsLoaded() {
    if (_sessionsLoadStarted) return;
    _sessionsLoadStarted = true;
    _loadData();
  }

  void _clearStripScheduleDebounceTimer() {
    _stripScheduleDebounce?.cancel();
    _stripScheduleDebounce = null;
  }

  @override
  void dispose() {
    _sessionsCache?.removeListener(_onOwnerSessionsCacheChanged);
    _clearStripScheduleDebounceTimer();
    _suppressStripSchedulePageChanged = false;
    _dayPagerController.removeListener(_onStripPagerScrolled);
    _stripDayNotifier.dispose();
    _scheduleDayNotifier.dispose();
    _stripPagerDayNotifier.dispose();
    _dayPagerController.dispose();
    super.dispose();
  }

  void _onStripPagerScrolled() {
    if (!mounted || !_dayPagerController.hasClients) return;
    final page = _dayPagerController.page;
    if (page == null) return;
    final day = _dayForPage(page.round());
    final normalized = DateTime(day.year, day.month, day.day);
    if (_stripPagerDayNotifier.value == normalized) return;
    _stripPagerDayNotifier.value = normalized;
  }

  void _syncStripPagerDayFromController() {
    if (!_dayPagerController.hasClients) return;
    final page = _dayPagerController.page;
    if (page == null) return;
    final day = _dayForPage(page.round());
    _stripPagerDayNotifier.value = DateTime(day.year, day.month, day.day);
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

  Future<void> _onPullRefresh() async {
    if (!mounted) return;
    context.read<OwnerSessionsCache>().invalidate();
    await _loadData();
  }

  Future<void> _loadData({bool showLoading = true}) async {
    if (!mounted) return;
    if (showLoading) setState(() => _isLoading = true);
    final token = context.read<AuthService>().accessToken;
    if (token == null) {
      if (mounted) setState(() => _isLoading = false);
      return;
    }
    try {
      final salon = await context.read<SalonCache>().getSalon(token);
      final now = DateTime.now();
      final fromUtc = now.subtract(const Duration(days: 14)).toUtc();
      final toUtc = now.add(const Duration(days: 56)).toUtc();
      final sessions = await context.read<OwnerSessionsCache>().getSessions(
        token,
        fromUtc: fromUtc,
        toUtc: toUtc,
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
          _salon = salon;
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

  List<TrainingLocationItem> _studioLocations(BuildContext context) {
    final salon = _salon;
    if (salon == null) return const [];
    final locale = context.read<LocaleProvider>();
    return TrainingLocationItem.listFromSalon(
      salon,
      mainStudioName: locale.t('locations.mainStudio'),
    );
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

  static const _kEnMon = [
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

  /// «MAY 2026» как на макете.
  String _monthYearUpperEn(DateTime d) => '${_kEnMon[d.month - 1]} ${d.year}';

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

  /// Внешний вызов (дашборд «See all»): вкладка Schedule + сегодня, без развёрнутого месяца.
  void jumpToToday() {
    if (!mounted) return;
    final n = DateTime.now();
    final today = DateTime(n.year, n.month, n.day);
    setState(() => _isMonthExpanded = false);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _jumpToDay(today);
    });
  }

  /// Перепрыгнуть на конкретный день — используется из месячного вида и кнопки "Сегодня"
  /// [afterBuild]: вызвать после кадра, если [PageView] ещё не в дереве (сворачивание месяца).
  void _jumpToDay(DateTime day, {bool afterBuild = false}) {
    final normalized = DateTime(day.year, day.month, day.day);
    _clearStripScheduleDebounceTimer();
    _stripDayNotifier.value = normalized;
    _scheduleDayNotifier.value = normalized;
    _stripPagerDayNotifier.value = normalized;

    void jumpPager({int attempt = 0}) {
      if (!_dayPagerController.hasClients) {
        if (attempt >= 16) return;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) jumpPager(attempt: attempt + 1);
        });
        return;
      }
      _suppressStripSchedulePageChanged = true;
      _dayPagerController.jumpToPage(_pageForDay(normalized));
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _clearStripScheduleDebounceTimer();
        _syncStripPagerDayFromController();
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) {
            _suppressStripSchedulePageChanged = false;
            _clearStripScheduleDebounceTimer();
          }
        });
      });
    }

    if (afterBuild) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) jumpPager();
      });
    } else {
      jumpPager();
    }
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

  Widget _buildMonthExpanded(DateTime monthAnchor) {
    final monthStart = DateTime(monthAnchor.year, monthAnchor.month, 1);
    final cells = _monthCells(monthStart);
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
          ValueListenableBuilder<DateTime>(
            valueListenable: _scheduleDayNotifier,
            builder: (context, selectedDay, _) {
              return GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: cells.length,
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 7,
                  mainAxisSpacing: 8,
                  crossAxisSpacing: 4,
                  childAspectRatio: 1.0,
                ),
                itemBuilder: (_, index) {
                  final day = cells[index];
                  if (day == null) return const SizedBox.shrink();
                  final selected = _isSameDay(day, selectedDay);
                  return Center(
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        customBorder: const CircleBorder(),
                        onTap: () {
                          final d = DateTime(day.year, day.month, day.day);
                          setState(() => _isMonthExpanded = false);
                          _jumpToDay(d, afterBuild: true);
                        },
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
                  );
                },
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
          onPageChanged: (page) {
            final day = _dayForPage(page);
            final normalized = DateTime(day.year, day.month, day.day);
            if (_stripPagerDayNotifier.value != normalized) {
              _stripPagerDayNotifier.value = normalized;
            }
            if (_suppressStripSchedulePageChanged) return;
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
                  child: CalendarDayPill(
                    day: day,
                    selected: selected,
                    sessionsCount: sessionsCount,
                    isToday: isToday,
                    onTap: () {
                      _clearStripScheduleDebounceTimer();
                      final normalized = DateTime(day.year, day.month, day.day);
                      _stripDayNotifier.value = normalized;
                      _scheduleDayNotifier.value = normalized;
                      _stripPagerDayNotifier.value = normalized;
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
                              _syncStripPagerDayFromController();
                            }
                          });
                    },
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }

  Widget _todayButton() {
    return TextButton(
      onPressed: () {
        final now = DateTime.now();
        _jumpToDay(DateTime(now.year, now.month, now.day));
      },
      style: TextButton.styleFrom(
        backgroundColor: AppColors.primary500,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
      child: const Text(
        'Today',
        style: TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
      ),
    );
  }

  Widget _expandCollapseButton() {
    return OutlinedButton(
      onPressed: () {
        final wasExpanded = _isMonthExpanded;
        if (!wasExpanded) {
          _clearStripScheduleDebounceTimer();
        }
        setState(() => _isMonthExpanded = !_isMonthExpanded);
        if (wasExpanded) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) _syncStripPagerDayFromController();
          });
        }
      },
      style: OutlinedButton.styleFrom(
        backgroundColor: AppColors.backgroundPrimary,
        foregroundColor: AppColors.textPrimary,
        side: const BorderSide(color: AppColors.borderPrimary),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.calendar_month_outlined,
            size: 18,
            color: AppColors.textPrimary,
          ),
          const SizedBox(width: 6),
          Text(
            _isMonthExpanded ? 'Collapse' : 'Expand',
            style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
          ),
        ],
      ),
    );
  }

  /// Верхний ряд: месяц/год + Today + Expand (месяц от скролла пиллов или от выбранного дня в сетке).
  Widget _monthYearAndActionsRow() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        kScreenPaddingHorizontal,
        16,
        kScreenPaddingHorizontal,
        0,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: _isMonthExpanded
                ? ValueListenableBuilder<DateTime>(
                    valueListenable: _stripDayNotifier,
                    builder: (context, stripDay, _) {
                      return Text(
                        _monthYearUpperEn(stripDay),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.3,
                          color: AppColors.textPrimary,
                        ),
                      );
                    },
                  )
                : ValueListenableBuilder<DateTime>(
                    valueListenable: _stripPagerDayNotifier,
                    builder: (context, pagerDay, _) {
                      return Text(
                        _monthYearUpperEn(pagerDay),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.3,
                          color: AppColors.textPrimary,
                        ),
                      );
                    },
                  ),
          ),
          _todayButton(),
          const SizedBox(width: 10),
          _expandCollapseButton(),
        ],
      ),
    );
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
          elevation: 0,
          focusElevation: 0,
          hoverElevation: 0,
          highlightElevation: 0,
          backgroundColor: AppColors.primary500,
          foregroundColor: Colors.white,
          child: const Icon(Icons.add),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _onPullRefresh,
          color: AppColors.primary500,
          child: _isLoading
              ? const Center(
                  child: CircularProgressIndicator(color: AppColors.primary500),
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _monthYearAndActionsRow(),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(
                        kScreenPaddingHorizontal,
                        5,
                        kScreenPaddingHorizontal,
                        7,
                      ),
                      child: const Text(
                        'Schedule',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          height: 1,
                          letterSpacing: -0.8,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                    Expanded(
                      child: CustomScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        slivers: [
                          if (!_isMonthExpanded) ...[
                            AnimatedBuilder(
                              animation: Listenable.merge([
                                _stripDayNotifier,
                                _stripPagerDayNotifier,
                              ]),
                              builder: (context, _) {
                                return SliverPersistentHeader(
                                  pinned: true,
                                  delegate: _PinnedDayStripDelegate(
                                    height: 86 + 12,
                                    backgroundColor:
                                        AppColors.backgroundSecondary,
                                    stripDayKey: Object.hash(
                                      _dayKey(_stripDayNotifier.value),
                                      _dayKey(_stripPagerDayNotifier.value),
                                    ),
                                    strip: Padding(
                                      padding: const EdgeInsets.fromLTRB(
                                        kScreenPaddingHorizontal,
                                        12,
                                        kScreenPaddingHorizontal,
                                        0,
                                      ),
                                      child: _buildDayStrip(),
                                    ),
                                  ),
                                );
                              },
                            ),
                          ] else ...[
                            ValueListenableBuilder<DateTime>(
                              valueListenable: _stripDayNotifier,
                              builder: (context, stripDay, _) {
                                return SliverToBoxAdapter(
                                  child: Padding(
                                    padding: const EdgeInsets.fromLTRB(
                                      kScreenPaddingHorizontal,
                                      12,
                                      kScreenPaddingHorizontal,
                                      12,
                                    ),
                                    child: GestureDetector(
                                      onHorizontalDragEnd: (details) {
                                        const threshold = 90.0;
                                        if ((details.primaryVelocity ?? 0) <
                                            -threshold) {
                                          _shiftMonth(1);
                                        } else if ((details.primaryVelocity ??
                                                0) >
                                            threshold) {
                                          _shiftMonth(-1);
                                        }
                                      },
                                      child: _buildMonthExpanded(stripDay),
                                    ),
                                  ),
                                );
                              },
                            ),
                          ],
                          ValueListenableBuilder<DateTime>(
                            valueListenable: _scheduleDayNotifier,
                            builder: (context, scheduleDay, _) {
                              final daySessions =
                                  _sessionsByDay[_dayKey(scheduleDay)] ??
                                  const <OwnerTrainingSession>[];
                              return SliverPadding(
                                padding: const EdgeInsets.fromLTRB(0, 20, 0, 0),
                                sliver: SliverToBoxAdapter(
                                  child: OwnerDailyScheduleBlock(
                                    sessions: daySessions,
                                    emptyMessage:
                                        'No trainings for selected day',
                                    ownerTrainerFallback: trainerFb,
                                    studioLocations: _studioLocations(context),
                                    onSessionTap: (s) async {
                                      final token = context
                                          .read<AuthService>()
                                          .accessToken;
                                      final salon =
                                          (token != null &&
                                              token.isNotEmpty)
                                          ? await context
                                                .read<SalonCache>()
                                                .getSalon(token)
                                          : null;
                                      if (!context.mounted) return;
                                      String? venue;
                                      if (salon != null) {
                                        final n = salon.name?.trim();
                                        if (n != null && n.isNotEmpty) {
                                          venue = n;
                                        } else {
                                          final a = salon.address?.trim();
                                          if (a != null && a.isNotEmpty) {
                                            venue = a;
                                          }
                                        }
                                      }
                                      await Navigator.of(context)
                                          .push<void>(
                                            MaterialPageRoute<void>(
                                              builder: (detailCtx) =>
                                                  OwnerTrainingSessionDetailScreen(
                                                    session: s,
                                                    trainingColor:
                                                        parseHexColor(
                                                          s
                                                              .trainingDisplayColorHex,
                                                        ),
                                                    venueName: venue,
                                                    trainerFallbackName:
                                                        trainerFb,
                                                    onParticipantsChanged: () {
                                                      context
                                                          .read<
                                                            OwnerSessionsCache
                                                          >()
                                                          .invalidate();
                                                      _loadData();
                                                    },
                                                  ),
                                            ),
                                          );
                                    },
                                  ),
                                ),
                              );
                            },
                          ),
                          const SliverToBoxAdapter(child: SizedBox(height: 20)),
                        ],
                      ),
                    ),
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

