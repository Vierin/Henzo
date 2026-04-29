import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../services/auth_service.dart';
import '../../services/dashboard_api_service.dart';
import '../../utils/show_api_error.dart';
import '../../widgets/owner_training_session_card.dart';
import 'main_shell.dart';

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
  late DateTime _selectedDay;
  late DateTime _weekStart;
  late final PageController _weekPagerController;
  static const int _weekInitialPage = 1000;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _selectedDay = DateTime(now.year, now.month, now.day);
    _weekStart = _selectedDay.subtract(
      Duration(days: _selectedDay.weekday - 1),
    );
    _weekPagerController = PageController(initialPage: _weekInitialPage);
    _loadData();
  }

  @override
  void dispose() {
    _weekPagerController.dispose();
    super.dispose();
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

  List<OwnerTrainingSession> _sessionsForSelectedDay() {
    return _sessionsByDay[_dayKey(_selectedDay)] ?? const [];
  }

  void _openCreateTraining() {
    final shell = context.findAncestorStateOfType<MainShellState>();
    if (shell != null) {
      shell.navigateToTab0Route('/trainings/new');
      return;
    }
    Navigator.of(context).pushNamed('/trainings/new');
  }

  String _weekdayShort(DateTime day) {
    const names = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    return names[day.weekday - 1];
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

  String _weekTitle() {
    final weekEnd = _weekStart.add(const Duration(days: 6));
    if (_weekStart.year == weekEnd.year) {
      if (_weekStart.month == weekEnd.month) {
        return '${_monthNameRu(_weekStart.month)} ${_weekStart.year}';
      }
      return '${_monthNameRu(_weekStart.month)} / ${_monthNameRu(weekEnd.month)} ${_weekStart.year}';
    }
    return '${_monthNameRu(_weekStart.month)} ${_weekStart.year} / ${_monthNameRu(weekEnd.month)} ${weekEnd.year}';
  }

  void _shiftMonth(int deltaMonths) {
    final targetMonth = DateTime(
      _selectedDay.year,
      _selectedDay.month + deltaMonths,
      1,
    );
    final daysInTargetMonth = DateTime(
      targetMonth.year,
      targetMonth.month + 1,
      0,
    ).day;
    final targetDay = _selectedDay.day.clamp(1, daysInTargetMonth);
    final nextSelected = DateTime(
      targetMonth.year,
      targetMonth.month,
      targetDay,
    );
    setState(() {
      _selectedDay = nextSelected;
      _weekStart = nextSelected.subtract(
        Duration(days: nextSelected.weekday - 1),
      );
    });
  }

  List<DateTime?> _monthCells(DateTime monthDate) {
    final firstDay = DateTime(monthDate.year, monthDate.month, 1);
    final daysInMonth = DateTime(monthDate.year, monthDate.month + 1, 0).day;
    final startOffset = firstDay.weekday - 1; // Monday = 0
    final totalCells = ((startOffset + daysInMonth + 6) ~/ 7) * 7;
    return List.generate(totalCells, (index) {
      final dayNum = index - startOffset + 1;
      if (dayNum < 1 || dayNum > daysInMonth) return null;
      return DateTime(monthDate.year, monthDate.month, dayNum);
    });
  }

  Widget _buildMonthExpanded() {
    final cells = _monthCells(_selectedDay);
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
              final selected = _isSameDay(day, _selectedDay);
              return InkWell(
                onTap: () {
                  setState(() {
                    _selectedDay = day;
                    _weekStart = day.subtract(Duration(days: day.weekday - 1));
                    _isMonthExpanded = false;
                  });
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

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  int _sessionsCountForDay(DateTime day) {
    return _sessionCountByDay[_dayKey(day)] ?? 0;
  }

  int _dayKey(DateTime d) => d.year * 10000 + d.month * 100 + d.day;

  @override
  Widget build(BuildContext context) {
    return Consumer<LocaleProvider>(
      builder: (context, locale, _) {
        final daySessions = _sessionsForSelectedDay();
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
                      child: CircularProgressIndicator(
                        color: AppColors.primary500,
                      ),
                    )
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(12, 16, 12, 20),
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                _weekTitle(),
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
                                final today = DateTime(
                                  now.year,
                                  now.month,
                                  now.day,
                                );
                                setState(() {
                                  _selectedDay = today;
                                  _weekStart = today.subtract(
                                    Duration(days: today.weekday - 1),
                                  );
                                });
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
                                style: TextStyle(color: AppColors.textPrimary),
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
                        if (_isMonthExpanded)
                          GestureDetector(
                            onHorizontalDragEnd: (details) {
                              const threshold = 90.0;
                              if ((details.primaryVelocity ?? 0) < -threshold) {
                                _shiftMonth(1);
                              } else if ((details.primaryVelocity ?? 0) >
                                  threshold) {
                                _shiftMonth(-1);
                              }
                            },
                            child: _buildMonthExpanded(),
                          )
                        else
                          SizedBox(
                            height: 74,
                            child: PageView.builder(
                              controller: _weekPagerController,
                              physics: const _AmplifiedWeekPageScrollPhysics(),
                              onPageChanged: (page) {
                                final delta = page - _weekInitialPage;
                                if (delta == 0) return;
                                setState(() {
                                  _weekStart = _weekStart.add(
                                    Duration(days: delta * 7),
                                  );
                                  _selectedDay = _selectedDay.add(
                                    Duration(days: delta * 7),
                                  );
                                });
                                WidgetsBinding.instance.addPostFrameCallback((
                                  _,
                                ) {
                                  if (!mounted) return;
                                  _weekPagerController.jumpToPage(
                                    _weekInitialPage,
                                  );
                                });
                              },
                              itemBuilder: (context, pageIndex) {
                                final baseWeekStart = _weekStart.add(
                                  Duration(
                                    days: (pageIndex - _weekInitialPage) * 7,
                                  ),
                                );
                                return Row(
                                  children: List.generate(7, (index) {
                                    final day = baseWeekStart.add(
                                      Duration(days: index),
                                    );
                                    final selected = _isSameDay(
                                      day,
                                      _selectedDay,
                                    );
                                    final sessionsCount = _sessionsCountForDay(
                                      day,
                                    );
                                    return Expanded(
                                      child: Padding(
                                        padding: EdgeInsets.only(
                                          right: index == 6 ? 0 : 6,
                                        ),
                                        child: InkWell(
                                          onTap: () {
                                            setState(() {
                                              _selectedDay = DateTime(
                                                day.year,
                                                day.month,
                                                day.day,
                                              );
                                            });
                                          },
                                          borderRadius: BorderRadius.circular(
                                            22,
                                          ),
                                          child: Container(
                                            height: 74,
                                            decoration: BoxDecoration(
                                              color: selected
                                                  ? AppColors.primary500
                                                  : AppColors.backgroundPrimary,
                                              borderRadius:
                                                  BorderRadius.circular(22),
                                              border: Border.all(
                                                color: selected
                                                    ? AppColors.primary500
                                                    : AppColors.borderPrimary,
                                              ),
                                            ),
                                            padding: const EdgeInsets.symmetric(
                                              vertical: 8,
                                            ),
                                            child: Column(
                                              mainAxisAlignment:
                                                  MainAxisAlignment.center,
                                              children: [
                                                Text(
                                                  _weekdayShort(day),
                                                  style: TextStyle(
                                                    fontSize: 9,
                                                    fontWeight: FontWeight.w700,
                                                    color: selected
                                                        ? Colors.white
                                                        : AppColors
                                                              .textSecondary,
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
                                                Text(
                                                  '$sessionsCount',
                                                  style: TextStyle(
                                                    fontSize: 10,
                                                    fontWeight: FontWeight.w600,
                                                    color: selected
                                                        ? Colors.white70
                                                        : AppColors
                                                              .textSecondary,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                      ),
                                    );
                                  }),
                                );
                              },
                            ),
                          ),
                        const SizedBox(height: 14),
                        Text(
                          'Daily schedule',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 12),
                        if (daySessions.isEmpty)
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: AppColors.backgroundPrimary,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: AppColors.borderPrimary,
                              ),
                            ),
                            child: Text(
                              'No trainings for selected day',
                              style: TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 14,
                              ),
                            ),
                          )
                        else
                          ...daySessions.map(
                            (s) => OwnerTrainingSessionCard(
                              session: s,
                              trainerFallbackName: _ownerTrainerFallback(),
                              onTap: () =>
                                  OwnerTrainingSessionCard.showDetailsModal(
                                    context,
                                    s,
                                    trainerFallbackName:
                                        _ownerTrainerFallback(),
                                    onEditSession: s.sessionId.isNotEmpty
                                        ? () {
                                            final shell = context
                                                .findAncestorStateOfType<
                                                    MainShellState>();
                                            shell?.navigateToTab0Route(
                                              '/owner/session/edit',
                                              arguments: s.toRouteArgs(),
                                            );
                                          }
                                        : null,
                                    onEditService: s.trainingId.isNotEmpty
                                        ? () {
                                            final shell = context
                                                .findAncestorStateOfType<
                                                    MainShellState>();
                                            shell?.navigateToTab0Route(
                                              '/services',
                                              arguments: {
                                                'editTrainingId': s.trainingId,
                                              },
                                            );
                                          }
                                        : null,
                                  ),
                            ),
                          ),
                      ],
                    ),
            ),
          ),
        );
      },
    );
  }
}

/// Amplifies horizontal drag so switching weeks needs less finger travel.
class _AmplifiedWeekPageScrollPhysics extends PageScrollPhysics {
  const _AmplifiedWeekPageScrollPhysics({
    super.parent,
    this.dragMultiplier = 1.55,
  });

  final double dragMultiplier;

  @override
  _AmplifiedWeekPageScrollPhysics applyTo(ScrollPhysics? ancestor) {
    return _AmplifiedWeekPageScrollPhysics(
      parent: buildParent(ancestor),
      dragMultiplier: dragMultiplier,
    );
  }

  @override
  double applyPhysicsToUserOffset(ScrollMetrics position, double offset) {
    return super.applyPhysicsToUserOffset(
      position,
      offset * dragMultiplier,
    );
  }
}
