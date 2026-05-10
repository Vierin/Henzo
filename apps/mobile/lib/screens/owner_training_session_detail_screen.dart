import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import '../services/auth_service.dart';
import '../services/dashboard_api_service.dart';
import '../utils/color_hex.dart';
import '../utils/show_api_error.dart';

int _sessionDurationMinutes(OwnerTrainingSession session) {
  final d = session.endsAt.difference(session.startsAt);
  return d.inMinutes.clamp(0, 24 * 60);
}

String _displayTrainerName(OwnerTrainingSession session, String? fallbackName) {
  final raw = session.trainerName.trim();
  if (raw.isNotEmpty && raw != '—' && raw != '-') return session.trainerName;
  final f = fallbackName?.trim();
  if (f != null && f.isNotEmpty) return f;
  return '—';
}

/// Full-screen session detail for studio owners (replaces bottom sheet modal).
class OwnerTrainingSessionDetailScreen extends StatefulWidget {
  const OwnerTrainingSessionDetailScreen({
    super.key,
    required this.session,
    this.statusBadge,
    this.trainerFallbackName,
    this.trainingColor,
    this.onEditSession,
    this.onEditService,
    this.onParticipantsChanged,
  });

  final OwnerTrainingSession session;
  final Widget? statusBadge;
  final String? trainerFallbackName;
  final Color? trainingColor;
  final VoidCallback? onEditSession;
  final VoidCallback? onEditService;
  final VoidCallback? onParticipantsChanged;

  @override
  State<OwnerTrainingSessionDetailScreen> createState() =>
      _OwnerTrainingSessionDetailScreenState();
}

class _OwnerTrainingSessionDetailScreenState
    extends State<OwnerTrainingSessionDetailScreen> {
  late Future<List<OwnerSessionEnrollment>> _enrollmentsFuture;

  Color get _accent =>
      widget.trainingColor ??
      parseHexColor(widget.session.trainingDisplayColorHex) ??
      AppColors.primary500;

  @override
  void initState() {
    super.initState();
    _enrollmentsFuture = _loadEnrollments();
  }

  Future<List<OwnerSessionEnrollment>> _loadEnrollments() async {
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) return [];
    return DashboardApiService.getOwnerSessionEnrollments(
      token,
      widget.session.sessionId,
    );
  }

  void _refreshEnrollmentsOnly() {
    setState(() => _enrollmentsFuture = _loadEnrollments());
  }

  void _reloadEnrollments() {
    _refreshEnrollmentsOnly();
    widget.onParticipantsChanged?.call();
  }

  Future<void> _confirmCancelSession() async {
    final tr = context.read<LocaleProvider>().t;
    final session = widget.session;
    if (session.sessionId.isEmpty) return;
    final st = session.status.toUpperCase();
    if (st == 'CANCELLED' || st == 'COMPLETED') return;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(tr('ownerSession.cancelSessionTitle')),
        content: Text(tr('ownerSession.cancelSessionMessage')),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(tr('common.cancel')),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary500,
            ),
            child: Text(tr('ownerSession.cancelSessionConfirm')),
          ),
        ],
      ),
    );
    if (confirm != true || !mounted) return;

    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) return;

    try {
      await DashboardApiService.updateOwnerTrainingSessionStatus(
        token,
        session.sessionId,
        'CANCELLED',
      );
      widget.onParticipantsChanged?.call();
      showSuccess(context, tr('ownerSession.sessionCancelled'));
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) showApiError(context, e);
    }
  }

  Future<void> _showAddParticipantSheet() async {
    final tr = context.read<LocaleProvider>().t;
    final session = widget.session;
    final nameController = TextEditingController();
    final emailController = TextEditingController();
    final phoneController = TextEditingController();
    bool isSaving = false;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => StatefulBuilder(
        builder: (context, setSheetState) => SafeArea(
          child: Padding(
            padding: EdgeInsets.fromLTRB(
              16,
              8,
              16,
              16 + MediaQuery.of(sheetCtx).viewInsets.bottom,
            ),
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.backgroundPrimary,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.borderPrimary),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x14000000),
                    blurRadius: 16,
                    offset: Offset(0, 6),
                  ),
                ],
              ),
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      tr('ownerSession.addParticipant'),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: nameController,
                      enabled: !isSaving,
                      decoration: InputDecoration(
                        labelText: tr('ownerSession.name'),
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: emailController,
                      enabled: !isSaving,
                      keyboardType: TextInputType.emailAddress,
                      decoration: InputDecoration(
                        labelText: tr('ownerSession.email'),
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: phoneController,
                      enabled: !isSaving,
                      keyboardType: TextInputType.phone,
                      decoration: InputDecoration(
                        labelText: tr('ownerSession.phone'),
                      ),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: isSaving
                                ? null
                                : () => Navigator.of(sheetCtx).pop(),
                            child: Text(tr('common.cancel')),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: FilledButton(
                            onPressed: isSaving
                                ? null
                                : () async {
                                    final token = context
                                        .read<AuthService>()
                                        .accessToken;
                                    if (token == null || token.isEmpty) return;
                                    final messenger = ScaffoldMessenger.maybeOf(
                                      context,
                                    );
                                    setSheetState(() => isSaving = true);
                                    try {
                                      await DashboardApiService.addOwnerSessionEnrollment(
                                        token,
                                        session.sessionId,
                                        name: nameController.text.trim(),
                                        email: emailController.text.trim(),
                                        phone: phoneController.text.trim(),
                                      );
                                      _reloadEnrollments();
                                      if (sheetCtx.mounted) {
                                        Navigator.of(sheetCtx).pop();
                                      }
                                      if (!mounted) return;
                                      messenger?.showSnackBar(
                                        SnackBar(
                                          content: Text(
                                            tr('ownerSession.participantAdded'),
                                          ),
                                        ),
                                      );
                                    } finally {
                                      if (sheetCtx.mounted) {
                                        setSheetState(() => isSaving = false);
                                      }
                                    }
                                  },
                            child: isSaving
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : Text(tr('ownerSession.add')),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
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
    final session = widget.session;
    final startsLocal = session.startsAt.toLocal();
    final dateFmt = DateFormat('EEEE, MMM d', locale.localeCode);
    final timeFmt = DateFormat('HH:mm');
    final durationMinutesLine =
        session.trainingDurationMinutes ?? _sessionDurationMinutes(session);
    final categoryLabel = session.categoryLabelForLocale(locale.localeCode);
    final trainerLabel = _displayTrainerName(
      session,
      widget.trainerFallbackName,
    );
    final enrolled = session.enrolledCount;
    final cap = session.capacity;
    final fillRatio = cap > 0 ? (enrolled / cap).clamp(0.0, 1.0) : 0.0;
    final pct = cap > 0 ? (fillRatio * 100).round() : 0;
    final canCancelSession =
        session.sessionId.isNotEmpty &&
        session.status.toUpperCase() == 'ACTIVE';

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
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () => Navigator.of(context).pop(),
                        style: IconButton.styleFrom(
                          backgroundColor: AppColors.neutral200,
                          shape: const CircleBorder(),
                        ),
                        icon: const Icon(
                          Icons.arrow_back,
                          color: AppColors.textPrimary,
                          size: 20,
                        ),
                      ),
                      Expanded(
                        child: Text(
                          tr('ownerSession.detailTitle'),
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                            height: 1,
                          ),
                        ),
                      ),
                      if (widget.onEditSession != null)
                        IconButton(
                          onPressed: () {
                            Navigator.of(context).pop();
                            widget.onEditSession!();
                          },
                          style: IconButton.styleFrom(
                            backgroundColor: AppColors.neutral200,
                            shape: const CircleBorder(),
                          ),
                          icon: const Icon(
                            Icons.edit_outlined,
                            color: AppColors.textPrimary,
                            size: 20,
                          ),
                        )
                      else
                        const SizedBox(width: 48),
                    ],
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
                              horizontal: 10,
                              vertical: 5,
                            ),
                            decoration: BoxDecoration(
                              color: _accent.withValues(alpha: 0.14),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              categoryLabel.trim().toUpperCase(),
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.6,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ),
                        if (categoryLabel != null &&
                            categoryLabel.trim().isNotEmpty)
                          const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            dateFmt.format(startsLocal),
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textSecondary,
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
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: _InfoCard(
                            icon: Icons.schedule_rounded,
                            iconBg: _accent.withValues(alpha: 0.14),
                            iconColor: _accent,
                            title: timeFmt.format(startsLocal),
                            subtitle: '$durationMinutesLine min',
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _InfoCard(
                            icon: Icons.person_outline_rounded,
                            iconBg: _accent.withValues(alpha: 0.14),
                            iconColor: _accent,
                            title: trainerLabel,
                            subtitle: tr('ownerSession.instructorRole'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.backgroundPrimary,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          SizedBox(
                            width: 76,
                            height: 76,
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                SizedBox.expand(
                                  child: CircularProgressIndicator(
                                    value: fillRatio,
                                    strokeWidth: 7,
                                    backgroundColor: AppColors.primary100,
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
                                        fontSize: 14,
                                        fontWeight: FontWeight.w800,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                    Text(
                                      '$enrolled/$cap',
                                      style: const TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.textSecondary,
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
                              children: [
                                Text(
                                  tr('ownerSession.capacityLabel'),
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 0.8,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  tr('ownerSession.bookedSummary')
                                      .replaceAll('{current}', '$enrolled')
                                      .replaceAll('{max}', '$cap'),
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          FilledButton.icon(
                            onPressed: session.sessionId.isEmpty
                                ? null
                                : _showAddParticipantSheet,
                            style: FilledButton.styleFrom(
                              backgroundColor: AppColors.primary500,
                              foregroundColor: AppColors.textInverse,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 10,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                            ),
                            icon: const Icon(Icons.add, size: 20),
                            label: Text(tr('ownerSession.add')),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      tr('ownerSession.quickActions'),
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        letterSpacing: 0.2,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: _QuickAction(
                            icon: Icons.cancel_outlined,
                            label: tr('ownerSession.quickActionCancel'),
                            accent: _accent,
                            onTap: canCancelSession
                                ? _confirmCancelSession
                                : null,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _QuickAction(
                            icon: Icons.edit_calendar_outlined,
                            label: tr('ownerSession.quickActionsEditSession'),
                            accent: _accent,
                            onTap: widget.onEditSession == null
                                ? null
                                : () {
                                    Navigator.of(context).pop();
                                    widget.onEditSession!();
                                  },
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _QuickAction(
                            icon: Icons.edit_outlined,
                            label: tr('ownerSession.quickActionsEditAll'),
                            accent: _accent,
                            onTap: widget.onEditService == null
                                ? null
                                : () {
                                    Navigator.of(context).pop();
                                    widget.onEditService!();
                                  },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            tr(
                              'ownerSession.attendeesHeading',
                            ).replaceAll('{count}', '${session.enrolledCount}'),
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
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
                            final displayName =
                                (e.name ??
                                        e.email ??
                                        e.phone ??
                                        tr('booking.client'))
                                    .trim();
                            final subtitle = e.phone?.isNotEmpty == true
                                ? e.phone!
                                : (e.email ?? '');
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
                                    statusBadgeForParticipant(e.status),
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

class _InfoCard extends StatelessWidget {
  const _InfoCard({
    required this.icon,
    required this.iconBg,
    required this.iconColor,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final Color iconBg;
  final Color iconColor;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: iconBg,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: iconColor, size: 22),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  const _QuickAction({
    required this.icon,
    required this.label,
    required this.accent,
    this.onTap,
  });

  final IconData icon;
  final String label;
  final Color accent;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final enabled = onTap != null;
    return Material(
      color: AppColors.backgroundPrimary,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 6),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  icon,
                  color: enabled ? accent : AppColors.textTertiary,
                  size: 22,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                label,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: enabled
                      ? AppColors.textPrimary
                      : AppColors.textTertiary,
                  height: 1.1,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
