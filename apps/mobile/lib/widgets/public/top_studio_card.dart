import 'package:flutter/material.dart';

import '../../constants/colors.dart';
import '../../models/public_studio_preview.dart';
import 'cached_salon_network_image.dart';

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

  String? get _distanceLabel {
    final km = studio.distanceKm;
    if (km == null) return null;
    if (homeLayout) {
      final mi = km * 0.621371;
      return '${mi.toStringAsFixed(1)} mi';
    }
    return '${km.toStringAsFixed(1)} km';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: homeLayout ? 268 : 244,
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
                        if (!homeLayout && studio.rating > 0)
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
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: Colors.white,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        if (homeLayout)
                          Positioned(
                            left: 10,
                            bottom: 10,
                            child: Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: AppColors.backgroundPrimary,
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: Colors.white,
                                  width: 2,
                                ),
                              ),
                              child: ClipOval(
                                child:
                                    studio.photoUrl != null &&
                                        studio.photoUrl!.isNotEmpty
                                    ? CachedSalonNetworkImage(
                                        imageUrl: studio.photoUrl!,
                                        fit: BoxFit.cover,
                                      )
                                    : const Icon(
                                        Icons.fitness_center,
                                        size: 18,
                                        color: AppColors.primary500,
                                      ),
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
                      studio.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 19,
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
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 6),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
                    child: homeLayout
                        ? Row(
                            children: [
                              if (studio.rating > 0) ...[
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
                                  ),
                                ),
                                if (studio.reviewCount > 0)
                                  Text(
                                    ' (${studio.reviewCount})',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                              ],
                              const Spacer(),
                              if (_distanceLabel != null)
                                Text(
                                  _distanceLabel!,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                            ],
                          )
                        : Row(
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
                                  '${studio.distanceKm!.toStringAsFixed(1)} km',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                const Text(
                                  '  •  ',
                                  style: TextStyle(
                                    fontSize: 12,
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
                                  style: const TextStyle(
                                    fontSize: 12,
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
