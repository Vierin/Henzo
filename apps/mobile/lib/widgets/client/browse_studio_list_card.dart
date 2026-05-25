import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../models/training_category_option.dart';
import '../../screens/client/client_explore_models.dart';
import '../../utils/formatters.dart';
import '../public/cached_salon_network_image.dart';

/// Studio row on client Browse (Studios tab) — horizontal card per design.
class BrowseStudioListCard extends StatelessWidget {
  const BrowseStudioListCard({
    super.key,
    required this.studio,
    required this.todayClasses,
    required this.distanceLabel,
    required this.isFavorite,
    required this.trainingCategories,
    required this.onTap,
    required this.onToggleFavorite,
    this.onClassTap,
  });

  static const _cardRadius = 12.0;
  static const _imageWidth = 121.0;
  static const _cardMinHeight = 145.0;
  static const _todaySlotHeight = 44.0;
  static const _distanceColor = Color(0x993F3F3F);
  static const _locationPurple = Color(0xFF4D39A8);
  static const _classSlotBg = Color(0xFFF8F3EB);
  static const _reviewCountColor = Color(0x993F3F3F);

  final ExploreStudioItem studio;
  final List<ExploreClassItem> todayClasses;
  final String? distanceLabel;
  final bool isFavorite;
  final List<TrainingCategoryOption> trainingCategories;
  final VoidCallback onTap;
  final VoidCallback onToggleFavorite;
  final void Function(ExploreClassItem item)? onClassTap;

  String? get _locationLabel {
    final fromStudio = studio.locationName?.trim();
    if (fromStudio != null && fromStudio.isNotEmpty) return fromStudio;
    for (final c in todayClasses) {
      final n = c.locationName?.trim();
      if (n != null && n.isNotEmpty) return n;
    }
    return null;
  }

  String? get _imageUrl {
    final photo = studio.photoUrl?.trim();
    if (photo != null && photo.isNotEmpty) return photo;
    final logo = studio.logoUrl?.trim();
    if (logo != null && logo.isNotEmpty) return logo;
    return null;
  }

  TrainingCategoryOption? _categoryById(int id) {
    for (final c in trainingCategories) {
      if (c.id == id) return c;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final localeCode = context.watch<LocaleProvider>().localeCode;
    final seeAllLabel = context.watch<LocaleProvider>().t('clientHome.seeAll');
    final firstClass = todayClasses.isNotEmpty ? todayClasses.first : null;
    final categoryIds = studio.trainingCategoryIds;
    final visibleCategoryIds = categoryIds.take(3).toList();
    final moreCategories = categoryIds.length - visibleCategoryIds.length;
    final fallbackNames = studio.categoryNames.take(3).toList();

    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(_cardRadius),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(_cardRadius),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: _cardMinHeight),
            child: IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SizedBox(
                    width: _imageWidth,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        if (_imageUrl != null)
                          CachedSalonNetworkImage(
                            imageUrl: _imageUrl!,
                            fit: BoxFit.cover,
                          )
                        else
                          const ColoredBox(
                            color: AppColors.secondary100,
                            child: Icon(
                              Icons.fitness_center,
                              size: 32,
                              color: AppColors.primary500,
                            ),
                          ),
                        Positioned(
                          left: 8,
                          bottom: 8,
                          child: _FavoriteButton(
                            isFavorite: isFavorite,
                            onTap: onToggleFavorite,
                          ),
                        ),
                        if (studio.rating > 0)
                          Positioned(
                            right: 6,
                            bottom: 8,
                            child: _ImageRatingBadge(
                              rating: studio.rating,
                              reviewCount: studio.reviewCount,
                            ),
                          ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(8, 10, 8, 4),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Text(
                                  studio.name,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: -0.3,
                                    color: AppColors.textPrimary,
                                    height: 1.15,
                                  ),
                                ),
                              ),
                              if (distanceLabel != null &&
                                  distanceLabel!.isNotEmpty) ...[
                                const SizedBox(width: 8),
                                Text(
                                  distanceLabel!,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w400,
                                    letterSpacing: -0.3,
                                    color: _distanceColor,
                                    height: 1.1,
                                  ),
                                ),
                              ],
                            ],
                          ),
                          if (_locationLabel != null) ...[
                            const SizedBox(height: 6),
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Padding(
                                  padding: const EdgeInsets.only(top: 1),
                                  child: SvgPicture.asset(
                                    'assets/icons/icon-pin.svg',
                                    width: 8,
                                    height: 11,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                Expanded(
                                  child: Text(
                                    _locationLabel!,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w400,
                                      letterSpacing: -0.3,
                                      color: AppColors.textPrimary,
                                      height: 1.2,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                          if (visibleCategoryIds.isNotEmpty ||
                              moreCategories > 0 ||
                              fallbackNames.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 6,
                              runSpacing: 6,
                              children: [
                                if (visibleCategoryIds.isNotEmpty)
                                  for (final id in visibleCategoryIds)
                                    _CategoryPill(
                                      label:
                                          _categoryById(
                                            id,
                                          )?.label(localeCode) ??
                                          _fallbackCategoryName(id),
                                      category: _categoryById(id),
                                    )
                                else
                                  for (final name in fallbackNames)
                                    _CategoryPill(label: name, category: null),
                                if (moreCategories > 0)
                                  _MoreCategoriesPill(count: moreCategories)
                                else if (visibleCategoryIds.isEmpty &&
                                    studio.categoryNames.length > 3)
                                  _MoreCategoriesPill(
                                    count: studio.categoryNames.length - 3,
                                  ),
                              ],
                            ),
                          ],
                          const SizedBox(height: 10),
                          SizedBox(
                            height: _todaySlotHeight,
                            child: firstClass != null
                                ? _TodayClassRow(
                                    item: firstClass,
                                    onTap: onClassTap == null
                                        ? null
                                        : () => onClassTap!(firstClass),
                                  )
                                : const Align(
                                    alignment: Alignment.center,
                                    child: Text(
                                      'No classes today',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                  ),
                          ),
                          if (firstClass != null) ...[
                            const SizedBox(height: 4),
                            Center(
                              child: InkWell(
                                onTap: onTap,
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 6,
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        seeAllLabel,
                                        style: const TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w500,
                                          letterSpacing: -0.3,
                                          color: AppColors.primary500,
                                        ),
                                      ),
                                      const Icon(
                                        Icons.keyboard_arrow_down_rounded,
                                        size: 16,
                                        color: AppColors.primary500,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  String _fallbackCategoryName(int id) {
    final idx = studio.trainingCategoryIds.indexOf(id);
    if (idx >= 0 && idx < studio.categoryNames.length) {
      return studio.categoryNames[idx];
    }
    return 'Category';
  }
}

class _FavoriteButton extends StatelessWidget {
  const _FavoriteButton({required this.isFavorite, required this.onTap});

  final bool isFavorite;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: Icon(
          isFavorite ? Icons.favorite : Icons.favorite_border,
          size: 20,
          color: isFavorite ? const Color(0xFFFF5D7A) : const Color(0xFFFF5D7A),
        ),
      ),
    );
  }
}

class _ImageRatingBadge extends StatelessWidget {
  const _ImageRatingBadge({required this.rating, required this.reviewCount});

  final double rating;
  final int reviewCount;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.star_rounded, size: 14, color: Color(0xFFFFB800)),
          const SizedBox(width: 2),
          Text(
            rating.toStringAsFixed(1).replaceAll('.', ','),
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.3,
              color: AppColors.textPrimary,
              height: 1,
            ),
          ),
          if (reviewCount > 0)
            Text(
              ' ($reviewCount)',
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w400,
                letterSpacing: -0.3,
                color: BrowseStudioListCard._reviewCountColor,
                height: 1,
              ),
            ),
        ],
      ),
    );
  }
}

class _CategoryPill extends StatelessWidget {
  const _CategoryPill({required this.label, this.category});

  final String label;
  final TrainingCategoryOption? category;

  @override
  Widget build(BuildContext context) {
    final cat = category;
    final Color bg;
    final Color fg;
    if (cat == null || cat.isOtherCategory) {
      bg = AppColors.backgroundPrimary;
      fg = AppColors.textPrimary;
    } else {
      bg = cat.backgroundColor(AppColors.neutral500);
      fg = cat.foregroundColorOn(bg);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
        border: cat == null || cat.isOtherCategory
            ? Border.all(color: AppColors.primary300, width: 1)
            : null,
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.2,
          color: fg,
          height: 1.1,
        ),
      ),
    );
  }
}

class _MoreCategoriesPill extends StatelessWidget {
  const _MoreCategoriesPill({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppColors.primary500, width: 1),
      ),
      child: Text(
        '+$count other',
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.2,
          color: AppColors.textPrimary,
          height: 1.1,
        ),
      ),
    );
  }
}

class _TodayClassRow extends StatelessWidget {
  const _TodayClassRow({required this.item, this.onTap});

  final ExploreClassItem item;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final price = formatCompactVndLabel(item.price);

    return Material(
      color: BrowseStudioListCard._classSlotBg,
      borderRadius: BorderRadius.circular(7),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(7),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 7),
          child: Row(
            children: [
              Text(
                formatTime24(item.startsAt),
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.3,
                  color: AppColors.primary500,
                  height: 1.1,
                ),
              ),
              const SizedBox(width: 5),
              Expanded(
                child: Text(
                  item.className,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    letterSpacing: -0.3,
                    color: AppColors.textPrimary,
                    height: 1.1,
                  ),
                ),
              ),
              if (price.isNotEmpty) ...[
                const SizedBox(width: 8),
                Text(
                  price,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    letterSpacing: -0.3,
                    color: AppColors.textPrimary,
                    height: 1.1,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
