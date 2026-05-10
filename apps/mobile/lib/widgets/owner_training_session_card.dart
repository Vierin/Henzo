import 'package:flutter/material.dart';

import '../constants/colors.dart';
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
        Padding(
          padding: const EdgeInsets.fromLTRB(8, 8, 12, 8),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,

              children: [
                SizedBox(
                  width: 80,
                  height: 80,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: accentColor.withValues(alpha: 0.14),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      mainAxisAlignment: MainAxisAlignment.center,

                      children: [
                        Text(
                          startLabel,
                          textAlign: TextAlign.center,

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
                          textAlign: TextAlign.center,

                          style: TextStyle(
                            fontSize: 12,

                            fontWeight: FontWeight.w500,

                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(width: 10),

                Expanded(
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
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

                            if (badge != null) ...[
                              const SizedBox(width: 8),
                              badge,
                            ],
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
                ),

                const SizedBox(width: 4),

                Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.end,

                    children: [
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.person_outline,
                            size: 18,
                            color: past ? AppColors.textSecondary : accentColor,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            fillLabel,
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              letterSpacing: -0.2,
                              color: past
                                  ? AppColors.textSecondary
                                  : accentColor,
                              height: 1.05,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 7),
                      SizedBox(
                        width: 56,
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
                ),
              ],
            ),
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
      constraints: const BoxConstraints(minHeight: 90),

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
