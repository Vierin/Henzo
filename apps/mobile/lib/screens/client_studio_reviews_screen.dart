import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import '../widgets/common/henzo_header_back_button.dart';
import '../widgets/public/studio_review_card.dart';

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
    final title = locale.t('clientStudioDetail.reviewsTitle');
    final empty = locale.t('dashboard.reviewsEmpty');
    final readMore = locale.t('clientStudioDetail.readMore');
    final readLess = locale.t('clientStudioDetail.readLess');

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: HenzoHeaderBackButton(
          onPressed: () => Navigator.pop(context),
        ),
        leadingWidth: 56,
        title: Text(
          title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        centerTitle: true,
      ),
      body: reviews.isEmpty
          ? Center(
              child: Text(
                empty,
                style: const TextStyle(color: AppColors.textSecondary),
              ),
            )
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              children: [
                StudioReviewsSectionHeader(
                  title: title,
                  seeMoreLabel: '',
                  avgRating: avgRating,
                  reviewCount: reviews.length,
                ),
                const SizedBox(height: 12),
                ...reviews.map(
                  (r) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: StudioReviewCard(
                      review: r,
                      readMoreLabel: readMore,
                      readLessLabel: readLess,
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}
