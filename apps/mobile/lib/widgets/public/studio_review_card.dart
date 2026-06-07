import 'package:flutter/material.dart';

import '../../constants/colors.dart';
import '../../utils/formatters.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Single review row — client studio profile (mockup).
class StudioReviewCard extends StatefulWidget {
  const StudioReviewCard({
    super.key,
    required this.review,
    required this.readMoreLabel,
    required this.readLessLabel,
    this.dateLabel,
  });

  final Map<String, dynamic> review;
  final String readMoreLabel;
  final String readLessLabel;
  final String? dateLabel;

  @override
  State<StudioReviewCard> createState() => _StudioReviewCardState();
}

class _StudioReviewCardState extends State<StudioReviewCard> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final review = widget.review;
    final rating = (review['rating'] as num?)?.toDouble() ?? 0;
    final comment = (review['comment'] ?? '').toString().trim();
    final user = review['user'];
    final name = user is Map ? (user['name'] ?? '').toString().trim() : '';
    final displayName = name.isNotEmpty ? name : '—';
    final avatarUrl = user is Map
        ? (user['avatarUrl'] ?? user['photoUrl'] ?? user['imageUrl'])
            ?.toString()
            .trim()
        : null;
    final created = DateTime.tryParse((review['createdAt'] ?? '').toString());
    final resolvedDateLabel =
        widget.dateLabel ?? formatReviewDateLabel(created);
    final initial = displayName == '—'
        ? '?'
        : displayName.characters.first.toUpperCase();
    final starCount = rating.round().clamp(0, 5);
    final showReadMore = comment.length > 120;

    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: AppColors.secondary200,
            backgroundImage:
                avatarUrl != null && avatarUrl.isNotEmpty
                    ? NetworkImage(avatarUrl)
                    : null,
            child: avatarUrl == null || avatarUrl.isEmpty
                ? Text(
                    initial,
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 16.sp,
                      color: AppColors.textPrimary,
                    ),
                  )
                : null,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Wrap(
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 6,
                        runSpacing: 4,
                        children: [
                          Text(
                            displayName,
                            style: TextStyle(
                              fontSize: 14.sp,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                              height: 1.2,
                            ),
                          ),
                          _ReviewStars(count: starCount),
                        ],
                      ),
                    ),
                    if (resolvedDateLabel.isNotEmpty) ...[
                      const SizedBox(width: 8),
                      Text(
                        resolvedDateLabel,
                        style: TextStyle(
                          fontSize: 12.sp,
                          fontWeight: FontWeight.w400,
                          color: AppColors.textTertiary,
                        ),
                      ),
                    ],
                  ],
                ),
                if (comment.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    comment,
                    maxLines: _expanded ? null : 2,
                    overflow: _expanded
                        ? TextOverflow.visible
                        : TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 14.sp,
                      fontWeight: FontWeight.w400,
                      height: 1.35,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  if (showReadMore)
                    InkWell(
                      onTap: () => setState(() => _expanded = !_expanded),
                      borderRadius: BorderRadius.circular(4),
                      child: Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              _expanded
                                  ? widget.readLessLabel
                                  : widget.readMoreLabel,
                              style: TextStyle(
                                fontSize: 14.sp,
                                fontWeight: FontWeight.w600,
                                color: AppColors.primary500,
                              ),
                            ),
                            const SizedBox(width: 2),
                            Icon(
                              _expanded
                                  ? Icons.keyboard_arrow_up_rounded
                                  : Icons.keyboard_arrow_down_rounded,
                              size: 18,
                              color: AppColors.primary500,
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ReviewStars extends StatelessWidget {
  const _ReviewStars({required this.count});

  final int count;

  static const _starColor = Color(0xFFFFB800);

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (i) {
        return Icon(
          Icons.star_rounded,
          size: 12,
          color: i < count ? _starColor : AppColors.neutral300,
        );
      }),
    );
  }
}

/// `REVIEWS` + avg rating + see-more link (above the card).
class StudioReviewsSectionHeader extends StatelessWidget {
  const StudioReviewsSectionHeader({
    super.key,
    required this.title,
    required this.seeMoreLabel,
    required this.avgRating,
    required this.reviewCount,
    this.onSeeMore,
  });

  final String title;
  final String seeMoreLabel;
  final double avgRating;
  final int reviewCount;
  final VoidCallback? onSeeMore;

  @override
  Widget build(BuildContext context) {
    final ratingText = avgRating > 0
        ? avgRating.toStringAsFixed(1).replaceAll('.', ',')
        : '—';

    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Text(
          title.toUpperCase(),
          style: TextStyle(
            fontSize: 13.sp,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.4,
            color: AppColors.textPrimary,
          ),
        ),
        if (avgRating > 0) ...[
          const SizedBox(width: 8),
          const Icon(
            Icons.star_rounded,
            size: 14,
            color: Color(0xFFFFB800),
          ),
          const SizedBox(width: 4),
          Text(
            '$ratingText ($reviewCount)',
            style: TextStyle(
              fontSize: 13.sp,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
        ],
        const Spacer(),
        if (onSeeMore != null)
          InkWell(
            onTap: onSeeMore,
            borderRadius: BorderRadius.circular(6),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  seeMoreLabel.toUpperCase(),
                  style: TextStyle(
                    fontSize: 14.sp,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary500,
                  ),
                ),
                const Icon(
                  Icons.chevron_right_rounded,
                  size: 20,
                  color: AppColors.primary500,
                ),
              ],
            ),
          ),
      ],
    );
  }
}
