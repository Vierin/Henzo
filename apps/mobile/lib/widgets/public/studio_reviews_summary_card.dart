import 'package:flutter/material.dart';

import '../../constants/colors.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Rating summary + star distribution (client studio reviews screen).
class StudioReviewsSummaryCard extends StatelessWidget {
  const StudioReviewsSummaryCard({
    super.key,
    required this.avgRating,
    required this.reviewCount,
    required this.reviews,
    required this.onReviewsLabel,
  });

  final double avgRating;
  final int reviewCount;
  final List<Map<String, dynamic>> reviews;
  final String onReviewsLabel;

  static const _starColor = Color(0xFFFFD24C);
  static const _trackColor = Color(0x66FFFFFF);

  Map<int, int> _countByStar() {
    final counts = <int, int>{5: 0, 4: 0, 3: 0, 2: 0, 1: 0};
    for (final r in reviews) {
      final raw = (r['rating'] as num?)?.toDouble() ?? 0;
      final star = raw.round().clamp(1, 5);
      counts[star] = (counts[star] ?? 0) + 1;
    }
    return counts;
  }

  @override
  Widget build(BuildContext context) {
    final counts = _countByStar();
    final total = reviewCount > 0 ? reviewCount : 1;
    final ratingText = reviewCount > 0
        ? avgRating.toStringAsFixed(1).replaceAll('.', ',')
        : '0';
    final subtitle = onReviewsLabel.replaceAll('{count}', '$reviewCount');

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      decoration: BoxDecoration(
        color: AppColors.primary500,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          SizedBox(
            width: 108,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  ratingText,
                  style: TextStyle(
                    fontSize: 40.sp,
                    fontWeight: FontWeight.w700,
                    height: 1,
                    letterSpacing: -1,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  children: List.generate(5, (i) {
                    final filled =
                        reviewCount > 0 && avgRating > 0 && i < avgRating.round();
                    return Padding(
                      padding: EdgeInsets.only(right: i < 4 ? 2 : 0),
                      child: Icon(
                        Icons.star_rounded,
                        size: 14,
                        color: filled ? _starColor : Colors.white38,
                      ),
                    );
                  }),
                ),
                const SizedBox(height: 6),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 11.sp,
                    fontWeight: FontWeight.w500,
                    height: 1.2,
                    color: Colors.white.withValues(alpha: 0.92),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              children: [
                for (var star = 5; star >= 1; star--)
                  _DistributionRow(
                    star: star,
                    count: counts[star] ?? 0,
                    total: total,
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DistributionRow extends StatelessWidget {
  const _DistributionRow({
    required this.star,
    required this.count,
    required this.total,
  });

  final int star;
  final int count;
  final int total;

  static const _starColor = Color(0xFFFFD24C);

  @override
  Widget build(BuildContext context) {
    final fraction = count / total;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          SizedBox(
            width: 10,
            child: Text(
              '$star',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 11.sp,
                fontWeight: FontWeight.w600,
                color: Colors.white,
                height: 1,
              ),
            ),
          ),
          const SizedBox(width: 2),
          const Icon(Icons.star_rounded, size: 10, color: _starColor),
          const SizedBox(width: 6),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(2),
              child: SizedBox(
                height: 6,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    const ColoredBox(color: StudioReviewsSummaryCard._trackColor),
                    FractionallySizedBox(
                      widthFactor: fraction.clamp(0.0, 1.0),
                      alignment: Alignment.centerLeft,
                      child: const ColoredBox(color: _starColor),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          SizedBox(
            width: 28,
            child: Text(
              '$count',
              textAlign: TextAlign.right,
              style: TextStyle(
                fontSize: 11.sp,
                fontWeight: FontWeight.w500,
                color: Colors.white.withValues(alpha: 0.95),
                height: 1,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
