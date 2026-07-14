import 'package:flutter/material.dart';

import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../common/shimmer_box.dart';

/// Skeleton mirroring the owner client-detail layout (profile header, action
/// tiles, visits list) shown while data loads, so the page renders its
/// structure instantly instead of blocking on a full-screen spinner.
class ClientDetailSkeleton extends StatelessWidget {
  const ClientDetailSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(
        kScreenPaddingHorizontal,
        4,
        kScreenPaddingHorizontal,
        24,
      ),
      children: [
        // Profile header card.
        DecoratedBox(
          decoration: BoxDecoration(
            color: AppColors.backgroundPrimary,
            borderRadius: BorderRadius.circular(20),
          ),
          child: const Padding(
            padding: EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ShimmerBox(width: 72, height: 72, borderRadius: 36),
                SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ShimmerBox(height: 20, width: 160, borderRadius: 6),
                      SizedBox(height: 10),
                      ShimmerBox(height: 13, width: 120, borderRadius: 4),
                      SizedBox(height: 16),
                      Row(
                        children: [
                          ShimmerBox(height: 32, width: 64, borderRadius: 8),
                          SizedBox(width: 16),
                          ShimmerBox(height: 32, width: 64, borderRadius: 8),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        // Action tiles row (Call / Email / Book).
        const Row(
          children: [
            Expanded(child: ShimmerBox(height: 72, borderRadius: 14)),
            SizedBox(width: 8),
            Expanded(child: ShimmerBox(height: 72, borderRadius: 14)),
            SizedBox(width: 8),
            Expanded(child: ShimmerBox(height: 72, borderRadius: 14)),
          ],
        ),
        const SizedBox(height: 20),
        // Visits section title.
        const ShimmerBox(height: 13, width: 130, borderRadius: 4),
        const SizedBox(height: 10),
        // Visit cards.
        for (int i = 0; i < 5; i++) ...const [
          ShimmerBox(height: 76, borderRadius: 14),
          SizedBox(height: 10),
        ],
      ],
    );
  }
}
