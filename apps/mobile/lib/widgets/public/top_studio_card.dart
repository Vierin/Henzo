import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../models/public_studio_preview.dart';
import '../../services/client_location_store.dart';
import '../../utils/formatters.dart';
import 'cached_salon_network_image.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

class TopStudioCard extends StatelessWidget {
  const TopStudioCard({
    super.key,
    required this.studio,
    required this.isFavorite,
    required this.isFavoriteLoading,
    required this.onToggleFavorite,
    required this.onTap,
    this.homeLayout = false,
  });

  final PublicStudioPreview studio;
  final bool isFavorite;
  final bool isFavoriteLoading;
  final VoidCallback onToggleFavorite;
  final VoidCallback onTap;
  final bool homeLayout;

  String? _distanceLabel(BuildContext context) {
    final loc = context.watch<ClientLocationStore>();
    final km = resolveStudioDistanceKm(
      apiDistanceKm: studio.distanceKm,
      clientLat: loc.lat,
      clientLon: loc.lon,
      studioLat: studio.lat,
      studioLng: studio.lng,
    );
    final label = formatBrowseStudioDistanceLabel(km);
    return label.isEmpty ? null : label;
  }

  @override
  Widget build(BuildContext context) {
    final distanceLabel = _distanceLabel(context);
    if (homeLayout) {
      return _HomeStudioCard(
        studio: studio,
        isFavorite: isFavorite,
        onToggleFavorite: onToggleFavorite,
        onTap: onTap,
        distanceLabel: distanceLabel,
      );
    }

    return _BrowseStudioCard(
      studio: studio,
      isFavorite: isFavorite,
      isFavoriteLoading: isFavoriteLoading,
      onToggleFavorite: onToggleFavorite,
      onTap: onTap,
      distanceLabel: distanceLabel,
    );
  }
}

class _HomeStudioCard extends StatelessWidget {
  const _HomeStudioCard({
    required this.studio,
    required this.isFavorite,
    required this.onToggleFavorite,
    required this.onTap,
    required this.distanceLabel,
  });

  static const _cardWidth = kStudioCoverPhotoWidth;
  static const _cardRadius = 18.0;
  static const _imageHeight = kStudioHomeCardPhotoHeight;
  static const _contentHeight = 54.0;
  static const _distanceColor = Color(0x663F3F3F);

  final PublicStudioPreview studio;
  final bool isFavorite;
  final VoidCallback onToggleFavorite;
  final VoidCallback onTap;
  final String? distanceLabel;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: _cardWidth,
      margin: const EdgeInsets.only(right: 12),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(_cardRadius),
          onTap: onTap,
          child: Ink(
            decoration: BoxDecoration(
              color: AppColors.backgroundPrimary,
              borderRadius: BorderRadius.circular(_cardRadius),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(_cardRadius),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SizedBox(
                    width: _cardWidth,
                    height: _imageHeight,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        if (studio.photoUrl != null &&
                            studio.photoUrl!.isNotEmpty)
                          SalonFramedCoverImage(
                            imageUrl: studio.photoUrl!,
                            originalUrl: studio.photoOriginalUrl,
                            studioPageCrop: studio.studioPageCrop,
                            width: _cardWidth,
                            height: _imageHeight,
                          )
                        else
                          Container(
                            color: AppColors.secondary100,
                            alignment: Alignment.center,
                            child: const Icon(
                              Icons.fitness_center,
                              size: 30,
                              color: AppColors.primary500,
                            ),
                          ),
                        Positioned(
                          right: 9,
                          top: 10,
                          child: Material(
                            color: Colors.transparent,
                            child: InkWell(
                              customBorder: const CircleBorder(),
                              onTap: onToggleFavorite,
                              child: Icon(
                                isFavorite
                                    ? Icons.favorite
                                    : Icons.favorite_border,
                                size: 20,
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
                  Padding(
                    padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
                    child: SizedBox(
                      height: _contentHeight,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            studio.studioName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 14.sp,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                              height: 1.2,
                            ),
                          ),
                          if (studio.categories.isNotEmpty) ...[
                            const SizedBox(height: 6),
                            Text(
                              studio.categories.take(3).join(' • '),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 12.sp,
                                fontWeight: FontWeight.w400,
                                color: AppColors.textSecondary,
                                height: 1.1,
                              ),
                            ),
                          ],
                          const Spacer(),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              if (studio.rating > 0) ...[
                                const Icon(
                                  Icons.star_rounded,
                                  size: 12,
                                  color: Color(0xFFFFB800),
                                ),
                                const SizedBox(width: 2),
                                Text(
                                  studio.rating.toStringAsFixed(1),
                                  style: TextStyle(
                                    fontSize: 11.sp,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.textPrimary,
                                    height: 1.1,
                                  ),
                                ),
                                if (studio.reviewCount > 0)
                                  Text(
                                    ' (${studio.reviewCount})',
                                    style: TextStyle(
                                      fontSize: 11.sp,
                                      fontWeight: FontWeight.w400,
                                      color: AppColors.textSecondary,
                                      height: 1.1,
                                    ),
                                  ),
                              ],
                              const Spacer(),
                              if (distanceLabel != null)
                                Text(
                                  distanceLabel!,
                                  style: TextStyle(
                                    fontSize: 11.sp,
                                    fontWeight: FontWeight.w400,
                                    color: _distanceColor,
                                    height: 1.1,
                                  ),
                                ),
                            ],
                          ),
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
}

class _BrowseStudioCard extends StatelessWidget {
  const _BrowseStudioCard({
    required this.studio,
    required this.isFavorite,
    required this.isFavoriteLoading,
    required this.onToggleFavorite,
    required this.onTap,
    required this.distanceLabel,
  });

  final PublicStudioPreview studio;
  final bool isFavorite;
  final bool isFavoriteLoading;
  final VoidCallback onToggleFavorite;
  final VoidCallback onTap;
  final String? distanceLabel;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 236,
      margin: const EdgeInsets.only(right: 12),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Ink(
            decoration: BoxDecoration(
              color: AppColors.backgroundPrimary,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.borderPrimary),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: double.infinity,
                    height: 118,
                    child: Stack(
                      children: [
                        Positioned.fill(
                          child:
                              studio.photoUrl != null &&
                                  studio.photoUrl!.isNotEmpty
                              ? CachedSalonNetworkImage(
                                  imageUrl: studio.photoUrl!,
                                  fit: BoxFit.cover,
                                )
                              : Container(
                                  color: AppColors.secondary100,
                                  alignment: Alignment.center,
                                  child: const Icon(
                                    Icons.fitness_center,
                                    size: 30,
                                    color: AppColors.primary500,
                                  ),
                                ),
                        ),
                        if (studio.rating > 0)
                          Positioned(
                            left: 8,
                            top: 8,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.55),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Row(
                                children: [
                                  const Icon(
                                    Icons.star_rounded,
                                    size: 15,
                                    color: Color(0xFFFFD24C),
                                  ),
                                  const SizedBox(width: 2),
                                  Text(
                                    studio.rating.toStringAsFixed(1),
                                    style: TextStyle(
                                      fontSize: 12.sp,
                                      fontWeight: FontWeight.w700,
                                      color: Colors.white,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        Positioned(
                          right: 8,
                          top: 8,
                          child: Material(
                            color: Colors.black.withValues(alpha: 0.45),
                            shape: const CircleBorder(),
                            child: InkWell(
                              customBorder: const CircleBorder(),
                              onTap: onToggleFavorite,
                              child: Padding(
                                padding: const EdgeInsets.all(7),
                                child: AnimatedScale(
                                  scale: isFavorite ? 1.12 : 1.0,
                                  duration: const Duration(milliseconds: 180),
                                  curve: Curves.easeOutBack,
                                  child: Icon(
                                    isFavorite
                                        ? Icons.favorite
                                        : Icons.favorite_border,
                                    size: 17,
                                    color: isFavorite
                                        ? const Color(0xFFFF5D7A)
                                        : Colors.white,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                    child: Text(
                      studio.studioName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 19.sp,
                        height: 1.1,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                  if (studio.categories.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: Text(
                        studio.categories.take(3).join(' · '),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 11.sp,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 6),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        if (studio.distanceKm != null) ...[
                          const Icon(
                            Icons.near_me_outlined,
                            size: 13,
                            color: AppColors.textSecondary,
                          ),
                          const SizedBox(width: 3),
                          Text(
                            distanceLabel ?? '',
                            style: TextStyle(
                              fontSize: 12.sp,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          Text(
                            '  •  ',
                            style: TextStyle(
                              fontSize: 12.sp,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                        Expanded(
                          child: Text(
                            studio.address,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            softWrap: false,
                            style: TextStyle(
                              fontSize: 12.sp,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ),
                      ],
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
}
