import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import '../services/auth_service.dart';
import '../services/cache/owner_sessions_cache.dart';
import '../services/dashboard_api_service.dart';
import '../utils/color_hex.dart';
import '../utils/show_api_error.dart';
import '../utils/synthetic_guest.dart';
import '../widgets/clients/add_owner_client_sheet.dart';
import '../widgets/common/henzo_header_back_button.dart';
import '../navigation/owner_session_navigation.dart';
import '../widgets/training/owner_session_cancel_scope_dialog.dart';

/// Full-screen session detail for studio owners (replaces bottom sheet modal).
class OwnerTrainingSessionDetailScreen extends StatefulWidget {
  const OwnerTrainingSessionDetailScreen({
    super.key,
    required this.session,
    this.statusBadge,
    this.trainerFallbackName,
    this.trainingColor,
    this.venueName,
    this.onEditSession,
    @Deprecated('Removed from UI; ignored.') this.onEditService,
    this.onParticipantsChanged,
  });

  final OwnerTrainingSession session;
  final Widget? statusBadge;
  final String? trainerFallbackName;
  final Color? trainingColor;

  /// Studio name or address (from [SalonCache]); shown next to the pin icon.
  final String? venueName;
  final VoidCallback? onEditSession;
  @Deprecated('Removed from UI; ignored.')
  final VoidCallback? onEditService;
  final VoidCallback? onParticipantsChanged;

  @override
  State<OwnerTrainingSessionDetailScreen> createState() =>
      _OwnerTrainingSessionDetailScreenState();
}

class _OwnerTrainingSessionDetailScreenState
    extends State<OwnerTrainingSessionDetailScreen> {
  late Future<List<OwnerSessionEnrollment>> _enrollmentsFuture;
  late AuthService _authService;
  late OwnerTrainingSession _session;

  /// Optimistic overrides before PATCH (enrollmentId → ACTIVE | NO_SHOW).
  final Map<String, String> _pendingStatusByEnrollmentId = {};
  Timer? _attendanceDebounceTimer;

  static const Color _attendanceOnTrack = Color(0xFFB7D356);
  static const Duration _kAttendanceFlushDebounce = Duration(minutes: 1);

  Color get _accent =>
      widget.trainingColor ??
      parseHexColor(_session.trainingDisplayColorHex) ??
      AppColors.primary500;

  @override
  void initState() {
    super.initState();
    _authService = context.read<AuthService>();
    _session = widget.session;
    _enrollmentsFuture = _loadEnrollmentsAndSyncCounts();
  }

  Future<List<OwnerSessionEnrollment>> _loadEnrollmentsAndSyncCounts() async {
    final list = await _loadEnrollments();
    if (mounted) {
      setState(() {
        _session = _session.copyWith(
          enrolledCount: _activeEnrollmentCount(list),
        );
      });
    }
    return list;
  }

  static int _activeEnrollmentCount(List<OwnerSessionEnrollment> list) =>
      list.where((e) => e.status.toUpperCase() != 'CANCELLED').length;

  @override
  void dispose() {
    _attendanceDebounceTimer?.cancel();
    final pending = Map<String, String>.from(_pendingStatusByEnrollmentId);
    if (pending.isNotEmpty) {
      unawaited(_flushPendingMap(pending));
    }
    super.dispose();
  }

  void _scheduleAttendanceFlush() {
    _attendanceDebounceTimer?.cancel();
    if (_pendingStatusByEnrollmentId.isEmpty) return;
    _attendanceDebounceTimer = Timer(_kAttendanceFlushDebounce, () {
      if (!mounted) return;
      unawaited(_flushPendingMap(Map.from(_pendingStatusByEnrollmentId)));
    });
  }

  String _effectiveEnrollmentStatus(OwnerSessionEnrollment e) =>
      _pendingStatusByEnrollmentId[e.enrollmentId] ?? e.status;

  Future<void> _flushPendingMap(Map<String, String> pending) async {
    if (pending.isEmpty) return;
    final token = _authService.accessToken;
    if (token == null || token.isEmpty) return;
    try {
      for (final entry in pending.entries) {
        await DashboardApiService.updateOwnerEnrollmentStatus(
          token,
          entry.key,
          entry.value,
        );
      }
      if (mounted) {
        setState(() {
          for (final k in pending.keys) {
            _pendingStatusByEnrollmentId.remove(k);
          }
        });
        widget.onParticipantsChanged?.call();
        _refreshEnrollmentsOnly();
      }
    } catch (err) {
      if (mounted) {
        setState(() {
          _pendingStatusByEnrollmentId.clear();
        });
        showApiError(context, err);
        _reloadEnrollments();
      }
    }
  }

  Future<List<OwnerSessionEnrollment>> _loadEnrollments() async {
    final token = _authService.accessToken;
    if (token == null || token.isEmpty) return [];
    final sessionId = _session.sessionId;
    if (sessionId.isEmpty) return [];
    return DashboardApiService.getOwnerSessionEnrollments(token, sessionId);
  }

  Future<void> _syncEnrollmentsFromServer({bool notifyParent = false}) async {
    final list = await _loadEnrollmentsAndSyncCounts();
    if (!mounted) return;
    setState(() {
      _session = _session.copyWith(
        enrolledCount: _activeEnrollmentCount(list),
      );
      _enrollmentsFuture = Future.value(list);
    });
    if (notifyParent) {
      context.read<OwnerSessionsCache>().invalidate();
      widget.onParticipantsChanged?.call();
    }
  }

  void _refreshEnrollmentsOnly() {
    unawaited(_syncEnrollmentsFromServer());
  }

  void _reloadEnrollments() {
    unawaited(_syncEnrollmentsFromServer(notifyParent: true));
  }

  Color _onAccentContent(Color accent) =>
      ThemeData.estimateBrightnessForColor(accent) == Brightness.dark
      ? Colors.white
      : AppColors.textPrimary;

  Future<void> _shareSession() async {
    final locale = context.read<LocaleProvider>();
    final s = _session;
    final startsLocal = s.startsAt.toLocal();
    final endsLocal = s.endsAt.toLocal();
    final dateFmt = DateFormat('EEEE, d MMM', locale.localeCode);
    final timeFmt = DateFormat('HH:mm', locale.localeCode);
    final buf = StringBuffer()
      ..writeln(s.trainingName)
      ..writeln(dateFmt.format(startsLocal))
      ..writeln(
        '${timeFmt.format(startsLocal)} – ${timeFmt.format(endsLocal)}',
      );
    final v = widget.venueName?.trim();
    if (v != null && v.isNotEmpty) buf.writeln(v);
    await Share.share(buf.toString().trim());
  }

  void _onAttendanceToggle(OwnerSessionEnrollment e, bool attended) {
    final session = _session;
    final now = DateTime.now();
    final sessionEnded = !session.endsAt.isAfter(now);
    if (!attended && !sessionEnded) {
      final msg = context.read<LocaleProvider>().t(
        'ownerSession.noShowOnlyAfterSession',
      );
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(content: Text(msg), backgroundColor: Colors.red.shade700),
      );
      return;
    }
    final next = attended ? 'ACTIVE' : 'NO_SHOW';
    final baseline = e.status;
    if (next == baseline && !_pendingStatusByEnrollmentId.containsKey(
          e.enrollmentId,
        )) {
      return;
    }

    setState(() {
      if (next == baseline) {
        _pendingStatusByEnrollmentId.remove(e.enrollmentId);
      } else {
        _pendingStatusByEnrollmentId[e.enrollmentId] = next;
      }
    });

    if (_pendingStatusByEnrollmentId.isEmpty) {
      _attendanceDebounceTimer?.cancel();
    } else {
      _scheduleAttendanceFlush();
    }
  }

  Future<void> _handleEditSession() async {
    final updated = await openOwnerEditTrainingSessionFlow(context, _session);
    if (!mounted || updated == null) return;
    setState(() => _session = updated);
    context.read<OwnerSessionsCache>().invalidate();
    widget.onParticipantsChanged?.call();
  }

  Future<void> _confirmCancelSession() async {
    final tr = context.read<LocaleProvider>().t;
    final session = _session;
    if (session.sessionId.isEmpty) return;
    final st = session.status.toUpperCase();
    if (st == 'CANCELLED') return;
    if (!session.endsAt.toLocal().isAfter(DateTime.now())) return;

    final scope = await showOwnerSessionCancelScopeDialog(context);
    if (!mounted || scope == null) return;

    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) return;

    try {
      final body = <String, dynamic>{'status': 'CANCELLED'};
      if (scope == OwnerSessionCancelScope.thisAndFollowing) {
        body['applyToFollowing'] = true;
      }
      await DashboardApiService.patchOwnerTrainingSession(
        token,
        session.sessionId,
        body,
      );
      widget.onParticipantsChanged?.call();
      if (!mounted) return;
      final msg = scope == OwnerSessionCancelScope.thisAndFollowing
          ? tr('ownerSession.sessionCancelledBulk')
          : tr('ownerSession.sessionCancelled');
      showSuccess(context, msg);
      Navigator.of(context).pop();
    } catch (e) {
      if (mounted) showApiError(context, e);
    }
  }

  Future<void> _showAddParticipantSheet() async {
    await showAddOwnerClientSheet(
      context,
      mode: AddOwnerClientMode.enrollInSession,
      sessionId: _session.sessionId,
      onSuccess: _reloadEnrollments,
    );
  }

  static Color _avatarTint(int index) {
    const tints = [
      Color(0xFFFFE4EC),
      Color(0xFFE0F2FE),
      Color(0xFFFFF3E0),
      Color(0xFFE8F5E9),
      AppColors.primary50,
    ];
    return tints[index % tints.length];
  }

  static Color _avatarInk(int index) {
    const inks = [
      Color(0xFFC2185B),
      Color(0xFF0277BD),
      Color(0xFFEF6C00),
      Color(0xFF2E7D32),
      AppColors.primary700,
    ];
    return inks[index % inks.length];
  }

  String _initials(String name) {
    final parts = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((e) => e.isNotEmpty)
        .take(2)
        .toList();
    if (parts.isEmpty) return '?';
    return parts.map((p) => p[0].toUpperCase()).join();
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final tr = locale.t;
    final session = _session;
    final startsLocal = session.startsAt.toLocal();
    final endsLocal = session.endsAt.toLocal();
    final dateFmt = DateFormat('EEEE, MMM d', locale.localeCode);
    final matLoc = MaterialLocalizations.of(context);
    final startTod = TimeOfDay.fromDateTime(startsLocal);
    final endTod = TimeOfDay.fromDateTime(endsLocal);
    final timeRangeLabel =
        '${matLoc.formatTimeOfDay(startTod, alwaysUse24HourFormat: true)} – '
        '${matLoc.formatTimeOfDay(endTod, alwaysUse24HourFormat: true)}';
    final categoryLabel = session.categoryLabelForLocale(locale.localeCode);
    final enrolled = session.enrolledCount;
    final cap = session.capacity;
    final fillRatio = cap > 0 ? (enrolled / cap).clamp(0.0, 1.0) : 0.0;
    final pct = cap > 0 ? (fillRatio * 100).round() : 0;
    final statusUpper = session.status.toUpperCase();
    final now = DateTime.now();
    final sessionEnded = !session.endsAt.toLocal().isAfter(now);
    final canCancelSession = session.sessionId.isNotEmpty &&
        statusUpper != 'CANCELLED' &&
        sessionEnded == false;
    final attendanceTogglesVisible = !session.startsAt
        .subtract(const Duration(hours: 1))
        .isAfter(now);
    final spotsLeft = cap > 0 ? (cap - enrolled).clamp(0, cap) : 0;
    const waitlistCount = 0;
    final venueLine = widget.venueName?.trim();
    final accentContent = _onAccentContent(_accent);

    Widget statusBadgeForParticipant(String status) {
      late Color bg;
      late Color fg;
      late String label;
      switch (status) {
        case 'ACTIVE':
          bg = AppColors.primary100;
          fg = AppColors.primary700;
          label = tr('ownerSession.participantStatusActive');
          break;
        case 'NO_SHOW':
          bg = AppColors.error100;
          fg = AppColors.error700;
          label = tr('ownerSession.participantStatusNoShow');
          break;
        case 'CANCELLED':
          bg = AppColors.neutral100;
          fg = AppColors.textSecondary;
          label = tr('ownerSession.participantStatusCancelled');
          break;
        default:
          bg = AppColors.neutral100;
          fg = AppColors.textSecondary;
          label = status;
      }
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: fg,
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppColors.primary500,
          onRefresh: () async => _refreshEnrollmentsOnly(),
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(8, 4, 8, 0),
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final w = constraints.maxWidth;
                      final titlePad = (w * 0.22).clamp(56.0, 120.0);
                      return SizedBox(
                        height: 48,
                        child: Stack(
                          alignment: Alignment.center,
                          clipBehavior: Clip.none,
                          children: [
                            Positioned.fill(
                              child: Center(
                                child: Padding(
                                  padding: EdgeInsets.symmetric(
                                    horizontal: titlePad,
                                  ),
                                  child: Text(
                                    tr('ownerSession.detailTitle'),
                                    textAlign: TextAlign.center,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.textPrimary,
                                      height: 1,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                HenzoHeaderBackButton(
                                  onPressed: () =>
                                      Navigator.of(context).pop(),
                                ),
                                FilledButton.icon(
                                  onPressed: _shareSession,
                                  icon: SvgPicture.asset(
                                    'assets/icons/icon-share.svg',
                                    width: 16,
                                    height: 12,
                                    fit: BoxFit.contain,
                                    excludeFromSemantics: true,
                                    colorFilter: const ColorFilter.mode(
                                      AppColors.textInverse,
                                      BlendMode.srcIn,
                                    ),
                                  ),
                                  label: Text(locale.t('ownerSession.share')),
                                  style: FilledButton.styleFrom(
                                    backgroundColor: AppColors.primary500,
                                    foregroundColor: AppColors.textInverse,
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 8,
                                    ),
                                    tapTargetSize:
                                        MaterialTapTargetSize.shrinkWrap,
                                    visualDensity: VisualDensity.compact,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(999),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        if (categoryLabel != null &&
                            categoryLabel.trim().isNotEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: _accent,
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              categoryLabel.trim().toUpperCase(),
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                letterSpacing: -0.3,
                                color: accentContent,
                              ),
                            ),
                          ),
                        if (categoryLabel != null &&
                            categoryLabel.trim().isNotEmpty)
                          const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            dateFmt.format(startsLocal).toUpperCase(),
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w400,
                              color: AppColors.textPrimary,
                              letterSpacing: -0.3,
                            ),
                          ),
                        ),
                        if (widget.statusBadge != null) widget.statusBadge!,
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      session.trainingName,
                      style: const TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                        height: 1.15,
                      ),
                    ),
                    const SizedBox(height: 18),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: _accent,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            Icons.schedule_rounded,
                            size: 18,
                            color: accentContent,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Flexible(
                          child: Text(
                            timeRangeLabel,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w400,
                              color: AppColors.textPrimary,
                              letterSpacing: -0.3,
                            ),
                          ),
                        ),
                        if (venueLine != null && venueLine.isNotEmpty) ...[
                          const SizedBox(width: 14),
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: _accent,
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              Icons.place_outlined,
                              size: 18,
                              color: accentContent,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Flexible(
                            child: Text(
                              venueLine,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w400,
                                letterSpacing: -0.3,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.fromLTRB(15, 11, 15, 11),
                      decoration: BoxDecoration(
                        color: AppColors.backgroundPrimary,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: IntrinsicHeight(
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            SizedBox(
                              width: 64,
                              height: 64,
                              child: Stack(
                                alignment: Alignment.center,
                                children: [
                                  SizedBox.expand(
                                    child: CircularProgressIndicator(
                                      value: fillRatio,
                                      strokeWidth: 6,
                                      backgroundColor: _accent.withValues(
                                        alpha: 0.22,
                                      ),
                                      color: _accent,
                                      strokeCap: StrokeCap.round,
                                    ),
                                  ),
                                  Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        '$pct%',
                                        style: const TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w800,
                                          color: AppColors.textPrimary,
                                          letterSpacing: -0.5,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    tr('ownerSession.capacityLabel'),
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w500,
                                      letterSpacing: -0.3,
                                      color: AppColors.textPrimary.withValues(
                                        alpha: 0.4,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    tr('ownerSession.bookedSummary')
                                        .replaceAll('{current}', '$enrolled')
                                        .replaceAll('{max}', '$cap'),
                                    style: const TextStyle(
                                      fontSize: 15,
                                      letterSpacing: -0.3,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    tr('ownerSession.capacityWaitlistLine')
                                        .replaceAll('{spots}', '$spotsLeft')
                                        .replaceAll(
                                          '{waitlist}',
                                          '$waitlistCount',
                                        ),
                                    style: TextStyle(
                                      fontSize: 11,
                                      letterSpacing: -0.3,
                                      fontWeight: FontWeight.w500,
                                      color: AppColors.textPrimary.withValues(
                                        alpha: 0.4,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 10),
                            FilledButton.icon(
                              onPressed: session.sessionId.isEmpty
                                  ? null
                                  : _showAddParticipantSheet,
                              style: FilledButton.styleFrom(
                                backgroundColor: AppColors.primary500,
                                foregroundColor: AppColors.textInverse,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 10,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(18),
                                ),
                              ),
                              icon: const Icon(Icons.add, size: 20),
                              label: Text(tr('ownerSession.add')),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: FilledButton(
                            onPressed: _session.sessionId.isNotEmpty
                                ? _handleEditSession
                                : null,
                            style: FilledButton.styleFrom(
                              backgroundColor: AppColors.primary500,
                              foregroundColor: AppColors.textInverse,
                              minimumSize: const Size.fromHeight(50),
                              textStyle: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                                letterSpacing: -0.3,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: Text(tr('common.edit')),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: FilledButton(
                            onPressed: canCancelSession
                                ? _confirmCancelSession
                                : null,
                            style: FilledButton.styleFrom(
                              backgroundColor: AppColors.backgroundPrimary,
                              foregroundColor: AppColors.textSecondary,
                              elevation: 0,
                              shadowColor: Colors.transparent,
                              disabledBackgroundColor:
                                  AppColors.backgroundPrimary,
                              disabledForegroundColor: AppColors.textTertiary,
                              minimumSize: const Size.fromHeight(50),
                              textStyle: const TextStyle(
                                fontSize: 14,
                                color: AppColors.textPrimary,
                                fontWeight: FontWeight.w500,
                                letterSpacing: -0.3,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: Text(tr('ownerSession.quickActionCancel')),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Expanded(
                          child: Text(
                            tr(
                              'ownerSession.attendeesHeading',
                            ).replaceAll('{count}', '${session.enrolledCount}'),
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.6,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ),
                        if (attendanceTogglesVisible)
                          Text(
                            tr('ownerSession.attendanceColumnLabel'),
                            textAlign: TextAlign.end,
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.35,
                              color: AppColors.textSecondary,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    FutureBuilder<List<OwnerSessionEnrollment>>(
                      future: _enrollmentsFuture,
                      builder: (context, snap) {
                        if (snap.connectionState == ConnectionState.waiting) {
                          return const Padding(
                            padding: EdgeInsets.all(24),
                            child: Center(
                              child: CircularProgressIndicator(
                                color: AppColors.primary500,
                              ),
                            ),
                          );
                        }
                        if (snap.hasError) {
                          return Padding(
                            padding: const EdgeInsets.all(12),
                            child: Text(
                              tr('ownerSession.participantsLoadError'),
                              style: TextStyle(color: AppColors.error500),
                            ),
                          );
                        }
                        final list = snap.data ?? const [];
                        if (list.isEmpty) {
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Text(
                              tr('ownerSession.noParticipants'),
                              style: const TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 14,
                              ),
                            ),
                          );
                        }
                        return Column(
                          children: List.generate(list.length, (i) {
                            final e = list[i];
                            final anonymous = isSyntheticGuestEmail(e.email) ||
                                (e.name?.trim().toLowerCase() == 'walk-in');
                            final displayName = anonymous
                                ? tr('ownerClient.anonymousRosterTitle')
                                : (e.name ??
                                        e.email ??
                                        e.phone ??
                                        tr('booking.client'))
                                    .trim();
                            final subtitle = anonymous
                                ? ''
                                : (e.phone?.isNotEmpty == true
                                    ? e.phone!
                                    : (e.email ?? ''));
                            final effectiveStatus =
                                _effectiveEnrollmentStatus(e);
                            final attended = effectiveStatus == 'ACTIVE';
                            final cancelled = e.status == 'CANCELLED';
                            final canToggle = !cancelled && sessionEnded;
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: Container(
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: AppColors.backgroundPrimary,
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 44,
                                      height: 44,
                                      alignment: Alignment.center,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: _avatarTint(i),
                                      ),
                                      child: Text(
                                        _initials(displayName),
                                        style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w700,
                                          color: _avatarInk(i),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            displayName,
                                            style: const TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.w700,
                                              color: AppColors.textPrimary,
                                            ),
                                          ),
                                          if (subtitle.isNotEmpty)
                                            Text(
                                              subtitle,
                                              style: const TextStyle(
                                                fontSize: 14,
                                                fontWeight: FontWeight.w500,
                                                color: AppColors.textSecondary,
                                              ),
                                            ),
                                        ],
                                      ),
                                    ),
                                    if (cancelled)
                                      statusBadgeForParticipant(e.status)
                                    else if (!attendanceTogglesVisible)
                                      statusBadgeForParticipant(
                                        effectiveStatus,
                                      )
                                    else
                                      Theme(
                                        data: Theme.of(context).copyWith(
                                          switchTheme: SwitchThemeData(
                                            thumbColor:
                                                const WidgetStatePropertyAll<
                                                  Color
                                                >(Colors.white),
                                            trackColor:
                                                WidgetStateProperty.resolveWith(
                                                  (states) {
                                                    if (states.contains(
                                                      WidgetState.selected,
                                                    )) {
                                                      return _attendanceOnTrack;
                                                    }
                                                    return AppColors.primary200;
                                                  },
                                                ),
                                            trackOutlineColor:
                                                const WidgetStatePropertyAll<
                                                  Color
                                                >(Colors.transparent),
                                          ),
                                        ),
                                        child: Transform.scale(
                                          scale: 0.92,
                                          child: Switch(
                                            value: attended,
                                            onChanged: canToggle
                                                ? (v) => _onAttendanceToggle(
                                                      e,
                                                      v,
                                                    )
                                                : null,
                                            inactiveThumbColor:
                                                AppColors.primary500,
                                            inactiveTrackColor: AppColors
                                                .primary500
                                                .withValues(alpha: 0.35),
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            );
                          }),
                        );
                      },
                    ),
                  ]),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
