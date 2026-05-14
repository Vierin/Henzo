import 'package:flutter/material.dart';

import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../services/dashboard_api_service.dart';
import 'owner_daily_schedule_header.dart';
import 'owner_daily_schedule_session_card.dart';

/// Заголовок + список карточек дневного расписания (как на дашборде).
class OwnerDailyScheduleBlock extends StatelessWidget {
  const OwnerDailyScheduleBlock({
    super.key,
    required this.sessions,
    required this.emptyMessage,
    required this.onSessionTap,
    this.onSeeAll,
    this.ownerTrainerFallback,
  });

  final List<OwnerTrainingSession> sessions;
  final String emptyMessage;
  final VoidCallback? onSeeAll;
  final void Function(OwnerTrainingSession s) onSessionTap;
  final String? ownerTrainerFallback;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        kScreenPaddingHorizontal,
        0,
        kScreenPaddingHorizontal,
        12,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: OwnerDailyScheduleHeader(onSeeAll: onSeeAll),
          ),
          if (sessions.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 16),
              decoration: BoxDecoration(
                color: AppColors.backgroundPrimary,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.borderPrimary),
              ),
              alignment: Alignment.center,
              child: Text(
                emptyMessage,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w400,
                  color: AppColors.textSecondary,
                ),
              ),
            )
          else
            Column(
              children: [
                for (final s in sessions)
                  OwnerDailyScheduleSessionCard(
                    session: s,
                    trainerLabel: ownerDailyScheduleTrainerLabel(
                      s,
                      ownerTrainerFallback,
                    ),
                    onTap: () => onSessionTap(s),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}
