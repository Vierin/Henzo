import 'package:flutter/material.dart';

import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../models/training_location_item.dart';
import '../../services/dashboard_api_service.dart';
import '../../utils/owner_session_card_subtitle.dart';
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
    this.studioLocations = const [],
  });

  final List<OwnerTrainingSession> sessions;
  final String emptyMessage;
  final VoidCallback? onSeeAll;
  final void Function(OwnerTrainingSession s) onSessionTap;
  final String? ownerTrainerFallback;
  final List<TrainingLocationItem> studioLocations;

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
                ...sessions.map((s) {
                  final sub = resolveOwnerSessionCardSubtitle(
                    session: s,
                    studioLocations: studioLocations,
                    ownerTrainerFallback: ownerTrainerFallback,
                  );
                  return OwnerDailyScheduleSessionCard(
                    session: s,
                    subtitleLabel: sub.label,
                    showLocationPin: sub.showLocationPin,
                    onTap: () => onSessionTap(s),
                  );
                }),
              ],
            ),
        ],
      ),
    );
  }
}
