import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../models/training_location_item.dart';
import '../../services/dashboard_api_service.dart';
import '../../utils/owner_session_card_subtitle.dart';
import 'owner_daily_schedule_header.dart';
import 'owner_daily_schedule_session_card.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

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
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 15),
              decoration: BoxDecoration(
                color: AppColors.backgroundPrimary,
                borderRadius: BorderRadius.circular(14),
              ),
              child: _ScheduleEmptyState(
                title: emptyMessage,
                subtitle: emptySubtitle,
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

class _ScheduleEmptyState extends StatelessWidget {
  const _ScheduleEmptyState({required this.title, this.subtitle});

  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: const BoxDecoration(
            color: AppColors.brandAccent,
            shape: BoxShape.circle,
          ),
          alignment: Alignment.center,
          child: SvgPicture.asset(
            'assets/icons/icon-calendar-empty.svg',
            width: 20,
            height: 20,
            fit: BoxFit.contain,
            excludeFromSemantics: true,
            colorFilter: const ColorFilter.mode(
              AppColors.textInverse,
              BlendMode.srcIn,
            ),
          ),
        ),
        const SizedBox(width: 11),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: 16.sp,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.3,
                  color: AppColors.textPrimary,
                  height: 1.2,
                ),
              ),
              if (subtitle != null && subtitle!.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  subtitle!,
                  style: TextStyle(
                    fontSize: 14.sp,
                    fontWeight: FontWeight.w400,
                    color: AppColors.textSecondary,
                    height: 1.2,
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
