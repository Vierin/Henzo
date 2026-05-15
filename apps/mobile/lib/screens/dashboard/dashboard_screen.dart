import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import '../../utils/show_api_error.dart';
import '../../models/salon.dart';
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
import '../../widgets/dashboard/dashboard_setup_card.dart';
import '../../widgets/dashboard/owner_daily_schedule_block.dart';
import '../../widgets/training/owner_session_edit_scope_dialog.dart';
import '../owner_training_session_detail_screen.dart';
import '../main_shell.dart';
import '../settings_screen.dart';
import '../../widgets/settings/owner_booking_period_sheet.dart';
import '../notifications_screen.dart';
import '../salon_setup_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  // Custom palette matching the design mock.
  static const _statGreen = Color(0xFFBDE03A); // lime-yellow stat card
  static const _statPink = Color(0xFFFAD0C5); // salmon stat card

  Salon? _salon;
  StudioOnboardingChecklist? _checklist;
  List<OwnerTrainingSession> _todaySessions = [];
  bool _isLoading = false;
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
    setState(() => _isLoading = true);
    final auth = context.read<AuthService>();
    final token = auth.accessToken;
    if (token == null || token.isEmpty) {
      if (mounted) {
        setState(() {
          _salon = null;
          _isLoading = false;
        });
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
      } catch (_) {
        sessions = [];
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
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _checklist = null;
          _todaySessions = [];
          _isLoading = false;
        });
        showApiError(context, e);
      }
    }
  }

  Future<void> _handleRefresh() async {
    if (!mounted) return;
    context.read<OwnerSessionsCache>().invalidate();
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

  Future<void> _openStudioProfileSettings() async {
    await Navigator.push<void>(
      context,
      MaterialPageRoute(builder: (_) => const SettingsScreen()),
    );
    if (mounted) await _loadData();
  }

  Future<void> _openOnlineBookingSettings() async {
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) return;
    final salon = await context.read<SalonCache>().getSalon(token);
    if (!mounted || salon == null) return;
    final changed = await showOwnerBookingPeriodSheet(context, salon: salon);
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

  String? _venueLabel() {
    final s = _salon;
    if (s == null) return null;
    final n = s.name?.trim();
    if (n != null && n.isNotEmpty) return n;
    final a = s.address?.trim();
    if (a != null && a.isNotEmpty) return a;
    return null;
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
        builder: (_) => OwnerTrainingSessionDetailScreen(
          session: s,
          trainingColor: parseHexColor(s.trainingDisplayColorHex),
          venueName: _venueLabel(),
          trainerFallbackName: _ownerTrainerFallback(),
          onParticipantsChanged: () {
            context.read<OwnerSessionsCache>().invalidate();
            _loadData();
          },
          onEditSession: s.sessionId.isNotEmpty
              ? () async {
                  final scope =
                      await showOwnerSessionEditScopeDialog(context);
                  if (!mounted || scope == null) return;
                  final args = {
                    ...s.toRouteArgs(),
                    if (scope == OwnerSessionEditScope.thisAndFollowing)
                      'applyToFollowing': true,
                  };
                  final changed = await Navigator.of(context).pushNamed<bool>(
                    '/owner/session/edit',
                    arguments: args,
                  );
                  if (changed == true) {
                    if (!mounted) return;
                    context.read<OwnerSessionsCache>().invalidate();
                    await _loadData();
                  }
                }
              : null,
        ),
      ),
    );
  }

  Future<void> _openEditCurrentSession(OwnerTrainingSession s) async {
    if (s.sessionId.isEmpty) return;
    final scope = await showOwnerSessionEditScopeDialog(context);
    if (!mounted || scope == null) return;
    final args = {
      ...s.toRouteArgs(),
      if (scope == OwnerSessionEditScope.thisAndFollowing)
        'applyToFollowing': true,
    };
    final changed = await Navigator.of(
      context,
    ).pushNamed<bool>('/owner/session/edit', arguments: args);
    if (changed == true && mounted) {
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

  Widget _greeting(UserModel? user) {
    final name = _greetingUserLine(user);
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Hello,',
            style: TextStyle(
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
          border: bordered
              ? Border.all(color: AppColors.borderPrimary, width: 1)
              : null,
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

  Widget _statsRow() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(10, 0, 10, 20),
      child: Row(
        children: [
          Expanded(
            child: _statCard(
              value: '${_todaySessions.length}',
              label: 'Classes today',
              background: _statGreen,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _statCard(
              value: '$_todayBookings',
              label: 'Bookings',
              background: _statPink,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _statCard(
              value: '$_todayWaitlist',
              label: 'Waitlist',
              background: AppColors.backgroundPrimary,
              bordered: true,
            ),
          ),
        ],
      ),
    );
  }

  Widget _featuredCard(OwnerTrainingSession s) {
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
                                  'booked',
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
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    'Show more',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                  SizedBox(width: 2),
                                  Icon(
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
    if (_checklist == null) return const SizedBox.shrink();
    final c = _checklist!;
    final allDone =
        c.hasTraining.completed &&
        c.hasPhoto.completed &&
        c.bookingWindowConfigured.completed &&
        c.contactsConfigured.completed;
    if (allDone) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        kScreenPaddingHorizontal,
        4,
        kScreenPaddingHorizontal,
        16,
      ),
      child: OwnerChecklistCard(
        hasTraining: c.hasTraining.completed,
        hasPhoto: c.hasPhoto.completed,
        hasLogo: c.hasLogo.completed,
        bookingWindowConfigured: c.bookingWindowConfigured.completed,
        contactsConfigured: c.contactsConfigured.completed,
        canPublish: c.canPublish,
        isStudioActive: c.status.toUpperCase() == 'ACTIVE',
        isPublishing: _isPublishing,
        missingRequiredSteps: c.missingRequiredSteps
            .map(_humanizeChecklistStep)
            .toList(),
        onCreateTrainingTap: _openTrainingSetup,
        onAddPhotoTap: _openStudioProfileSettings,
        onAddLogoTap: _openStudioProfileSettings,
        onBookingWindowTap: _openOnlineBookingSettings,
        onContactsTap: _openStudioProfileSettings,
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
                _greeting(authUser),
                if (_isLoading && _salon == null)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 40),
                    child: Center(
                      child: CircularProgressIndicator(
                        color: AppColors.primary500,
                      ),
                    ),
                  )
                else if (_salon == null)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: DashboardSetupCard(
                      onSetupTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => SalonSetupScreen(
                            onSaved: () {
                              Navigator.pop(context);
                              context.read<OwnerSessionsCache>().invalidate();
                              _loadData();
                            },
                          ),
                        ),
                      ),
                    ),
                  )
                else ...[
                  _statsRow(),
                  if (featured != null) _featuredCard(featured),
                  OwnerDailyScheduleBlock(
                    sessions: _todaySessions,
                    emptyMessage: 'No trainings scheduled for today',
                    onSeeAll: () => context
                        .findAncestorStateOfType<MainShellState>()
                        ?.openScheduleTabForToday(),
                    onSessionTap: _openSessionDetail,
                    ownerTrainerFallback: _ownerTrainerFallback(),
                  ),
                  _checklistBlock(),
                ],
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
