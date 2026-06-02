import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../constants/layout.dart';
import '../l10n/locale_provider.dart';
import '../utils/formatters.dart';
import '../widgets/common/henzo_header_back_button.dart';
import '../widgets/public/studio_review_card.dart';
import '../widgets/public/studio_reviews_summary_card.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Full review list for client studio profile (See more).
class ClientStudioReviewsScreen extends StatelessWidget {
  const ClientStudioReviewsScreen({
    super.key,
    required this.studioName,
    required this.reviews,
    required this.avgRating,
  });

  final String studioName;
  final List<Map<String, dynamic>> reviews;
  final double avgRating;

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final t = (String k) => locale.t('clientStudioDetail.$k');
    final title = t('reviewsTitle');
    final empty = locale.t('dashboard.reviewsEmpty');
    final readMore = t('readMore');
    final readLess = t('readLess');
    final onReviewsLabel = t('reviewsOnCount');

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(4, 4, 12, 8),
              child: Row(
                children: [
                  HenzoHeaderBackButton(
                    onPressed: () => Navigator.pop(context),
                  ),
                  Expanded(
                    child: Text(
                      title,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 18.sp,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                  const SizedBox(width: HenzoHeaderBackButton.size + 8),
                ],
              ),
            ),
            Expanded(
              child: reviews.isEmpty
                  ? Center(
                      child: Text(
                        empty,
                        style: TextStyle(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    )
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(
                        kScreenPaddingHorizontal,
                        0,
                        kScreenPaddingHorizontal,
                        24,
                      ),
                      children: [
                        StudioReviewsSummaryCard(
                          avgRating: avgRating,
                          reviewCount: reviews.length,
                          reviews: reviews,
                          onReviewsLabel: onReviewsLabel,
                        ),
                        const SizedBox(height: 16),
                        ...reviews.map((r) {
                          final created = DateTime.tryParse(
                            (r['createdAt'] ?? '').toString(),
                          );
                          final dateLabel = formatRelativeReviewDateLabel(
                            created,
                            daysAgoTemplate: t('reviewsDaysAgo'),
                            hoursAgoTemplate: t('reviewsHoursAgo'),
                            justNowLabel: t('reviewsJustNow'),
                          );
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: StudioReviewCard(
                              review: r,
                              readMoreLabel: readMore,
                              readLessLabel: readLess,
                              dateLabel: dateLabel,
                            ),
                          );
                        }),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
