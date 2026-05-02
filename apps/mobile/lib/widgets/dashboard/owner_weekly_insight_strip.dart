import 'package:flutter/material.dart';

import '../../constants/colors.dart';

/// KPI card using Henzo primary / secondary surfaces (no decorative blobs).
class OwnerWeeklyInsightCard extends StatelessWidget {
  const OwnerWeeklyInsightCard({
    super.key,
    required this.label,
    required this.value,
    this.brandVariant = 0,
  });

  final String label;
  final String value;

  /// 0 = coral tint, 1 = cream tint, 2 = stronger coral tint — rotates across strip.
  final int brandVariant;

  @override
  Widget build(BuildContext context) {
    final v = brandVariant % 3;
    final Color bg;
    final Color borderColor;
    switch (v) {
      case 1:
        bg = AppColors.secondary100;
        borderColor = AppColors.secondary300.withValues(alpha: 0.65);
        break;
      case 2:
        bg = AppColors.primary100;
        borderColor = AppColors.primary300;
        break;
      default:
        bg = AppColors.primary50;
        borderColor = AppColors.primary200;
    }

    return Container(
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: borderColor, width: 1),
        boxShadow: [
          BoxShadow(
            color: AppColors.neutral900.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            label,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 10,
              height: 1.25,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.85,
              color: AppColors.neutral600,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 23,
              height: 1.1,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
              letterSpacing: -0.4,
            ),
          ),
        ],
      ),
    );
  }
}

/// Horizontal row of [OwnerWeeklyInsightCard]s + optional today summary line.
class OwnerWeeklyInsightStrip extends StatelessWidget {
  const OwnerWeeklyInsightStrip({
    super.key,
    required this.todaySummaryLine,
    required this.sectionTitle,
    required this.cards,
  });

  final String todaySummaryLine;
  final String sectionTitle;
  final List<Widget> cards;

  @override
  Widget build(BuildContext context) {
    final h = MediaQuery.sizeOf(context).height;
    final cardHeight = h < 640 ? 96.0 : 104.0;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            todaySummaryLine,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary.withValues(alpha: 0.85),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            sectionTitle,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.6,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            height: cardHeight,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              itemCount: cards.length,
              separatorBuilder: (_, _) => const SizedBox(width: 10),
              itemBuilder: (context, i) => SizedBox(
                width: MediaQuery.sizeOf(context).width * 0.72,
                child: cards[i],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
