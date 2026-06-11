import 'package:flutter/material.dart';

import '../../constants/colors.dart';
import '../common/shimmer_box.dart';

/// Skeleton for a class row on client Browse.
class BrowseClassCardSkeleton extends StatelessWidget {
  const BrowseClassCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      clipBehavior: Clip.hardEdge,
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(14),
      ),
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const ShimmerBox(width: 4, height: 88, borderRadius: 0),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 14, 0, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  ShimmerBox(width: 44, height: 18, borderRadius: 4),
                  SizedBox(height: 8),
                  ShimmerBox(width: 32, height: 11, borderRadius: 4),
                ],
              ),
            ),
            Container(width: 1, color: AppColors.neutral200),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    ShimmerBox(width: 160, height: 14, borderRadius: 4),
                    SizedBox(height: 8),
                    ShimmerBox(width: 120, height: 12, borderRadius: 4),
                    SizedBox(height: 8),
                    ShimmerBox(width: 90, height: 12, borderRadius: 4),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(0, 12, 12, 12),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: const [
                  ShimmerBox(width: 52, height: 14, borderRadius: 4),
                  SizedBox(height: 10),
                  ShimmerBox(width: 64, height: 28, borderRadius: 8),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Skeleton for a studio row on client Browse.
class BrowseStudioCardSkeleton extends StatelessWidget {
  const BrowseStudioCardSkeleton({super.key});

  static const _imageWidth = 121.0;
  static const _cardMinHeight = 166.0;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: _cardMinHeight),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(12),
      ),
      clipBehavior: Clip.antiAlias,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const ShimmerBox(
            width: _imageWidth,
            height: _cardMinHeight,
            borderRadius: 0,
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Expanded(
                        child: ShimmerBox(height: 16, borderRadius: 4),
                      ),
                      const SizedBox(width: 8),
                      ShimmerBox(width: 20, height: 20, borderRadius: 10),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const ShimmerBox(width: 100, height: 12, borderRadius: 4),
                  const SizedBox(height: 6),
                  const ShimmerBox(width: 72, height: 12, borderRadius: 4),
                  const SizedBox(height: 12),
                  const ShimmerBox(height: 44, borderRadius: 8),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
