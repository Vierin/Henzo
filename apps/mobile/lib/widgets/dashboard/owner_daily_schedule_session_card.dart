import 'package:flutter/material.dart';

import '../../constants/colors.dart';
import '../../services/dashboard_api_service.dart';
import '../../utils/color_hex.dart';

String ownerDailyScheduleTrainerLabel(
  OwnerTrainingSession session,
  String? ownerFallback,
) {
  final raw = session.trainerName.trim();
  if (raw.isNotEmpty && raw != '—' && raw != '-') return session.trainerName;
  final f = ownerFallback?.trim();
  if (f != null && f.isNotEmpty) return f;
  return '—';
}

/// Карточка слота в дневном расписании (как на дашборде).
class OwnerDailyScheduleSessionCard extends StatelessWidget {
  const OwnerDailyScheduleSessionCard({
    super.key,
    required this.session,
    required this.trainerLabel,
    required this.onTap,
  });

  final OwnerTrainingSession session;
  final String trainerLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final s = session;
    final cap = s.capacity;
    final enrolled = s.enrolledCount;
    final progress = cap > 0 ? (enrolled / cap).clamp(0.0, 1.0) : 0.0;
    final fillLabel = cap > 0 ? '$enrolled/$cap' : '$enrolled';
    final isPast = s.endsAt.isBefore(DateTime.now());
    final accent =
        parseHexColor(s.trainingDisplayColorHex) ?? AppColors.primary500;
    final duration = s.endsAt.difference(s.startsAt).inMinutes;
    final startLabel = MaterialLocalizations.of(context).formatTimeOfDay(
      TimeOfDay.fromDateTime(s.startsAt.toLocal()),
      alwaysUse24HourFormat: true,
    );

    Color progressColor = accent;
    if (progress < 0.5) {
      progressColor = const Color(0xFFE26152);
    } else if (progress < 1.0) {
      progressColor = const Color(0xFFB7D356);
    }

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Opacity(
        opacity: isPast ? 0.65 : 1.0,
        child: Container(
          margin: const EdgeInsets.only(bottom: 10),
          clipBehavior: Clip.hardEdge,
          decoration: BoxDecoration(
            color: AppColors.backgroundPrimary,
            borderRadius: BorderRadius.circular(14),
          ),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  width: 4,
                  decoration: BoxDecoration(color: accent),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 14, 0, 14),
                  child: SizedBox(
                    width: 56,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        Text(
                          startLabel,
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w600,
                            height: 1,
                            letterSpacing: -0.3,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        Text(
                          '$duration min',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFFA4A4A4),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                Container(width: 1, color: accent),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(12, 14, 12, 14),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          s.trainingName,
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                            height: 1,
                            letterSpacing: -0.3,
                            color: AppColors.textPrimary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(
                              Icons.place_outlined,
                              size: 13,
                              color: AppColors.primary500,
                            ),
                            const SizedBox(width: 3),
                            Flexible(
                              child: Text(
                                trainerLabel,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w400,
                                  color: AppColors.textSecondary,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(0, 14, 14, 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        fillLabel,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w500,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 6),
                      SizedBox(
                        width: 52,
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(999),
                          child: LinearProgressIndicator(
                            minHeight: 4,
                            value: progress,
                            backgroundColor: AppColors.borderPrimary,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              progressColor,
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
      ),
    );
  }
}
