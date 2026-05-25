import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import '../utils/formatters.dart';
import '../widgets/common/henzo_header_back_button.dart';

/// Full review list for client studio profile (See all).
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
    final subtitle = locale
        .t('dashboard.reviewsSubtitle')
        .replaceAll('{rating}', avgRating > 0 ? avgRating.toStringAsFixed(1) : '—')
        .replaceAll('{count}', '${reviews.length}');

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
                if (avgRating > 0)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                ...reviews.map((r) {
                  final rating = (r['rating'] as num?)?.toDouble() ?? 0;
                  final comment = (r['comment'] ?? '').toString().trim();
                  final user = r['user'];
                  final name = user is Map
                      ? (user['name'] ?? '').toString().trim()
                      : '';
                  final displayName = name.isNotEmpty ? name : '—';
                  final created = DateTime.tryParse(
                    (r['createdAt'] ?? '').toString(),
                  );
                  final when = formatRelativeReviewDateLabel(
                    created,
                    daysAgoTemplate: locale.t(
                      'clientStudioDetail.reviewsDaysAgo',
                    ),
                    hoursAgoTemplate: locale.t(
                      'clientStudioDetail.reviewsHoursAgo',
                    ),
                    justNowLabel: locale.t(
                      'clientStudioDetail.reviewsJustNow',
                    ),
                  );
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Container(
                      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                      decoration: BoxDecoration(
                        color: AppColors.backgroundPrimary,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  displayName,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 15,
                                  ),
                                ),
                              ),
                              if (when.isNotEmpty)
                                Text(
                                  when,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: AppColors.textTertiary,
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              const Icon(
                                Icons.star_rounded,
                                size: 16,
                                color: Color(0xFFFFB800),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                rating.toStringAsFixed(1),
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                          if (comment.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Text(
                              comment,
                              style: const TextStyle(
                                fontSize: 14,
                                height: 1.35,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                }),
              ],
            ),
    );
  }
}
