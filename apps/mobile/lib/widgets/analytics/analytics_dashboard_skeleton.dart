import 'package:flutter/material.dart';

import '../../constants/colors.dart';
import '../common/shimmer_box.dart';
import 'analytics_dashboard_widgets.dart';

class AnalyticsMetricCardSkeleton extends StatelessWidget {
  const AnalyticsMetricCardSkeleton({
    super.key,
    this.compact = false,
  });

  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: compact ? kAnalyticsGridCardHeight : 108,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(kAnalyticsCardRadius),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const ShimmerBox(height: 10, width: 72, borderRadius: 4),
          const SizedBox(height: 10),
          Row(
            children: [
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ShimmerBox(height: 28, width: 88, borderRadius: 6),
                    SizedBox(height: 8),
                    ShimmerBox(height: 12, width: 56, borderRadius: 4),
                  ],
                ),
              ),
              ShimmerBox(
                width: 40,
                height: 40,
                borderRadius: 12,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class AnalyticsOccupancyCardSkeleton extends StatelessWidget {
  const AnalyticsOccupancyCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return const AnalyticsMetricCardSkeleton(compact: true);
  }
}

class AnalyticsRevenueTrendCardSkeleton extends StatelessWidget {
  const AnalyticsRevenueTrendCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(kAnalyticsCardRadius),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const ShimmerBox(height: 10, width: 120, borderRadius: 4),
          const SizedBox(height: 16),
          SizedBox(
            height: 150,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Column(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: const [
                    ShimmerBox(height: 10, width: 24, borderRadius: 4),
                    ShimmerBox(height: 10, width: 20, borderRadius: 4),
                    ShimmerBox(height: 10, width: 12, borderRadius: 4),
                  ],
                ),
                const SizedBox(width: 8),
                const Expanded(
                  child: ShimmerBox(
                    height: 150,
                    borderRadius: kAnalyticsCardRadius,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              ShimmerBox(height: 10, width: 40, borderRadius: 4),
              ShimmerBox(height: 10, width: 40, borderRadius: 4),
              ShimmerBox(height: 10, width: 40, borderRadius: 4),
            ],
          ),
        ],
      ),
    );
  }
}

class AnalyticsDashboardSkeleton extends StatelessWidget {
  const AnalyticsDashboardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return const Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AnalyticsMetricCardSkeleton(),
        SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: AnalyticsMetricCardSkeleton(compact: true)),
            SizedBox(width: 12),
            Expanded(child: AnalyticsOccupancyCardSkeleton()),
          ],
        ),
        SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: AnalyticsMetricCardSkeleton(compact: true)),
            SizedBox(width: 12),
            Expanded(child: AnalyticsMetricCardSkeleton(compact: true)),
          ],
        ),
        SizedBox(height: 12),
        AnalyticsRevenueTrendCardSkeleton(),
      ],
    );
  }
}
