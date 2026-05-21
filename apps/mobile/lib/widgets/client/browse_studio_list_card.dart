import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../constants/colors.dart';
import '../../screens/client/client_explore_models.dart';
import '../../utils/formatters.dart';
import '../public/cached_salon_network_image.dart';

/// Studio row on client Browse (Studios tab).
class BrowseStudioListCard extends StatelessWidget {
  const BrowseStudioListCard({
    super.key,
    required this.studio,
    required this.todayClasses,
    required this.distanceLabel,
    required this.isFavorite,
    required this.onTap,
    required this.onToggleFavorite,
    this.onClassTap,
  });

  static const _cardRadius = 16.0;
  static const _imageWidth = 108.0;
  static const _distanceColor = Color(0x663F3F3F);
  static const _locationBlue = Color(0xFF4D39A8);

  final ExploreStudioItem studio;
  final List<ExploreClassItem> todayClasses;
  final String? distanceLabel;
  final bool isFavorite;
  final VoidCallback onTap;
  final VoidCallback onToggleFavorite;
  final void Function(ExploreClassItem item)? onClassTap;

  String? get _imageUrl {
    final photo = studio.photoUrl?.trim();
    if (photo != null && photo.isNotEmpty) return photo;
    final logo = studio.logoUrl?.trim();
    if (logo != null && logo.isNotEmpty) return logo;
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final showCount = todayClasses.length > 3 ? 3 : todayClasses.length;
    final moreCount = todayClasses.length - showCount;

    return Material(
      color: AppColors.backgroundPrimary,
      borderRadius: BorderRadius.circular(_cardRadius),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Stack(
          children: [
            IntrinsicHeight(
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
                          ColoredBox(
                            color: AppColors.secondary100,
                            child: const Icon(
                              Icons.fitness_center,
                              size: 32,
                              color: AppColors.primary500,
                            ),
                          ),
                        Positioned(
                          left: 8,
                          top: 8,
                          child: Material(
                            color: Colors.transparent,
                            child: InkWell(
                              customBorder: const CircleBorder(),
                              onTap: onToggleFavorite,
                              child: Icon(
                                isFavorite
                                    ? Icons.favorite
                                    : Icons.favorite_border,
                                size: 22,
                                color: isFavorite
                                    ? const Color(0xFFFF5D7A)
                                    : Colors.white,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Padding(
                            padding: EdgeInsets.only(
                              right: studio.rating > 0 ? 72 : 0,
                            ),
                            child: Text(
                              studio.name,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                                height: 1.15,
                              ),
                            ),
                          ),
                          if (studio.address.trim().isNotEmpty) ...[
                            const SizedBox(height: 6),
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Padding(
                                  padding: const EdgeInsets.only(top: 1),
                                  child: SvgPicture.asset(
                                    'assets/icons/icon-pin.svg',
                                    width: 10,
                                    height: 14,
                                    colorFilter: const ColorFilter.mode(
                                      _locationBlue,
                                      BlendMode.srcIn,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 4),
                                Expanded(
                                  child: Text(
                                    studio.address.trim(),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w400,
                                      color: AppColors.textSecondary,
                                      height: 1.2,
                                    ),
                                  ),
                                ),
                                if (distanceLabel != null) ...[
                                  const SizedBox(width: 8),
                                  Text(
                                    distanceLabel!,
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w400,
                                      color: _distanceColor,
                                      height: 1.1,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ] else if (distanceLabel != null) ...[
                            const SizedBox(height: 6),
                            Align(
                              alignment: Alignment.centerRight,
                              child: Text(
                                distanceLabel!,
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w400,
                                  color: _distanceColor,
                                  height: 1.1,
                                ),
                              ),
                            ),
                          ],
                          if (studio.categoryNames.isNotEmpty) ...[
                            const SizedBox(height: 6),
                            Text(
                              studio.categoryNames.take(3).join(' • '),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w400,
                                color: AppColors.textSecondary,
                                height: 1.1,
                              ),
                            ),
                          ],
                          const SizedBox(height: 10),
                          if (todayClasses.isEmpty)
                            const Text(
                              'No classes today',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppColors.textSecondary,
                              ),
                            )
                          else
                            Row(
                              children: [
                                for (var i = 0; i < showCount; i++) ...[
                                  if (i > 0) const SizedBox(width: 7),
                                  _ClassSlot(
                                    item: todayClasses[i],
                                    onTap: onClassTap == null
                                        ? null
                                        : () => onClassTap!(todayClasses[i]),
                                  ),
                                ],
                                if (moreCount > 0) ...[
                                  const SizedBox(width: 7),
                                  _MoreClassesSlot(count: moreCount),
                                ],
                              ],
                            ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            if (studio.rating > 0)
              Positioned(
                top: 10,
                right: 10,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.star_rounded,
                      size: 14,
                      color: Color(0xFFFFB800),
                    ),
                    const SizedBox(width: 2),
                    Text(
                      studio.rating.toStringAsFixed(1),
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                        height: 1.1,
                      ),
                    ),
                    if (studio.reviewCount > 0)
                      Text(
                        ' (${studio.reviewCount})',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w400,
                          color: AppColors.textSecondary,
                          height: 1.1,
                        ),
                      ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _ClassSlot extends StatelessWidget {
  const _ClassSlot({required this.item, this.onTap});

  final ExploreClassItem item;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.backgroundSecondary,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                formatTime24(item.startsAt),
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary500,
                  height: 1.1,
                ),
              ),
              const SizedBox(height: 2),
              SizedBox(
                width: 72,
                child: Text(
                  item.className,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textPrimary,
                    height: 1.1,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MoreClassesSlot extends StatelessWidget {
  const _MoreClassesSlot({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.backgroundSecondary,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '+$count',
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.primary500,
              height: 1.1,
            ),
          ),
          const SizedBox(height: 2),
          const Text(
            'more',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: AppColors.textPrimary,
              height: 1.1,
            ),
          ),
        ],
      ),
    );
  }
}
