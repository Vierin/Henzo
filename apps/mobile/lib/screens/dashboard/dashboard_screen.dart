import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../utils/currency_format.dart';
import '../../utils/show_api_error.dart';
import '../../models/salon.dart';
import '../../services/auth_service.dart';
import '../../services/api_client.dart';
import '../../services/cache/salon_cache.dart';
import '../../services/dashboard_api_service.dart';
import '../../services/notifications_store.dart';
import '../../utils/color_hex.dart';
import '../../widgets/dashboard/dashboard_header_pill.dart';
import '../../widgets/dashboard/owner_checklist_card.dart';
import '../../widgets/dashboard/dashboard_setup_card.dart';
import '../../widgets/dashboard/owner_weekly_insight_strip.dart';
import '../../widgets/owner_training_session_card.dart';
import '../owner_training_session_detail_screen.dart';
import '../app_settings_screen.dart';
import 'owner_studio_reviews_screen.dart';
import '../notifications_screen.dart';
import '../salon_setup_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Salon? _salon;
  StudioOnboardingChecklist? _checklist;
  List<OwnerTrainingSession> _todaySessions = [];
  StudioAnalytics? _weekLast;
  bool _isLoading = false;
  bool _isPublishing = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadData());
  }

  Future<void> _loadData() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    final auth = context.read<AuthService>();
    final token = auth.accessToken;
    if (token == null || token.isEmpty) {
      if (mounted) {
        setState(() {
          _salon = null;
          _weekLast = null;
          _isLoading = false;
        });
      }
      return;
    }
    try {
      final salon = await context.read<SalonCache>().getSalon(token);
      final now = DateTime.now();
      final from = DateTime(now.year, now.month, now.day);
      final to = from.add(const Duration(days: 1));
      List<OwnerTrainingSession> sessions = [];
      StudioOnboardingChecklist? checklist;
      StudioAnalytics? weekLast;
      try {
        sessions = await DashboardApiService.getOwnerTrainingSessions(
          token,
          fromIso: from.toUtc().toIso8601String(),
          toIso: to.toUtc().toIso8601String(),
        );
        sessions.sort((a, b) => a.startsAt.compareTo(b.startsAt));
      } catch (_) {
        // Daily sessions are non-blocking for dashboard bootstrap.
        sessions = [];
      }
      if (salon != null) {
        final lastWeek = _lastCompletedCalendarWeekLocal();
        final checklistFuture =
            DashboardApiService.getCurrentStudioOnboardingChecklist(token);
        final analyticsFuture = DashboardApiService.getCurrentStudioAnalytics(
          token,
          fromIso: lastWeek.from.toUtc().toIso8601String(),
          toIso: lastWeek.to.toUtc().toIso8601String(),
        );
        checklist = await checklistFuture;
        try {
          weekLast = await analyticsFuture;
        } catch (_) {
          weekLast = null;
        }
      }
      if (mounted) {
        setState(() {
          _salon = salon;
          _checklist = checklist;
          _todaySessions = sessions;
          _weekLast = weekLast;
          if (salon == null) {
            _weekLast = null;
          }
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _checklist = null;
          _todaySessions = [];
          _weekLast = null;
          _isLoading = false;
        });
        showApiError(context, e);
      }
    }
  }

  /// Mon 00:00 – Sun 23:59:59 of the last full calendar week (before current week).
  ({DateTime from, DateTime to}) _lastCompletedCalendarWeekLocal() {
    final now = DateTime.now();
    final todayStart = DateTime(now.year, now.month, now.day);
    final thisMonday = todayStart.subtract(
      Duration(days: todayStart.weekday - 1),
    );
    final lastSunday = thisMonday.subtract(const Duration(days: 1));
    final to = DateTime(
      lastSunday.year,
      lastSunday.month,
      lastSunday.day,
      23,
      59,
      59,
    );
    final from = thisMonday.subtract(const Duration(days: 7));
    return (from: from, to: to);
  }

  double _thirdMetricValue(StudioAnalytics a) {
    if (a.isPro) return a.trainingSessionsScheduled.toDouble();
    if (a.bookingCount <= 0) return 0;
    return a.revenueTotal / a.bookingCount;
  }

  Widget _buildWeeklyInsights(LocaleProvider loc) {
    final current = _weekLast;
    if (current == null) return const SizedBox.shrink();

    final t = loc.t;

    final todayClasses = _todaySessions.length;
    final todayBookings = _todaySessions.fold<int>(
      0,
      (a, s) => a + s.enrolledCount,
    );
    final todayLine = t('dashboard.todaySummary')
        .replaceAll('{classes}', '$todayClasses')
        .replaceAll('{bookings}', '$todayBookings');

    final showSessions = current.isPro;

    return OwnerWeeklyInsightStrip(
      todaySummaryLine: todayLine,
      sectionTitle: t('dashboard.weeklyInsightsTitle'),
      cards: [
        OwnerWeeklyInsightCard(
          label: t('dashboard.weeklyRevenueLabel'),
          value: formatVnd(current.revenueTotal),
          brandVariant: 0,
        ),
        OwnerWeeklyInsightCard(
          label: t('dashboard.weeklyBookingsLabel'),
          value: '${current.bookingCount}',
          brandVariant: 1,
        ),
        OwnerWeeklyInsightCard(
          label: showSessions
              ? t('dashboard.weeklySessionsLabel')
              : t('dashboard.weeklyAvgTicketLabel'),
          value: showSessions
              ? '${current.trainingSessionsScheduled}'
              : formatVnd(_thirdMetricValue(current)),
          brandVariant: 2,
        ),
      ],
    );
  }

  Future<void> _handleRefresh() async {
    await _loadData();
  }

  Future<void> _openTrainingSetup() async {
    final changed = await Navigator.of(
      context,
    ).pushNamed<bool>('/trainings/new');
    if (changed == true && mounted) await _loadData();
  }

  Future<void> _openSettings() async {
    final changed = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) =>
            const AppSettingsScreen(initialSection: SettingsHubSection.studio),
      ),
    );
    if (changed == true && mounted) await _loadData();
  }

  Future<void> _openBookingSettings() async {
    final changed = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) =>
            const AppSettingsScreen(initialSection: SettingsHubSection.studio),
      ),
    );
    if (changed == true && mounted) await _loadData();
  }

  String _humanizeChecklistStep(String key) {
    switch (key) {
      case 'hasTraining':
        return 'create first training';
      case 'hasPhoto':
        return 'add studio photo';
      case 'hasLogo':
        return 'add studio logo';
      default:
        return key;
    }
  }

  Future<void> _publishStudio() async {
    final token = context.read<AuthService>().accessToken;
    final salon = _salon;
    if (token == null || token.isEmpty || salon == null) return;
    if (_isPublishing) return;
    setState(() => _isPublishing = true);
    try {
      await DashboardApiService.publishStudio(token, salon.id);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Studio is now active')));
      await _loadData();
    } on ApiException catch (e) {
      if (!mounted) return;
      showApiError(context, e);
    } catch (e) {
      if (!mounted) return;
      showApiError(context, e);
    } finally {
      if (mounted) setState(() => _isPublishing = false);
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

  Widget _buildDailySchedule() {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(horizontal: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Daily schedule',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              Container(
                width: 26,
                height: 26,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.primary500,
                ),
                alignment: Alignment.center,
                child: Text(
                  '${_todaySessions.length}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (_todaySessions.isEmpty)
            Text(
              'No trainings scheduled for today',
              style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
            )
          else
            ..._todaySessions.map((s) {
              final isPast = s.endsAt.isBefore(DateTime.now());
              return OwnerTrainingSessionCard(
                session: s,
                trainingColor: parseHexColor(s.trainingDisplayColorHex),
                margin: const EdgeInsets.only(top: -10),
                isPast: isPast,
                pastLabel: isPast ? 'Past' : null,
                trainerFallbackName: _ownerTrainerFallback(),
                onTap: () {
                  Navigator.of(context).push<void>(
                    MaterialPageRoute<void>(
                      builder: (_) => OwnerTrainingSessionDetailScreen(
                        session: s,
                        trainingColor: parseHexColor(s.trainingDisplayColorHex),
                        trainerFallbackName: _ownerTrainerFallback(),
                        onParticipantsChanged: _loadData,
                        onEditSession: s.sessionId.isNotEmpty
                            ? () async {
                                final changed = await Navigator.of(context)
                                    .pushNamed<bool>(
                                      '/owner/session/edit',
                                      arguments: s.toRouteArgs(),
                                    );
                                if (changed == true && context.mounted) {
                                  _loadData();
                                }
                              }
                            : null,
                        onEditService: s.trainingId.isNotEmpty
                            ? () async {
                                final changed = await Navigator.of(context)
                                    .pushNamed<bool?>(
                                      '/services',
                                      arguments: {
                                        'editTrainingId': s.trainingId,
                                      },
                                    );
                                if (changed == true && context.mounted) {
                                  await _loadData();
                                }
                              }
                            : null,
                      ),
                    ),
                  );
                },
              );
            }),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _handleRefresh,
          color: AppColors.primary500,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 16, 12, 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Expanded(
                        child: Text(
                          _isLoading || _salon == null
                              ? context.watch<LocaleProvider>().t(
                                  'nav.dashboard',
                                )
                              : (_salon!.name ?? ''),
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 4,
                        alignment: WrapAlignment.end,
                        children: [
                          if (_salon != null)
                            DashboardHeaderPill(
                              icon: Icons.star_rounded,
                              label: _salon!.rating != null
                                  ? _salon!.rating!.toStringAsFixed(1)
                                  : '—',
                              onTap: () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => OwnerStudioReviewsScreen(
                                    studioId: _salon!.id,
                                    headerAvgRating: _salon!.rating,
                                  ),
                                ),
                              ),
                            ),
                          Consumer<NotificationsStore>(
                            builder: (context, store, _) {
                              final count = store.unreadCount;
                              return Stack(
                                clipBehavior: Clip.none,
                                children: [
                                  DashboardHeaderIconPill(
                                    icon: Icons.notifications_outlined,
                                    onTap: () => Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) =>
                                            const NotificationsScreen(),
                                      ),
                                    ),
                                  ),
                                  if (count > 0)
                                    Positioned(
                                      top: -4,
                                      right: -4,
                                      child: Container(
                                        padding: const EdgeInsets.all(4),
                                        constraints: const BoxConstraints(
                                          minWidth: 18,
                                          minHeight: 18,
                                        ),
                                        decoration: const BoxDecoration(
                                          color: AppColors.primary500,
                                          shape: BoxShape.circle,
                                        ),
                                        alignment: Alignment.center,
                                        child: Text(
                                          count > 99 ? '99+' : '$count',
                                          style: const TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.w600,
                                            color: Colors.white,
                                          ),
                                        ),
                                      ),
                                    ),
                                ],
                              );
                            },
                          ),
                          DashboardHeaderIconPill(
                            icon: Icons.settings_outlined,
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => const AppSettingsScreen(),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                if (_isLoading)
                  const SizedBox(
                    height: 120,
                    child: Center(
                      child: CircularProgressIndicator(
                        color: AppColors.primary500,
                      ),
                    ),
                  )
                else if (_salon == null)
                  DashboardSetupCard(
                    onSetupTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => SalonSetupScreen(
                          onSaved: () {
                            Navigator.pop(context);
                            _loadData();
                          },
                        ),
                      ),
                    ),
                  )
                else
                  Column(
                    children: [
                      if (_checklist != null &&
                          !(_checklist!.hasTraining.completed &&
                              _checklist!.hasPhoto.completed &&
                              _checklist!.bookingWindowConfigured.completed &&
                              _checklist!.contactsConfigured.completed)) ...[
                        OwnerChecklistCard(
                          hasTraining: _checklist!.hasTraining.completed,
                          hasPhoto: _checklist!.hasPhoto.completed,
                          hasLogo: _checklist!.hasLogo.completed,
                          bookingWindowConfigured:
                              _checklist!.bookingWindowConfigured.completed,
                          contactsConfigured:
                              _checklist!.contactsConfigured.completed,
                          canPublish: _checklist!.canPublish,
                          isStudioActive:
                              _checklist!.status.toUpperCase() == 'ACTIVE',
                          isPublishing: _isPublishing,
                          missingRequiredSteps: _checklist!.missingRequiredSteps
                              .map(_humanizeChecklistStep)
                              .toList(),
                          onCreateTrainingTap: _openTrainingSetup,
                          onAddPhotoTap: _openSettings,
                          onAddLogoTap: _openSettings,
                          onBookingWindowTap: _openBookingSettings,
                          onContactsTap: _openSettings,
                          onPublishTap: _publishStudio,
                        ),
                        const SizedBox(height: 12),
                      ],
                      _buildWeeklyInsights(context.watch<LocaleProvider>()),
                      const SizedBox(height: 16),
                      _buildDailySchedule(),
                    ],
                  ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
