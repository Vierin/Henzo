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
import '../../models/salon.dart';
import '../../models/studio_status.dart';
import '../../models/user_model.dart';
import '../../services/auth_service.dart';
import '../../services/api_client.dart';
import '../../services/cache/owner_sessions_cache.dart';
import '../../services/cache/salon_cache.dart';
import '../../services/dashboard_api_service.dart';
import '../../services/notifications_store.dart';
import '../../services/subscription_refresh_notifier.dart';
import '../../utils/color_hex.dart';
import '../../widgets/dashboard/owner_checklist_card.dart';
import '../../models/training_location_item.dart';
import '../../widgets/dashboard/owner_daily_schedule_block.dart';
import '../../navigation/owner_session_navigation.dart';
import '../owner_training_session_detail_screen.dart';
import '../main_shell.dart';
import '../settings_screen.dart';
import '../notifications_screen.dart';
import '../public_studio_detail_screen.dart';
import '../studio_details_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  // Custom palette matching the design mock.
  static const _statGreen = Color(0xFFC2F600); // lime-yellow stat card
  static const _statClassesEmpty = Color(0xFFF15942);
  static const _statPink = Color(0xFFFAD0C5); // salmon stat card

  Salon? _salon;
  StudioOnboardingChecklist? _checklist;
  List<OwnerTrainingSession> _todaySessions = [];
  String? _sessionsLoadError;
  bool _isPublishing = false;
  SubscriptionRefreshNotifier? _subRefresh;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _subRefresh = context.read<SubscriptionRefreshNotifier>();
      _subRefresh!.addListener(_onSubscriptionRefresh);
      _loadData();
    });
  }

  void _onSubscriptionRefresh() {
    if (mounted) _loadData();
  }

  @override
  void dispose() {
    _subRefresh?.removeListener(_onSubscriptionRefresh);
    super.dispose();
  }

  Future<void> _loadData() async {
    if (!mounted) return;
    final auth = context.read<AuthService>();
    final token = auth.accessToken;
    if (token == null || token.isEmpty) {
      if (mounted) {
        setState(() => _salon = null);
      }
      return;
    }
    try {
      final cache = context.read<OwnerSessionsCache>();
      final salon = await context.read<SalonCache>().getSalon(token);
      final now = DateTime.now();
      final from = DateTime(now.year, now.month, now.day);
      final to = from.add(const Duration(days: 1));
      List<OwnerTrainingSession> sessions = [];
      String? sessionsLoadError;
      StudioOnboardingChecklist? checklist;
      try {
        final fromUtc = from.toUtc();
        final toUtc = to.toUtc();
        sessions = await cache.getSessions(
          token,
          fromUtc: fromUtc,
          toUtc: toUtc,
        );
        sessions.sort((a, b) => a.startsAt.compareTo(b.startsAt));
      } catch (e) {
        sessions = [];
        if (mounted) {
          sessionsLoadError = loadErrorMessage(
            context.read<LocaleProvider>(),
            e,
          );
        }
      }
      if (salon != null) {
        try {
          checklist =
              await DashboardApiService.getCurrentStudioOnboardingChecklist(
                token,
              );
        } catch (_) {
          checklist = null;
        }
      }
      if (mounted) {
        setState(() {
          _salon = salon;
          _checklist = checklist;
          _todaySessions = sessions;
          _sessionsLoadError = sessionsLoadError;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _checklist = null;
          _todaySessions = [];
          _sessionsLoadError = loadErrorMessage(
            context.read<LocaleProvider>(),
            e,
          );
        });
        if (!isOwnerStudioNotReadyError(e)) {
          showApiError(context, e);
        }
      }
    }
  }

  Future<void> _handleRefresh() async {
    if (!mounted) return;
    context.read<OwnerSessionsCache>().invalidate();
    context.read<SalonCache>().invalidate();
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
      context.read<SalonCache>().invalidate();
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
    if (mounted) await _loadData();
  }

  Future<void> _previewPublicPage() async {
    final salon = _salon;
    if (salon == null) return;
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (_) => PublicStudioDetailScreen(studioId: salon.id),
      ),
    );
  }

  bool _salonHasDescription(
    Salon? salon,
    StudioOnboardingChecklist? checklist,
  ) {
    final fromSalon = salon?.description?.trim();
    if (fromSalon != null && fromSalon.isNotEmpty) return true;
    return checklist?.hasDescription.completed ?? false;
  }

  bool _studioDetailsCompleted(Salon? salon) {
    if (salon == null) return false;
    final name = salon.name?.trim();
    final address = salon.address?.trim();
    return name != null &&
        name.isNotEmpty &&
        address != null &&
        address.isNotEmpty;
  }

  StudioStatus _studioStatus(Salon? salon, StudioOnboardingChecklist? c) {
    if (salon != null) return salon.status;
    return StudioStatus.parse(c?.status);
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
      context.read<SalonCache>().invalidate();
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

  String? _venueLabel() {
    final s = _salon;
    if (s == null) return null;
    final n = s.name?.trim();
    if (n != null && n.isNotEmpty) return n;
    final a = s.address?.trim();
    if (a != null && a.isNotEmpty) return a;
    return null;
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

  String _displayTrainer(OwnerTrainingSession s) {
    final raw = s.trainerName.trim();
    if (raw.isNotEmpty && raw != '—' && raw != '-') return s.trainerName;
    final f = _ownerTrainerFallback()?.trim();
    if (f != null && f.isNotEmpty) return f;
    return '—';
  }

  OwnerTrainingSession? get _featuredSession {
    if (_todaySessions.isEmpty) return null;
    final now = DateTime.now();
    for (final s in _todaySessions) {
      if (s.endsAt.isAfter(now)) return s;
    }
    return _todaySessions.last;
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

  int get _todayWaitlist {
    int total = 0;
    for (final s in _todaySessions) {
      if (s.capacity > 0 && s.enrolledCount > s.capacity) {
        total += (s.enrolledCount - s.capacity);
      }
    }
    return total;
  }

  void _openSessionDetail(OwnerTrainingSession s) {
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
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
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
                child: Container(
                  padding: EdgeInsets.symmetric(
                    horizontal: hasUnread ? 14 : 10,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: hasUnread
                        ? AppColors.primary500
                        : AppColors.backgroundPrimary,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      SvgPicture.asset(
                        'assets/icons/icon-bell.svg',
                        width: 18,
                        height: 22,
                        colorFilter: ColorFilter.mode(
                          hasUnread ? Colors.white : AppColors.textPrimary,
                          BlendMode.srcIn,
                        ),
                      ),
                      if (hasUnread) ...[
                        const SizedBox(width: 6),
                        Text(
                          count > 99 ? '99+' : '$count',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ],
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
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w400,
              height: 1.1,
              color: AppColors.textPrimary,
            ),
          ),
          if (name.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(
              name,
              style: const TextStyle(
                fontSize: 28,
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
        padding: const EdgeInsets.fromLTRB(12, 16, 12, 10),
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
                  fontSize: 30,
                  fontWeight: FontWeight.w500,
                  height: 0.8,
                  color: textColor,
                ),
              ),
            ),
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
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
    final classesBg =
        classesToday > 0 ? _statGreen : _statClassesEmpty;
    final classesText =
        classesToday > 0 ? AppColors.textPrimary : Colors.white;

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

  Widget _featuredCard(LocaleProvider loc, OwnerTrainingSession s) {
    final cap = s.capacity;
    final enrolled = s.enrolledCount;
    final progress = cap > 0 ? (enrolled / cap).clamp(0.0, 1.0) : 0.0;
    final percent = (progress * 100).round();
    final fillLabel = cap > 0 ? '$enrolled / $cap' : '$enrolled';
    final trainer = _displayTrainer(s);

    const double _ringsBox = 200;
    const double _editHalf = 15;
    // Stack coords: edit button center ≈ (w - _editHalf, _editHalf) in top row.
    const double _ringsRight = _editHalf - _ringsBox / 2;
    const double _ringsTop = _editHalf - _ringsBox / 2;

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
                    right: _ringsRight,
                    top: _ringsTop,
                    width: _ringsBox,
                    height: _ringsBox,
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
                            'TODAY',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 1.2,
                              color: Colors.white.withValues(alpha: 0.95),
                            ),
                          ),
                          const Spacer(),
                          if (s.sessionId.isNotEmpty)
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
                                child: const Icon(
                                  Icons.edit_outlined,
                                  size: 16,
                                  color: AppColors.primary500,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        s.trainingName,
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          height: 1,
                          color: Colors.white,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '${_formatTimeRange(s)} · With $trainer',
                        style: TextStyle(
                          fontSize: 14,
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
                                    style: const TextStyle(
                                      fontSize: 15,
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
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.white,
                                    height: 1,
                                    letterSpacing: -0.8,
                                  ),
                                ),
                                Text(
                                  loc.t('dashboard.bookedLabel'),
                                  style: TextStyle(
                                    fontSize: 14,
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
                                    loc.t('dashboard.showMore'),
                                    style: const TextStyle(
                                      fontSize: 14,
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
    final salon = _salon;
    final c = _checklist;
    final status = _studioStatus(salon, c);

    if (!status.showsOnboarding) return const SizedBox.shrink();

    final studioDetails = _studioDetailsCompleted(salon);
    final hasTraining = c?.hasTraining.completed ?? false;
    final hasPhoto = c?.hasPhoto.completed ?? false;
    final hasLogo = c?.hasLogo.completed ?? false;
    final contacts = c?.contactsConfigured.completed ?? false;
    final hasDescription = _salonHasDescription(salon, c);
    final showOptionalPhase = status == StudioStatus.ready;

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
        hasLogo: hasLogo,
        contactsConfigured: contacts,
        hasDescription: hasDescription,
        canPublish: c?.canPublish ?? false,
        isStudioActive: status.isActive,
        isPublishing: _isPublishing,
        showOptionalPhase: showOptionalPhase,
        showPreviewButton: salon != null,
        onStudioDetailsTap: _openStudioDetails,
        onCreateTrainingTap: _openTrainingSetup,
        onAddPhotoTap: _openStudioProfileSettings,
        onAddLogoTap: _openStudioProfileSettings,
        onContactsTap: () => _openStudioProfileSettings(
          focusTarget: StudioProfileFocusTarget.contacts,
        ),
        onAddDescriptionTap: () => _openStudioProfileSettings(
          focusTarget: StudioProfileFocusTarget.description,
        ),
        onPreviewPublicPageTap: _previewPublicPage,
        onPublishTap: _publishStudio,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final loc = context.watch<LocaleProvider>();
    final authUser = context.watch<AuthService>().user;
    final featured = _featuredSession;

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
                _header(loc),
                _greeting(loc, authUser),
                _statsRow(loc),
                if (featured != null) _featuredCard(loc, featured),
                _checklistBlock(),
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
                    onSeeAll: _salon == null
                        ? null
                        : () => context
                              .findAncestorStateOfType<MainShellState>()
                              ?.openScheduleTabForToday(),
                    onSessionTap: _openSessionDetail,
                    ownerTrainerFallback: _ownerTrainerFallback(),
                    studioLocations: _studioLocations(context),
                  ),
                const SizedBox(height: 16),
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
    const radii = <double>[10, 30, 50, 70, 90];
    for (final r in radii) {
      canvas.drawCircle(center, r, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _RingsPainter old) => old.color != color;
}
