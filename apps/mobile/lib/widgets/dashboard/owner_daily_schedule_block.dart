import 'package:flutter/material.dart';

import '../../constants/layout.dart';
import '../../models/training_location_item.dart';
import '../../services/dashboard_api_service.dart';
import '../../utils/owner_session_card_subtitle.dart';
import '../schedule/schedule_day_empty_card.dart';
import 'owner_daily_schedule_header.dart';
import 'owner_daily_schedule_session_card.dart';

/// Заголовок + список карточек дневного расписания (как на дашборде).
class OwnerDailyScheduleBlock extends StatelessWidget {
  const OwnerDailyScheduleBlock({
    super.key,
    required this.sessions,
    required this.emptyMessage,
    required this.onSessionTap,
    this.emptySubtitle,
    this.onSeeAll,
    this.ownerTrainerFallback,
    this.studioLocations = const [],
    this.completedLabel,
  });

  final List<OwnerTrainingSession> sessions;
  final String emptyMessage;
  final String? emptySubtitle;
  final VoidCallback? onSeeAll;
  final void Function(OwnerTrainingSession s) onSessionTap;
  final String? ownerTrainerFallback;
  final List<TrainingLocationItem> studioLocations;
  final String? completedLabel;

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
            ScheduleDayEmptyCard(
              title: emptyMessage,
              subtitle: emptySubtitle,
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
                  final rows = layoutOwnerSessionCardRows(
                    session: s,
                    subtitleLabel: sub.label,
                    showLocationPin: sub.showLocationPin,
                    ownerTrainerFallback: ownerTrainerFallback,
                  );
                  return OwnerDailyScheduleSessionCard(
                    session: s,
                    subtitleLabel: rows.subtitleLabel,
                    showLocationPin: rows.showLocationPin,
                    showSubtitleLeadingIcon: rows.showSubtitleLeadingIcon,
                    trainerLine: rows.trainerLine,
                    completedLabel: completedLabel,
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
