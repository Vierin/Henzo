import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import '../../utils/formatters.dart';
import '../../models/studio.dart';
import '../../models/training_location_item.dart';
import '../../services/auth_service.dart';
import '../../services/cache/studio_cache.dart';
import '../../utils/owner_studio_setup_errors.dart';
import '../../services/cache/owner_sessions_cache.dart';
import '../../services/dashboard_api_service.dart';
import '../../utils/henzo_haptics.dart';
import '../../utils/show_api_error.dart';
import '../../utils/color_hex.dart';
import '../../widgets/dashboard/owner_daily_schedule_block.dart';
import '../../widgets/schedule/calendar_day_pill.dart';
import '../../widgets/schedule/schedule_calendar_header.dart';
import 'main_shell.dart';
import 'owner_training_session_detail_screen.dart';
import 'trainer/trainer_session_enrollments_screen.dart';
import '../services/trainer_api_service.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

DateTime _calendarDateOnly(DateTime d) => DateTime(d.year, d.month, d.day);

class CalendarScreen extends StatefulWidget {
  const CalendarScreen({super.key, this.trainerMode = false});

  /// Trainer panel: same schedule UI without create-training FAB.
  final bool trainerMode;

  @override
  State<CalendarScreen> createState() => CalendarScreenState();
}

class CalendarScreenState extends State<CalendarScreen> {
  static const _kCalendarStripPastDays = 14;
  static const _kCalendarStripFutureDays = 56;
  static const _kCalendarStripDayCount =
      _kCalendarStripPastDays + _kCalendarStripFutureDays + 1;
  static const _kDayPillGap = 7.0;

  Studio? _studio;
  final Map<int, int> _sessionCountByDay = <int, int>{};
  final Map<int, List<OwnerTrainingSession>> _sessionsByDay =
      <int, List<OwnerTrainingSession>>{};
  final Map<String, Map<String, dynamic>> _trainerRawSessionsById = {};
  bool _isLoading = false;
  bool _isMonthExpanded = false;
  late final ValueNotifier<DateTime> _stripDayNotifier;
  late final ValueNotifier<DateTime> _scheduleDayNotifier;

  /// День по центру ленты пиллов — для подписи месяца при скролле (не ждать debounce).
  final ValueNotifier<DateTime> _stripPagerDayNotifier = ValueNotifier(
    _calendarDateOnly(DateTime.now()),
  );
  late final DateTime _stripStartDay;
  late final ScrollController _dayStripScrollController;
  double? _dayStripViewportWidth;
  final CalendarDayStripScrollHaptics _dayStripHaptics =
      CalendarDayStripScrollHaptics();

  @override
  void initState() {
    super.initState();
    final today = _calendarDateOnly(DateTime.now());
    _stripStartDay = today.subtract(
      const Duration(days: _kCalendarStripPastDays),
    );
    _stripDayNotifier = ValueNotifier<DateTime>(today);
    _scheduleDayNotifier = ValueNotifier<DateTime>(today);
    _stripPagerDayNotifier.value = today;
    _dayStripScrollController = ScrollController();
    _dayStripScrollController.addListener(_onCalendarStripScrolled);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _scrollCalendarStripToWeekStart(today);
    });
  }

  bool _sessionsLoadStarted = false;
  OwnerSessionsCache? _sessionsCache;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (widget.trainerMode) return;
    final cache = context.read<OwnerSessionsCache>();
    if (_sessionsCache != cache) {
      _sessionsCache?.removeListener(_onOwnerSessionsCacheChanged);
      _sessionsCache = cache;
      _sessionsCache!.addListener(_onOwnerSessionsCacheChanged);
    }
  }

  bool _sessionsReloadInFlight = false;

  void _onOwnerSessionsCacheChanged() {
    if (widget.trainerMode) return;
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

  /// Forces a background reload of the schedule. Triggered when the trainer taps
  /// an assignment push, so the newly assigned session appears without a manual
  /// pull-to-refresh. This is event-driven (one fetch per tap), not polling.
  void reloadSessions() {
    if (!_sessionsLoadStarted) {
      _sessionsLoadStarted = true;
      _loadData();
      return;
    }
    if (_sessionsReloadInFlight) return;
    _sessionsReloadInFlight = true;
    unawaited(
      _loadData(showLoading: false).whenComplete(() {
        _sessionsReloadInFlight = false;
      }),
    );
  }

  @override
  void dispose() {
    _sessionsCache?.removeListener(_onOwnerSessionsCacheChanged);
    _dayStripScrollController.removeListener(_onCalendarStripScrolled);
    _stripDayNotifier.dispose();
    _scheduleDayNotifier.dispose();
    _stripPagerDayNotifier.dispose();
    _dayStripScrollController.dispose();
    super.dispose();
  }

  DateTime _stripDayAt(int index) => _stripStartDay.add(Duration(days: index));

  double _dayPillWidth(double viewportWidth) =>
      viewportWidth / 7 - _kDayPillGap;

  double _dayStride(double viewportWidth) => viewportWidth / 7;

  int _calendarStripIndexForWeekStart(DateTime day) =>
      CalendarDayPill.stripIndexForWeekStart(
        day: day,
        stripStart: _stripStartDay,
        itemCount: _kCalendarStripDayCount,
      );

  void _scrollCalendarStripToIndex(int index, {bool animate = false}) {
    void tryScroll() {
      final w = _dayStripViewportWidth;
      if (w == null || !_dayStripScrollController.hasClients) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) tryScroll();
        });
        return;
      }
      final offset =
          index.clamp(0, _kCalendarStripDayCount - 1) * _dayStride(w);
      final maxExtent = _dayStripScrollController.position.maxScrollExtent;
      final target = offset.clamp(0.0, maxExtent);
      final clampedIndex = index.clamp(0, _kCalendarStripDayCount - 1);
      if (animate) {
        _dayStripHaptics.animateScroll(
          _dayStripScrollController,
          offset: target,
          index: clampedIndex,
        );
      } else {
        _dayStripHaptics.jumpScroll(
          _dayStripScrollController,
          offset: target,
          index: clampedIndex,
        );
      }
    }

    tryScroll();
  }

  void _scrollCalendarStripToWeekStart(
    DateTime day, {
    bool animate = false,
  }) {
    _scrollCalendarStripToIndex(
      _calendarStripIndexForWeekStart(day),
      animate: animate,
    );
  }

  void _onCalendarStripScrolled() {
    final w = _dayStripViewportWidth;
    if (w == null || !_dayStripScrollController.hasClients) return;
    final stride = _dayStride(w);
    if (stride <= 0) return;
    final index = (_dayStripScrollController.offset / stride)
        .round()
        .clamp(0, _kCalendarStripDayCount - 1);
    _dayStripHaptics.onScrollIndex(index);
    final normalized = _calendarDateOnly(_stripDayAt(index));
    if (_stripPagerDayNotifier.value == normalized) return;
    _stripPagerDayNotifier.value = normalized;
  }

  void _syncCalendarStripToSelectedWeek() {
    _scrollCalendarStripToWeekStart(_stripDayNotifier.value);
  }

  Future<void> _onPullRefresh() async {
    if (!mounted) return;
    if (!widget.trainerMode) {
      context.read<OwnerSessionsCache>().invalidate();
    }
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
      final now = DateTime.now();
      final fromUtc = now.subtract(const Duration(days: 14)).toUtc();
      final toUtc = now.add(const Duration(days: 56)).toUtc();
      final grouped = <int, List<OwnerTrainingSession>>{};
      final counts = <int, int>{};
      Studio? studio;

      if (widget.trainerMode) {
        final auth = context.read<AuthService>();
        final trainerName = auth.trainerInfo?.name.trim().isNotEmpty == true
            ? auth.trainerInfo!.name.trim()
            : (auth.user?.name?.trim().isNotEmpty == true
                  ? auth.user!.name!.trim()
                  : '—');
        final studioId = auth.trainerInfo?.studioId;
        final results = await Future.wait([
          TrainerApiService.getSessions(token, from: fromUtc, to: toUtc),
          if (studioId != null && studioId.isNotEmpty)
            TrainerApiService.fetchStudioForLocations(studioId)
          else
            Future<Studio?>.value(null),
        ]);
        final result = results[0] as Map<String, dynamic>;
        final trainerStudio = results.length > 1 ? results[1] as Studio? : null;
        final rawSessions =
            (result['sessions'] as List?)
                ?.whereType<Map>()
                .map((e) => Map<String, dynamic>.from(e))
                .toList() ??
            <Map<String, dynamic>>[];
        final rawById = <String, Map<String, dynamic>>{};
        for (final raw in rawSessions) {
          final session = TrainerApiService.ownerSessionFromTrainerMap(
            raw,
            trainerName: trainerName,
          );
          rawById[session.sessionId] = raw;
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
            _studio = trainerStudio;
            _trainerRawSessionsById
              ..clear()
              ..addAll(rawById);
            _sessionsByDay
              ..clear()
              ..addAll(grouped);
            _sessionCountByDay
              ..clear()
              ..addAll(counts);
            _isLoading = false;
          });
        }
      } else {
        final studioCache = context.read<StudioCache>();
        final sessionsCache = context.read<OwnerSessionsCache>();
        studio = await studioCache.getStudio(token);
        final sessions = await sessionsCache.getSessions(
          token,
          fromUtc: fromUtc,
          toUtc: toUtc,
        );
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
            _studio = studio;
            _trainerRawSessionsById.clear();
            _sessionsByDay
              ..clear()
              ..addAll(grouped);
            _sessionCountByDay
              ..clear()
              ..addAll(counts);
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        if (!isOwnerStudioNotReadyError(e)) {
          showApiError(context, e);
        }
      }
    }
  }

  List<TrainingLocationItem> _studioLocations(BuildContext context) {
    final studio = _studio;
    if (studio == null) return const [];
    final locale = context.read<LocaleProvider>();
    return TrainingLocationItem.listFromStudio(
      studio,
      mainStudioName: locale.t('locations.mainStudio'),
    );
  }

  String? _ownerTrainerFallback() {
    if (widget.trainerMode) {
      final trainer = context.read<AuthService>().trainerInfo;
      if (trainer != null && trainer.name.trim().isNotEmpty) {
        return trainer.name.trim();
      }
    }
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

  String _studioHeaderLabel(BuildContext context) {
    if (widget.trainerMode) {
      final trainerStudio = context
          .read<AuthService>()
          .trainerInfo
          ?.studioName
          .trim();
      if (trainerStudio != null && trainerStudio.isNotEmpty) {
        return trainerStudio.toUpperCase();
      }
    }
    final name = _studio?.name?.trim();
    if (name != null && name.isNotEmpty) return name.toUpperCase();
    return 'BUSINESS';
  }

  void _shiftMonth(int deltaMonths) {
    HenzoHaptics.scrollTick();
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

  /// Выбрать день без прокрутки ленты (тап по pill в strip).
  void _selectDay(DateTime day) {
    final normalized = DateTime(day.year, day.month, day.day);
    _stripDayNotifier.value = normalized;
    _scheduleDayNotifier.value = normalized;
    _stripPagerDayNotifier.value = normalized;
  }

  /// Перепрыгнуть на конкретный день — месячный вид, «Сегодня», смена месяца.
  void _jumpToDay(DateTime day, {bool afterBuild = false}) {
    final normalized = _calendarDateOnly(day);
    _selectDay(normalized);

    void scroll() => _scrollCalendarStripToWeekStart(normalized);

    if (afterBuild) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) scroll();
      });
    } else {
      scroll();
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
    final dow = calendarWeekdayHeaders(
      context.read<LocaleProvider>().localeCode,
    );
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 16),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ScheduleCalendarMonthYearAlign(day: monthAnchor),
          const SizedBox(height: 12),
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

  Widget _buildDayStrip() {
    return LayoutBuilder(
      builder: (context, constraints) {
        _dayStripViewportWidth = constraints.maxWidth;
        final viewportWidth = constraints.maxWidth;
        final pillWidth = _dayPillWidth(viewportWidth);
        return SizedBox(
          height: 86,
          child: NotificationListener<ScrollNotification>(
            onNotification: (ScrollNotification n) {
              if (n.metrics.axis != Axis.horizontal) return false;
              _onCalendarStripScrolled();
              if (n is ScrollEndNotification) {
                final w = _dayStripViewportWidth;
                if (w == null || !_dayStripScrollController.hasClients) {
                  return false;
                }
                final stride = _dayStride(w);
                final index = (_dayStripScrollController.offset / stride)
                    .round()
                    .clamp(0, _kCalendarStripDayCount - 1);
                final target = (index * stride).clamp(
                  0.0,
                  _dayStripScrollController.position.maxScrollExtent,
                );
                if ((_dayStripScrollController.offset - target).abs() > 0.5) {
                  _dayStripHaptics.animateScroll(
                    _dayStripScrollController,
                    offset: target,
                    index: index,
                    duration: const Duration(milliseconds: 200),
                  );
                }
              }
              return false;
            },
            child: ListView.separated(
              controller: _dayStripScrollController,
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(
                parent: AlwaysScrollableScrollPhysics(),
              ),
              clipBehavior: Clip.none,
              itemCount: _kCalendarStripDayCount,
              separatorBuilder: (context, index) =>
                  const SizedBox(width: _kDayPillGap),
              itemBuilder: (_, index) {
                final day = _stripDayAt(index);
                final sessionsCount = _sessionCountByDay[_dayKey(day)] ?? 0;
                final isToday = _isSameDay(day, DateTime.now());

                return SizedBox(
                  width: pillWidth,
                  child: ValueListenableBuilder<DateTime>(
                    valueListenable: _stripDayNotifier,
                    builder: (context, stripDay, _) {
                      final selected = _isSameDay(day, stripDay);
                      return CalendarDayPill(
                        day: day,
                        selected: selected,
                        sessionsCount: sessionsCount,
                        isToday: isToday,
                        onTap: () => _selectDay(day),
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

  void _toggleMonthExpanded() {
    final wasExpanded = _isMonthExpanded;
    setState(() => _isMonthExpanded = !_isMonthExpanded);
    if (wasExpanded) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _syncCalendarStripToSelectedWeek();
      });
    }
  }

  void _goToScheduleToday() {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    if (_isMonthExpanded) {
      setState(() => _isMonthExpanded = false);
      _jumpToDay(today, afterBuild: true);
    } else {
      _jumpToDay(today);
    }
  }

  @override
  Widget build(BuildContext context) {
    final trainerFb = _ownerTrainerFallback();
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      floatingActionButton: widget.trainerMode
          ? null
          : SafeArea(
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
      floatingActionButtonLocation: widget.trainerMode
          ? null
          : FloatingActionButtonLocation.endFloat,
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
                    ScheduleCalendarTitleRow(
                      overtitle: _studioHeaderLabel(context),
                      title: context.read<LocaleProvider>().t(
                        'calendar.scheduleTitle',
                      ),
                      titleStyle: TextStyle(
                        fontSize: 24.sp,
                        fontWeight: FontWeight.w700,
                        height: 1.1,
                        letterSpacing: -0.8,
                        color: AppColors.textPrimary,
                      ),
                      todayLabel: context.read<LocaleProvider>().t('common.today'),
                      expandLabel:
                          context.read<LocaleProvider>().t('common.expand'),
                      collapseLabel:
                          context.read<LocaleProvider>().t('common.collapse'),
                      onToday: _goToScheduleToday,
                      isMonthExpanded: _isMonthExpanded,
                      onToggleMonthExpanded: _toggleMonthExpanded,
                      padding: const EdgeInsets.fromLTRB(
                        kScreenPaddingHorizontal,
                        16,
                        kScreenPaddingHorizontal,
                        8,
                      ),
                    ),
                    if (!_isMonthExpanded)
                      ScheduleCalendarMonthYearLabel(
                        dayListenable: _stripPagerDayNotifier,
                        padding: const EdgeInsets.fromLTRB(16, 13, 20, 8),
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
                                    height: 86,
                                    backgroundColor:
                                        AppColors.backgroundSecondary,
                                    stripDayKey: Object.hash(
                                      _dayKey(_stripDayNotifier.value),
                                      _dayKey(_stripPagerDayNotifier.value),
                                    ),
                                    strip: Padding(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 12,
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
                                      12,
                                      4,
                                      12,
                                      0,
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
                              final locale = context.read<LocaleProvider>();
                              return SliverPadding(
                                padding: const EdgeInsets.fromLTRB(0, 20, 0, 0),
                                sliver: SliverToBoxAdapter(
                                  child: OwnerDailyScheduleBlock(
                                    sessions: daySessions,
                                    emptyMessage: locale.t(
                                      'schedule.noTrainingsSelectedDay',
                                    ),
                                    emptySubtitle: locale.t(
                                      'dashboard.enjoyYourDay',
                                    ),
                                    ownerTrainerFallback: trainerFb,
                                    studioLocations: _studioLocations(context),
                                    completedLabel: widget.trainerMode
                                        ? context.read<LocaleProvider>().t(
                                            'trainer.sessionCompleted',
                                          )
                                        : null,
                                    onSessionTap: (s) async {
                                      if (widget.trainerMode) {
                                        final raw =
                                            _trainerRawSessionsById[s
                                                .sessionId];
                                        if (raw == null || !context.mounted) {
                                          return;
                                        }
                                        if (ModalRoute.of(context)?.isCurrent !=
                                            true) {
                                          return;
                                        }
                                        await Navigator.of(context).push<void>(
                                          MaterialPageRoute<void>(
                                            builder: (_) =>
                                                TrainerSessionEnrollmentsScreen(
                                                  session: raw,
                                                ),
                                          ),
                                        );
                                        if (context.mounted) {
                                          await _loadData(showLoading: false);
                                        }
                                        return;
                                      }
                                      final token = context
                                          .read<AuthService>()
                                          .accessToken;
                                      final studio =
                                          (token != null && token.isNotEmpty)
                                          ? await context
                                                .read<StudioCache>()
                                                .getStudio(token)
                                          : null;
                                      if (!context.mounted) return;
                                      if (ModalRoute.of(context)?.isCurrent !=
                                          true) {
                                        return;
                                      }
                                      String? venue;
                                      if (studio != null) {
                                        final n = studio.name?.trim();
                                        if (n != null && n.isNotEmpty) {
                                          venue = n;
                                        } else {
                                          final a = studio.address?.trim();
                                          if (a != null && a.isNotEmpty) {
                                            venue = a;
                                          }
                                        }
                                      }
                                      await Navigator.of(context).push<void>(
                                        MaterialPageRoute<void>(
                                          builder: (detailCtx) =>
                                              OwnerTrainingSessionDetailScreen(
                                                session: s,
                                                trainingColor: parseHexColor(
                                                  s.trainingDisplayColorHex,
                                                ),
                                                venueName: venue,
                                                trainerFallbackName: trainerFb,
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
