import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import '../services/auth_service.dart';
import '../services/dashboard_api_service.dart';

/// Owner-facing card: start clock time + duration in minutes, title/trainer, occupancy + "booked".

class OwnerTrainingSessionCard extends StatelessWidget {
  const OwnerTrainingSessionCard({
    super.key,

    required this.session,

    this.statusBadge,

    this.margin = const EdgeInsets.only(bottom: 12),

    this.onTap,

    /// When API returns no trainer (owner-led session), show this instead of "—".
    this.trainerFallbackName,
    this.isPast = false,
    this.pastLabel,
    this.trainingColor,
  });

  final OwnerTrainingSession session;

  final Widget? statusBadge;

  final EdgeInsetsGeometry margin;

  final VoidCallback? onTap;

  /// Owner name/email when trainer is unset in backend.

  final String? trainerFallbackName;
  final bool isPast;
  final String? pastLabel;
  final Color? trainingColor;

  /// Duration as configured (whole minutes).

  static int durationMinutes(OwnerTrainingSession session) {
    final d = session.endsAt.difference(session.startsAt);

    return d.inMinutes.clamp(0, 24 * 60);
  }

  static String durationMinutesLabel(OwnerTrainingSession session) {
    final m = durationMinutes(session);

    return '$m min';
  }

  /// Effective trainer label when session has no Trainer row (owner teaches).

  static String displayTrainer(
    OwnerTrainingSession session,

    String? fallbackName,
  ) {
    final raw = session.trainerName.trim();

    if (raw.isNotEmpty && raw != '—' && raw != '-') {
      return session.trainerName;
    }

    final f = fallbackName?.trim();

    if (f != null && f.isNotEmpty) return f;

    return '—';
  }

  static Future<void> showDetailsModal(
    BuildContext context,

    OwnerTrainingSession session, {

    Widget? statusBadge,

    String? trainerFallbackName,

    /// Редактировать только этот слот (время, тренер, отмена).
    VoidCallback? onEditSession,

    /// Редактировать шаблон услуги (имя, цена, длительность) — влияет на все будущие слоты.
    VoidCallback? onEditService,
    VoidCallback? onParticipantsChanged,
  }) {
    final startsLocal = session.startsAt.toLocal();

    final dateFmt = DateFormat('dd.MM.yyyy');

    final timeFmt = DateFormat('HH:mm');

    final minutes = durationMinutes(session);

    final trainerLabel = displayTrainer(session, trainerFallbackName);
    final tr = context.read<LocaleProvider>().t;

    String statusText(String status) {
      switch (status) {
        case 'ACTIVE':
          return tr('ownerSession.participantStatusActive');
        case 'NO_SHOW':
          return tr('ownerSession.participantStatusNoShow');
        case 'CANCELLED':
          return tr('ownerSession.participantStatusCancelled');
        default:
          return status;
      }
    }

    Future<List<OwnerSessionEnrollment>> loadEnrollments() async {
      final token = context.read<AuthService>().accessToken;
      if (token == null || token.isEmpty) return [];
      return DashboardApiService.getOwnerSessionEnrollments(
        token,
        session.sessionId,
      );
    }

    Future<List<OwnerSessionEnrollment>> enrollmentsFuture = loadEnrollments();

    Future<void> addParticipantDialog(StateSetter setModalState) async {
      final nameController = TextEditingController();
      final emailController = TextEditingController();
      final phoneController = TextEditingController();
      final shouldSave = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text(tr('ownerSession.addParticipant')),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: InputDecoration(labelText: tr('ownerSession.name')),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: emailController,
                decoration: InputDecoration(
                  labelText: tr('ownerSession.email'),
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: phoneController,
                decoration: InputDecoration(
                  labelText: tr('ownerSession.phone'),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: Text(tr('common.cancel')),
            ),
            FilledButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: Text(tr('ownerSession.add')),
            ),
          ],
        ),
      );
      if (shouldSave != true) return;
      final token = context.read<AuthService>().accessToken;
      if (token == null || token.isEmpty) return;
      await DashboardApiService.addOwnerSessionEnrollment(
        token,
        session.sessionId,
        name: nameController.text.trim(),
        email: emailController.text.trim(),
        phone: phoneController.text.trim(),
      );
      enrollmentsFuture = loadEnrollments();
      setModalState(() {});
      onParticipantsChanged?.call();
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(content: Text(tr('ownerSession.participantAdded'))),
      );
    }

    Future<void> editParticipantsDialog(StateSetter setModalState) async {
      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (sheetCtx) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.backgroundPrimary,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.borderPrimary),
              ),
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
              child: FutureBuilder<List<OwnerSessionEnrollment>>(
                future: enrollmentsFuture,
                builder: (context, snap) {
                  if (snap.connectionState == ConnectionState.waiting) {
                    return const SizedBox(
                      height: 220,
                      child: Center(
                        child: CircularProgressIndicator(
                          color: AppColors.primary500,
                        ),
                      ),
                    );
                  }
                  if (snap.hasError) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text(
                        tr('ownerSession.participantsLoadError'),
                        style: TextStyle(color: AppColors.error500),
                      ),
                    );
                  }
                  final list = snap.data ?? const [];
                  if (list.isEmpty) {
                    return SizedBox(
                      height: 160,
                      child: Center(
                        child: Text(
                          tr('ownerSession.noParticipants'),
                          style: const TextStyle(color: AppColors.textSecondary),
                        ),
                      ),
                    );
                  }
                  return ListView(
                    shrinkWrap: true,
                    children: list.map((e) {
                      final displayName =
                          (e.name ?? e.email ?? e.phone ?? tr('booking.client')).trim();
                      final subtitle = e.phone?.isNotEmpty == true
                          ? e.phone!
                          : (e.email ?? '');
                      final statusColor = e.status == 'NO_SHOW'
                          ? AppColors.error500
                          : e.status == 'CANCELLED'
                              ? AppColors.textSecondary
                              : AppColors.primary500;
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.backgroundSecondary,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    displayName,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                  if (subtitle.isNotEmpty)
                                    Text(
                                      subtitle,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: AppColors.textSecondary,
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: statusColor.withValues(alpha: 0.14),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text(
                                statusText(e.status),
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: statusColor,
                                ),
                              ),
                            ),
                            PopupMenuButton<String>(
                              onSelected: (value) async {
                                final token = context.read<AuthService>().accessToken;
                                if (token == null || token.isEmpty) return;
                                if (value == 'DELETE') {
                                  await DashboardApiService.deleteOwnerEnrollment(
                                    token,
                                    e.enrollmentId,
                                  );
                                } else {
                                  await DashboardApiService.updateOwnerEnrollmentStatus(
                                    token,
                                    e.enrollmentId,
                                    value,
                                  );
                                }
                                enrollmentsFuture = loadEnrollments();
                                setModalState(() {});
                                onParticipantsChanged?.call();
                                if (sheetCtx.mounted) Navigator.of(sheetCtx).pop();
                                await editParticipantsDialog(setModalState);
                              },
                              itemBuilder: (_) => [
                                PopupMenuItem(
                                  value: 'ACTIVE',
                                  child: Text(tr('ownerSession.actionSetActive')),
                                ),
                                PopupMenuItem(
                                  value: 'NO_SHOW',
                                  child: Text(tr('ownerSession.actionSetNoShow')),
                                ),
                                PopupMenuItem(
                                  value: 'CANCELLED',
                                  child: Text(
                                    tr('ownerSession.actionCancelParticipant'),
                                  ),
                                ),
                                PopupMenuItem(
                                  value: 'DELETE',
                                  child: Text(
                                    tr('ownerSession.actionDeleteParticipant'),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  );
                },
              ),
            ),
          ),
        ),
      );
    }

    return showModalBottomSheet<void>(
      context: context,

      isScrollControlled: true,

      backgroundColor: Colors.transparent,

      builder: (ctx) {
        final badge = statusBadge;
        final tr = context.read<LocaleProvider>().t;

        return StatefulBuilder(
          builder: (context, setModalState) => SafeArea(
            child: Padding(
              padding: EdgeInsets.only(
                left: 16,

                right: 16,

                bottom: 16 + MediaQuery.of(ctx).viewInsets.bottom,

                top: 8,
              ),

              child: Container(
                decoration: BoxDecoration(
                  color: AppColors.backgroundPrimary,

                  borderRadius: BorderRadius.circular(16),

                  border: Border.all(color: AppColors.borderPrimary),

                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x14000000),

                      blurRadius: 16,

                      offset: Offset(0, 6),
                    ),
                  ],
                ),

                padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),

                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,

                    mainAxisSize: MainAxisSize.min,

                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,

                        children: [
                          Expanded(
                            child: Text(
                              session.trainingName,

                              style: const TextStyle(
                                fontSize: 18,

                                fontWeight: FontWeight.w800,

                                color: AppColors.textPrimary,

                                height: 1.25,
                              ),
                            ),
                          ),

                          if (badge != null) ...[
                            const SizedBox(width: 10),

                            badge,
                          ],
                        ],
                      ),

                      const SizedBox(height: 16),

                      _detailRow(
                        'Начало',

                        '${dateFmt.format(startsLocal)} · ${timeFmt.format(startsLocal)}',
                      ),

                      _detailRow('Длительность', '$minutes min'),

                      _detailRow('Тренер', trainerLabel),

                      _detailRow(
                        'Заполненность',

                        '${session.enrolledCount} / ${session.capacity}',
                      ),

                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              tr('ownerSession.participants'),
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ),
                          IconButton(
                            onPressed: () =>
                                addParticipantDialog(setModalState),
                            icon: const Icon(Icons.person_add_alt_1),
                            tooltip: tr('ownerSession.addParticipant'),
                          ),
                          IconButton(
                            onPressed: () =>
                                editParticipantsDialog(setModalState),
                            icon: const Icon(Icons.edit_outlined),
                            tooltip: tr('ownerSession.editParticipants'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      if (onEditSession != null || onEditService != null) ...[
                        if (onEditSession != null)
                          SizedBox(
                            width: double.infinity,
                            height: 46,
                            child: OutlinedButton(
                              onPressed: () {
                                Navigator.of(ctx).pop();
                                onEditSession();
                              },
                              child: Text(
                                tr('ownerSession.editCurrentSession'),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ),
                        if (onEditSession != null && onEditService != null)
                          const SizedBox(height: 8),
                        if (onEditService != null)
                          SizedBox(
                            width: double.infinity,
                            child: TextButton(
                              onPressed: () {
                                Navigator.of(ctx).pop();
                                onEditService();
                              },
                              child: Text(
                                tr('ownerSession.editAllTrainings'),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ),
                        const SizedBox(height: 8),
                        SizedBox(
                          width: double.infinity,
                          height: 46,
                          child: FilledButton(
                            onPressed: () => Navigator.of(ctx).pop(),
                            style: FilledButton.styleFrom(
                              backgroundColor: AppColors.primary500,
                            ),
                            child: const Text('Закрыть'),
                          ),
                        ),
                      ] else
                        SizedBox(
                          width: double.infinity,
                          height: 46,
                          child: FilledButton(
                            onPressed: () => Navigator.of(ctx).pop(),
                            style: FilledButton.styleFrom(
                              backgroundColor: AppColors.primary500,
                            ),
                            child: const Text('Закрыть'),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  static Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),

      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,

        children: [
          SizedBox(
            width: 118,

            child: Text(
              label,

              style: TextStyle(
                fontSize: 13,

                fontWeight: FontWeight.w600,

                color: AppColors.textSecondary,
              ),
            ),
          ),

          Expanded(
            child: Text(
              value,

              style: const TextStyle(
                fontSize: 14,

                fontWeight: FontWeight.w600,

                color: AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final resolvedMargin = margin.resolve(Directionality.of(context));
    final safeMargin = EdgeInsets.fromLTRB(
      resolvedMargin.left < 0 ? 0 : resolvedMargin.left,
      resolvedMargin.top < 0 ? 0 : resolvedMargin.top,
      resolvedMargin.right < 0 ? 0 : resolvedMargin.right,
      resolvedMargin.bottom < 0 ? 0 : resolvedMargin.bottom,
    );

    final badge = statusBadge;
    final past = isPast;

    final trainerLabel = displayTrainer(session, trainerFallbackName);

    final startLabel = TimeOfDay.fromDateTime(
      session.startsAt.toLocal(),
    ).format(context);

    final durationLabel = durationMinutesLabel(session);

    final enrolled = session.enrolledCount;

    final cap = session.capacity;

    final fillLabel = cap > 0 ? '$enrolled/$cap' : '$enrolled';
    final fillProgress = cap > 0 ? (enrolled / cap).clamp(0.0, 1.0) : 0.0;
    final accentColor = trainingColor ?? AppColors.primary500;

    final inner = Stack(
      children: [
        Positioned(
          top: 8,
          bottom: 8,
          left: 75,
          child: SizedBox(
            width: 3,
            child: DecoratedBox(
              decoration: BoxDecoration(color: accentColor),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,

            children: [
              SizedBox(
                width: 76,

                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,

                  children: [
                    Text(
                      startLabel,

                      style: TextStyle(
                        fontSize: 18,

                        fontWeight: FontWeight.w800,

                        letterSpacing: -0.3,

                        color: past
                            ? AppColors.textSecondary
                            : AppColors.textPrimary,

                        height: 1.1,
                      ),
                    ),

                    const SizedBox(height: 4),

                    Text(
                      durationLabel,

                      style: TextStyle(
                        fontSize: 12,

                        fontWeight: FontWeight.w500,

                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(width: 10),

              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,

                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,

                      children: [
                        Expanded(
                          child: Text(
                            session.trainingName,

                            style: TextStyle(
                              fontSize: 16,

                              fontWeight: FontWeight.w700,

                              color: past
                                  ? AppColors.textSecondary
                                  : AppColors.textPrimary,

                              height: 1.25,
                            ),
                          ),
                        ),

                        if (badge != null) ...[const SizedBox(width: 8), badge],
                      ],
                    ),

                    const SizedBox(height: 4),

                    Text(
                      trainerLabel,

                      maxLines: 1,

                      overflow: TextOverflow.ellipsis,

                      style: TextStyle(
                        fontSize: 13,

                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(width: 4),

              Column(
                crossAxisAlignment: CrossAxisAlignment.end,

                children: [
                  Text(
                    fillLabel,

                    style: TextStyle(
                      fontSize: 17,

                      fontWeight: FontWeight.w800,

                      letterSpacing: -0.2,

                      color: past
                          ? AppColors.textSecondary
                          : accentColor,

                      height: 1.05,
                    ),
                  ),

                  const SizedBox(height: 6),
                  SizedBox(
                    width: 48,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(999),
                      child: LinearProgressIndicator(
                        minHeight: 5,
                        value: fillProgress,
                        backgroundColor: AppColors.borderPrimary,
                        valueColor: AlwaysStoppedAnimation<Color>(
                          past ? AppColors.textSecondary : accentColor,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );

    final box = Container(
      margin: safeMargin,

      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,

        borderRadius: BorderRadius.circular(14),

        border: Border.all(color: AppColors.borderPrimary),

        boxShadow: const [
          BoxShadow(
            color: Color(0x10000000),

            blurRadius: 10,

            offset: Offset(0, 3),
          ),
        ],
      ),

      clipBehavior: Clip.none,

      child: Stack(
        clipBehavior: Clip.none,
        children: [
          inner,
          if (past && pastLabel != null && pastLabel!.isNotEmpty)
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: FractionalTranslation(
                translation: const Offset(0, -0.5),
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.backgroundPrimary,
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: AppColors.borderPrimary),
                    ),
                    child: Text(
                      pastLabel!,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.2,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );

    final visualBox = past ? Opacity(opacity: 0.78, child: box) : box;

    if (onTap == null) return visualBox;

    return GestureDetector(
      onTap: onTap,

      behavior: HitTestBehavior.opaque,

      child: visualBox,
    );
  }
}
