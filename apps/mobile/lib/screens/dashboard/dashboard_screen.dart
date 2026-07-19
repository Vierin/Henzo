import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import '../../utils/owner_studio_setup_errors.dart';
import '../../utils/load_error_message.dart';
import '../../utils/show_api_error.dart';
import '../../widgets/common/load_error_view.dart';
import '../../models/studio.dart';
import '../../models/studio_status.dart';
import '../../models/user_model.dart';
import '../../services/auth_service.dart';
import '../../services/api_client.dart';
import '../../services/cache/owner_sessions_cache.dart';
import '../../services/cache/studio_cache.dart';
import '../../services/dashboard_api_service.dart';
import '../../services/notifications_store.dart';
import '../../services/subscription_refresh_notifier.dart';
import '../../utils/color_hex.dart';
import '../../utils/owner_session_card_subtitle.dart';
import '../../widgets/dashboard/owner_checklist_card.dart';
import '../../models/training_location_item.dart';
import '../../widgets/dashboard/owner_daily_schedule_block.dart';
import '../../navigation/owner_session_navigation.dart';
import '../owner_training_session_detail_screen.dart';
import '../main_shell.dart';
import '../settings_screen.dart';
import '../notifications_screen.dart';
import '../trainer/trainer_session_enrollments_screen.dart';
import '../trainer/trainer_shell.dart';
import '../../services/trainer_api_service.dart';
import '../public_studio_detail_screen.dart';
import '../studio_details_screen.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key, this.trainerMode = false});

  /// Trainer panel: same home UI without owner onboarding checklist / edit.
  final bool trainerMode;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  // Custom palette matching the design mock.
  static const _statGreen = Color(0xFFC2F600); // lime-yellow stat card
  static const _statClassesEmpty = Color(0xFFF15942);
  static const _statPink = Color(0xFFFAD0C5); // salmon stat card

  Studio? _studio;
  StudioOnboardingChecklist? _checklist;
  List<OwnerTrainingSession> _todaySessions = [];
  List<OwnerTrainingSession> _upcomingSessions = [];
  final Map<String, Map<String, dynamic>> _trainerRawSessionsById = {};
  String? _sessionsLoadError;
  bool _isPublishing = false;
  bool _dataLoaded = false;
  bool _loadingData = false;
  SubscriptionRefreshNotifier? _subRefresh;
  StudioCache? _studioCache;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (!widget.trainerMode) {
        _subRefresh = context.read<SubscriptionRefreshNotifier>();
        _subRefresh!.addListener(_onSubscriptionRefresh);
        _studioCache = context.read<StudioCache>();
        _studioCache!.addListener(_onStudioCacheChanged);
      }
      _loadData();
    });
  }

  void _onSubscriptionRefresh() {
    if (mounted) _loadData();
  }

  void _onStudioCacheChanged() {
    if (!mounted || widget.trainerMode) return;
    _loadData();
  }

  @override
  void dispose() {
    _subRefresh?.removeListener(_onSubscriptionRefresh);
    _studioCache?.removeListener(_onStudioCacheChanged);
    super.dispose();
  }

  Future<void> _loadData() async {
    if (!mounted || _loadingData) return;
    _loadingData = true;
    try {
      final auth = context.read<AuthService>();
      final token = auth.accessToken;
      if (token == null || token.isEmpty) {
        if (mounted) {
          setState(() => _studio = null);
        }
        return;
      }

      unawaited(context.read<NotificationsStore>().syncFromServer(token));

      final now = DateTime.now();
      final from = DateTime(now.year, now.month, now.day);
      final to = from.add(const Duration(days: 8));
      final fromUtc = from.toUtc();
      final toUtc = to.toUtc();

      List<OwnerTrainingSession> sessions = [];
      String? sessionsLoadError;
      StudioOnboardingChecklist? checklist;
      Studio? studio;

      if (widget.trainerMode) {
        final auth = context.read<AuthService>();
        final trainerName = auth.trainerInfo?.name.trim().isNotEmpty == true
            ? auth.trainerInfo!.name.trim()
            : (auth.user?.name?.trim().isNotEmpty == true
                  ? auth.user!.name!.trim()
                  : '—');
        final studioId = auth.trainerInfo?.studioId;
        try {
          final results = await Future.wait([
            TrainerApiService.getSessions(token, from: fromUtc, to: toUtc),
            if (studioId != null && studioId.isNotEmpty)
              TrainerApiService.fetchStudioForLocations(studioId)
            else
              Future<Studio?>.value(null),
          ]);
          final result = results[0] as Map<String, dynamic>;
          final trainerStudio = results.length > 1
              ? results[1] as Studio?
              : null;
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
            sessions.add(session);
          }
          sessions.sort((a, b) => a.startsAt.compareTo(b.startsAt));
          if (mounted) {
            setState(() {
              _studio = trainerStudio;
              _checklist = null;
              _trainerRawSessionsById
                ..clear()
                ..addAll(rawById);
              _todaySessions = sessions.where((s) {
                final local = s.startsAt.toLocal();
                return local.year == from.year &&
                    local.month == from.month &&
                    local.day == from.day;
              }).toList();
              _upcomingSessions = sessions;
              _sessionsLoadError = null;
              _dataLoaded = true;
            });
          }
        } catch (e) {
          if (mounted) {
            setState(() {
              _todaySessions = [];
              _upcomingSessions = [];
              _sessionsLoadError = loadErrorMessage(
                context.read<LocaleProvider>(),
                e,
              );
              _dataLoaded = true;
            });
          }
        }
        return;
      }

      final cache = context.read<OwnerSessionsCache>();
      studio = await context.read<StudioCache>().getStudio(token);

      final sessionsFuture = cache
          .getSessions(token, fromUtc: fromUtc, toUtc: toUtc)
          .then<List<OwnerTrainingSession>>((s) => s)
          .catchError((Object e) {
            if (mounted) {
              sessionsLoadError = loadErrorMessage(
                context.read<LocaleProvider>(),
                e,
              );
            }
            return <OwnerTrainingSession>[];
          });

      final checklistFuture = studio != null
          ? DashboardApiService.getCurrentStudioOnboardingChecklist(
              token,
            ).catchError((_) => null)
          : Future<StudioOnboardingChecklist?>.value(null);

      final results = await Future.wait([sessionsFuture, checklistFuture]);
      sessions = (results[0] as List<OwnerTrainingSession>)
        ..sort((a, b) => a.startsAt.compareTo(b.startsAt));
      checklist = results[1] as StudioOnboardingChecklist?;

      final todayOnly = sessions.where((s) {
        final local = s.startsAt.toLocal();
        return local.year == from.year &&
            local.month == from.month &&
            local.day == from.day;
      }).toList();
      if (mounted) {
        setState(() {
          _studio = studio;
          _checklist = checklist;
          _trainerRawSessionsById.clear();
          _todaySessions = todayOnly;
          _upcomingSessions = sessions;
          _sessionsLoadError = sessionsLoadError;
          _dataLoaded = true;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _checklist = null;
          _todaySessions = [];
          _upcomingSessions = [];
          _sessionsLoadError = loadErrorMessage(
            context.read<LocaleProvider>(),
            e,
          );
          _dataLoaded = true;
        });
        if (!isOwnerStudioNotReadyError(e)) {
          showApiError(context, e);
        }
      }
    } finally {
      _loadingData = false;
    }
  }

  Future<void> _handleRefresh() async {
    if (!mounted) return;
    if (!widget.trainerMode) {
      context.read<OwnerSessionsCache>().invalidate();
      // Force refetch without wipe — keeps last studio if network fails.
      final token = context.read<AuthService>().accessToken;
      if (token != null && token.isNotEmpty) {
        try {
          await context.read<StudioCache>().getStudio(token, force: true);
        } catch (_) {}
      }
    }
    await _loadData();
  }

  Future<void> _openTrainingSetup() async {
    final changed = await Navigator.of(
      context,
    ).pushNamed<bool>('/trainings/new');
    if (changed == true && mounted) {
      context.read<OwnerSessionsCache>().invalidate();
      await _loadData();
    }
  }

  Future<void> _openStudioDetails() async {
    final saved = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (_) => const StudioDetailsScreen()),
    );
    if (saved == true && mounted) {
      context.read<StudioCache>().invalidate();
      context.read<OwnerSessionsCache>().invalidate();
      await _loadData();
    }
  }

  Future<void> _openStudioProfileSettings({
    StudioProfileFocusTarget? focusTarget,
  }) async {
    await Navigator.push<void>(
      context,
      MaterialPageRoute(
        builder: (_) => SettingsScreen(initialFocusTarget: focusTarget),
      ),
    );
    if (mounted) {
      context.read<StudioCache>().invalidate();
      await _loadData();
    }
  }

  Future<void> _previewPublicPage() async {
    final studio = _studio;
    if (studio == null) return;
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (_) => PublicStudioDetailScreen(studioId: studio.id),
      ),
    );
  }

  bool _studioDetailsCompleted(Studio? studio) {
    if (studio == null) return false;
    final name = studio.name?.trim();
    if (name == null || name.isEmpty) return false;

    final address = studio.address?.trim();
    if (address != null && address.isNotEmpty) return true;

    final locale = context.read<LocaleProvider>();
    final primary = TrainingLocationItem.defaultFromSalon(
      studio,
      mainStudioName: locale.t('locations.mainStudio'),
    );
    return primary.address.trim().isNotEmpty;
  }

  StudioStatus _studioStatus(Studio? studio, StudioOnboardingChecklist? c) {
    if (studio != null) return studio.status;
    return StudioStatus.parse(c?.status);
  }

  Future<void> _publishStudio() async {
    final token = context.read<AuthService>().accessToken;
    final studio = _studio;
    if (token == null || token.isEmpty || studio == null) return;
    if (_isPublishing) return;
    setState(() => _isPublishing = true);
    try {
      await DashboardApiService.publishStudio(token, studio.id);
      if (!mounted) return;
      context.read<StudioCache>().invalidate();
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(
        SnackBar(
          content: Text(
            context.read<LocaleProvider>().t('dashboard.studioNowActive'),
          ),
        ),
      );
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

  String? _venueLabel() {
    if (widget.trainerMode) {
      final studioName = context
          .read<AuthService>()
          .trainerInfo
          ?.studioName
          .trim();
      if (studioName != null && studioName.isNotEmpty) return studioName;
      return null;
    }
    final s = _studio;
    if (s == null) return null;
    final n = s.name?.trim();
    if (n != null && n.isNotEmpty) return n;
    final a = s.address?.trim();
    if (a != null && a.isNotEmpty) return a;
    return null;
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
    final u = context.read<AuthService>().user;
    if (u == null) return null;
    final name = u.name;
    if (name != null && name.trim().isNotEmpty) return name.trim();
    final email = u.email.trim();
    if (email.isNotEmpty) return email;
    return null;
  }

  String _displayTrainer(OwnerTrainingSession s) {
    final raw = s.trainerName.trim();
    if (raw.isNotEmpty && raw != '—' && raw != '-') return s.trainerName;
    final f = _ownerTrainerFallback()?.trim();
    if (f != null && f.isNotEmpty) return f;
    return '—';
  }

  OwnerTrainingSession? get _featuredSession {
    if (_upcomingSessions.isEmpty) return null;
    final now = DateTime.now();
    for (final s in _upcomingSessions) {
      if (s.endsAt.isAfter(now)) return s;
    }
    return null;
  }

  bool _isSessionToday(OwnerTrainingSession s) {
    final local = s.startsAt.toLocal();
    final now = DateTime.now();
    return local.year == now.year &&
        local.month == now.month &&
        local.day == now.day;
  }

  String _formatNextDate(OwnerTrainingSession s, String localeCode) {
    final local = s.startsAt.toLocal();
    return DateFormat('E, d MMM', localeCode).format(local).toUpperCase();
  }

  String _formatDateHeader(String localeCode) {
    final f = DateFormat('EEEE, d MMM', localeCode);
    return f.format(DateTime.now()).toUpperCase();
  }

  String _formatTimeRange(OwnerTrainingSession s) {
    final start = TimeOfDay.fromDateTime(s.startsAt.toLocal());
    final end = TimeOfDay.fromDateTime(s.endsAt.toLocal());
    final startStr = MaterialLocalizations.of(
      context,
    ).formatTimeOfDay(start, alwaysUse24HourFormat: true);
    final endStr = MaterialLocalizations.of(
      context,
    ).formatTimeOfDay(end, alwaysUse24HourFormat: true);
    return '$startStr - $endStr';
  }

  int get _todayBookings =>
      _todaySessions.fold<int>(0, (a, s) => a + s.enrolledCount);

  int get _todayWaitlist => _todaySessions.fold<int>(0, (total, session) {
    return total + session.waitlistCount;
  });

  void _openSessionDetail(OwnerTrainingSession s) {
    // Guard against rapid double-taps opening the page 2-3 times.
    if (ModalRoute.of(context)?.isCurrent != true) return;
    if (widget.trainerMode) {
      final raw = _trainerRawSessionsById[s.sessionId];
      if (raw == null) return;
      Navigator.of(context)
          .push<void>(
            MaterialPageRoute<void>(
              builder: (_) => TrainerSessionEnrollmentsScreen(session: raw),
            ),
          )
          .then((_) {
            if (mounted) _loadData();
          });
      return;
    }
    Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (detailCtx) => OwnerTrainingSessionDetailScreen(
          session: s,
          trainingColor: parseHexColor(s.trainingDisplayColorHex),
          venueName: _venueLabel(),
          trainerFallbackName: _ownerTrainerFallback(),
          onParticipantsChanged: () {
            context.read<OwnerSessionsCache>().invalidate();
            _loadData();
          },
        ),
      ),
    );
  }

  Future<void> _openEditCurrentSession(OwnerTrainingSession s) async {
    if (s.sessionId.isEmpty) return;
    final updated = await openOwnerEditTrainingSessionFlow(context, s);
    if (updated != null && mounted) {
      context.read<OwnerSessionsCache>().invalidate();
      await _loadData();
    }
  }

  // --- UI ---------------------------------------------------------------

  Widget _header(LocaleProvider loc) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Text(
              _formatDateHeader(loc.localeCode),
              style: TextStyle(
                fontSize: 14.sp,
                fontWeight: FontWeight.w500,
                letterSpacing: 1.1,
                color: AppColors.textPrimary,
              ),
            ),
          ),
          Consumer<NotificationsStore>(
            builder: (context, store, _) {
              final count = store.unreadCount;
              final hasUnread = count > 0;
              return GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const NotificationsScreen(),
                  ),
                ),
                child: hasUnread
                    ? Container(
                        height: 40,
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: AppColors.primary500,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            SvgPicture.asset(
                              'assets/icons/icon-bell.svg',
                              width: 22,
                              height: 22,
                              colorFilter: const ColorFilter.mode(
                                Colors.white,
                                BlendMode.srcIn,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              count > 99 ? '99+' : '$count',
                              style: TextStyle(
                                fontSize: 16.sp,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                                height: 1.0,
                              ),
                            ),
                          ],
                        ),
                      )
                    : Container(
                        width: 40,
                        height: 40,
                        decoration: const BoxDecoration(
                          color: AppColors.backgroundPrimary,
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: SvgPicture.asset(
                            'assets/icons/icon-bell.svg',
                            width: 22,
                            height: 22,
                            colorFilter: const ColorFilter.mode(
                              AppColors.textPrimary,
                              BlendMode.srcIn,
                            ),
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

  String _greetingUserLine(UserModel? user) {
    final n = user?.name?.trim();
    if (n != null && n.isNotEmpty) return n;
    final e = user?.email.trim() ?? '';
    if (e.isNotEmpty) return e;
    return '';
  }

  Widget _greeting(LocaleProvider loc, UserModel? user) {
    final name = _greetingUserLine(user);
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            loc.t('dashboard.helloGreeting'),
            style: TextStyle(
              fontSize: 28.sp,
              fontWeight: FontWeight.w500,
              height: 1.1,
              color: AppColors.textPrimary,
            ),
          ),
          if (name.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(
              name,
              style: TextStyle(
                fontSize: 28.sp,
                fontWeight: FontWeight.w400,
                height: 1.15,
                color: AppColors.textPrimary,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ],
      ),
    );
  }

  Widget _statCard({
    required String value,
    required String label,
    required Color background,
    Color textColor = AppColors.textPrimary,
    bool bordered = false,
  }) {
    return AspectRatio(
      aspectRatio: 1,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.fromLTRB(15, 15, 15, 15),
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(
                value,
                style: TextStyle(
                  fontSize: 30.sp,
                  fontWeight: FontWeight.w500,
                  height: 0.8,
                  color: textColor,
                ),
              ),
            ),
            Text(
              label,
              style: TextStyle(
                fontSize: 14.sp,
                fontWeight: FontWeight.w400,
                height: 1,
                color: textColor,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _statsRow(LocaleProvider loc) {
    final classesToday = _todaySessions.length;
    final classesBg = classesToday > 0 ? _statGreen : _statClassesEmpty;
    final classesText = classesToday > 0 ? AppColors.textPrimary : Colors.white;

    return Padding(
      padding: const EdgeInsets.fromLTRB(10, 0, 10, 20),
      child: Row(
        children: [
          Expanded(
            child: _statCard(
              value: '$classesToday',
              label: loc.t('dashboard.classesToday'),
              background: classesBg,
              textColor: classesText,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _statCard(
              value: '$_todayBookings',
              label: loc.t('dashboard.bookingsToday'),
              background: _statPink,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _statCard(
              value: '$_todayWaitlist',
              label: loc.t('dashboard.waitlist'),
              background: AppColors.backgroundPrimary,
              bordered: true,
            ),
          ),
        ],
      ),
    );
  }

  String _featuredSessionMeta(LocaleProvider loc, OwnerTrainingSession s) {
    final timeRange = _formatTimeRange(s);
    if (widget.trainerMode) {
      final sub = resolveOwnerSessionCardSubtitle(
        session: s,
        studioLocations: _studioLocations(context),
        ownerTrainerFallback: _ownerTrainerFallback(),
      );
      if (sub.label.isNotEmpty) {
        return '$timeRange · ${sub.label}';
      }
      return timeRange;
    }
    final withTrainer = loc
        .t('dashboard.featuredWith')
        .replaceAll('{name}', _displayTrainer(s));
    return '$timeRange · $withTrainer';
  }

  Widget _featuredCard(
    LocaleProvider loc,
    OwnerTrainingSession s, {
    required bool isToday,
  }) {
    final cap = s.capacity;
    final enrolled = s.enrolledCount;
    final progress = cap > 0 ? (enrolled / cap).clamp(0.0, 1.0) : 0.0;
    final percent = (progress * 100).round();
    final fillLabel = cap > 0 ? '$enrolled / $cap' : '$enrolled';

    const double ringsBox = 200;
    const double editHalf = 15;
    // Stack coords: edit button center ≈ (w - _editHalf, _editHalf) in top row.
    const double ringsRight = editHalf - ringsBox / 2;
    const double ringsTop = editHalf - ringsBox / 2;

    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 20),
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => _openSessionDetail(s),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(22),
          child: ColoredBox(
            color: AppColors.primary500,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 20, 14, 20),
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Positioned(
                    right: ringsRight,
                    top: ringsTop,
                    width: ringsBox,
                    height: ringsBox,
                    child: IgnorePointer(
                      child: Opacity(
                        opacity: 0.18,
                        child: CustomPaint(
                          painter: _RingsPainter(color: Colors.white),
                        ),
                      ),
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          SvgPicture.asset(
                            'assets/icons/icon-pin.svg',
                            width: 8,
                            height: 12,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            isToday
                                ? loc.t('dashboard.featuredToday')
                                : '${loc.t('dashboard.featuredNext')} · ${_formatNextDate(s, loc.localeCode)}',
                            style: TextStyle(
                              fontSize: 14.sp,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 1.2,
                              color: Colors.white.withValues(alpha: 0.95),
                            ),
                          ),
                          const Spacer(),
                          if (!widget.trainerMode && s.sessionId.isNotEmpty)
                            GestureDetector(
                              behavior: HitTestBehavior.opaque,
                              onTap: () => _openEditCurrentSession(s),
                              child: Container(
                                width: 30,
                                height: 30,
                                decoration: const BoxDecoration(
                                  color: Colors.white,
                                  shape: BoxShape.circle,
                                ),
                                alignment: Alignment.center,
                                child: SvgPicture.asset(
                                  'assets/icons/icon-pencil.svg',
                                  width: 16,
                                  height: 16,
                                  colorFilter: const ColorFilter.mode(
                                    AppColors.primary500,
                                    BlendMode.srcIn,
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        s.trainingName,
                        style: TextStyle(
                          fontSize: 24.sp,
                          fontWeight: FontWeight.w700,
                          height: 1,
                          color: Colors.white,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        _featuredSessionMeta(loc, s),
                        style: TextStyle(
                          fontSize: 14.sp,
                          fontWeight: FontWeight.w500,
                          color: Colors.white,
                          letterSpacing: -0.15,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 18),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          SizedBox(
                            width: 54,
                            height: 54,
                            child: Stack(
                              fit: StackFit.expand,
                              children: [
                                CircularProgressIndicator(
                                  value: progress,
                                  strokeWidth: 5,
                                  backgroundColor: Colors.white.withValues(
                                    alpha: 0.35,
                                  ),
                                  valueColor:
                                      const AlwaysStoppedAnimation<Color>(
                                        Colors.white,
                                      ),
                                ),
                                Center(
                                  child: Text(
                                    '$percent%',
                                    style: TextStyle(
                                      fontSize: 15.sp,
                                      fontWeight: FontWeight.w700,
                                      color: Colors.white,
                                      height: 1,
                                      letterSpacing: -0.15,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  fillLabel,
                                  style: TextStyle(
                                    fontSize: 16.sp,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.white,
                                    height: 1,
                                    letterSpacing: -0.8,
                                  ),
                                ),
                                Text(
                                  loc.t('dashboard.bookedLabel'),
                                  style: TextStyle(
                                    fontSize: 14.sp,
                                    fontWeight: FontWeight.w400,
                                    color: Colors.white,
                                    letterSpacing: -0.15,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          GestureDetector(
                            behavior: HitTestBehavior.opaque,
                            onTap: () => _openSessionDetail(s),
                            child: Container(
                              margin: const EdgeInsets.only(top: 15),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 10,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    widget.trainerMode
                                        ? loc.t('trainer.viewRoster')
                                        : loc.t('dashboard.showMore'),
                                    style: TextStyle(
                                      fontSize: 14.sp,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                  const SizedBox(width: 2),
                                  const Icon(
                                    Icons.chevron_right,
                                    size: 20,
                                    color: AppColors.textPrimary,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _checklistBlock() {
    if (!_dataLoaded) return const SizedBox.shrink();
    // Network/API failure with no studio must not look like empty onboarding.
    if (_sessionsLoadError != null && _studio == null) {
      return const SizedBox.shrink();
    }

    final studio = _studio;
    final c = _checklist;
    final status = _studioStatus(studio, c);

    if (!status.showsOnboarding) return const SizedBox.shrink();

    final studioDetails = c != null && c.includesStudioDetailsStep
        ? c.hasStudioDetails.completed
        : _studioDetailsCompleted(studio);
    final hasTraining = c?.hasTraining.completed ?? false;
    final hasPhoto = c?.hasPhoto.completed ?? false;
    final hasName = (studio?.name?.trim().isNotEmpty ?? false);
    // Belt: never show Activate if name/address incomplete (old API gap).
    final canPublish = (c?.canPublish ?? false) && studioDetails;

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        kScreenPaddingHorizontal,
        4,
        kScreenPaddingHorizontal,
        16,
      ),
      child: OwnerChecklistCard(
        studioDetailsCompleted: studioDetails,
        hasTraining: hasTraining,
        hasPhoto: hasPhoto,
        canPublish: canPublish,
        isStudioActive: status.isActive,
        isPublishing: _isPublishing,
        showPreviewButton: studio != null && hasName,
        onStudioDetailsTap: _openStudioDetails,
        onCreateTrainingTap: _openTrainingSetup,
        onAddPhotoTap: _openStudioProfileSettings,
        onPreviewPublicPageTap: _previewPublicPage,
        onPublishTap: _publishStudio,
      ),
    );
  }

  void _openCreateTraining() {
    if (_studio == null) {
      final locale = context.read<LocaleProvider>();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(locale.t('common.setupSalonFirst'))),
      );
      unawaited(_openStudioDetails());
      return;
    }
    final shell = context.findAncestorStateOfType<MainShellState>();
    if (shell != null) {
      shell.navigateToTab0Route('/trainings/new');
      return;
    }
    Navigator.of(context).pushNamed('/trainings/new');
  }

  @override
  Widget build(BuildContext context) {
    final loc = context.watch<LocaleProvider>();
    final authUser = context.watch<AuthService>().user;
    final featured = _featuredSession;
    final showAddFab = !widget.trainerMode;

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      floatingActionButton: showAddFab
          ? SafeArea(
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
            )
          : null,
      floatingActionButtonLocation: showAddFab
          ? FloatingActionButtonLocation.endFloat
          : null,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _handleRefresh,
          color: AppColors.primary500,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _header(loc),
                _greeting(loc, authUser),
                _statsRow(loc),
                if (featured != null)
                  _featuredCard(
                    loc,
                    featured,
                    isToday: _isSessionToday(featured),
                  ),
                if (!widget.trainerMode) _checklistBlock(),
                if (_sessionsLoadError != null)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(
                      kScreenPaddingHorizontal,
                      0,
                      kScreenPaddingHorizontal,
                      12,
                    ),
                    child: LoadErrorView(
                      compact: true,
                      message: _sessionsLoadError!,
                      onRetry: _handleRefresh,
                    ),
                  )
                else
                  OwnerDailyScheduleBlock(
                    sessions: _todaySessions,
                    emptyMessage: loc.t('dashboard.noTrainingsToday'),
                    emptySubtitle: loc.t('dashboard.enjoyYourDay'),
                    onSeeAll: widget.trainerMode
                        ? () => context
                              .findAncestorStateOfType<TrainerShellState>()
                              ?.openScheduleTabForToday()
                        : (_studio == null
                              ? null
                              : () => context
                                    .findAncestorStateOfType<MainShellState>()
                                    ?.openScheduleTabForToday()),
                    onSessionTap: _openSessionDetail,
                    ownerTrainerFallback: _ownerTrainerFallback(),
                    studioLocations: _studioLocations(context),
                    completedLabel: widget.trainerMode
                        ? loc.t('trainer.sessionCompleted')
                        : null,
                  ),
                const SizedBox(height: 16),
                SizedBox(height: showAddFab ? 72 : 0),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _RingsPainter extends CustomPainter {
  _RingsPainter({required this.color});
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4;
    final center = Offset(size.width / 2, size.height / 2);
    const radii = <double>[10, 36, 62, 88, 114];
    for (final r in radii) {
      canvas.drawCircle(center, r, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _RingsPainter old) => old.color != color;
}
