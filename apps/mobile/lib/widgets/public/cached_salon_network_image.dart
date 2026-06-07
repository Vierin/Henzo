import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../constants/colors.dart';
import '../../models/studio_photo_asset.dart';

/// Disk-cached cover image for salon photos (cards, lists, detail header).
class CachedSalonNetworkImage extends StatelessWidget {
  const CachedSalonNetworkImage({
    super.key,
    required this.imageUrl,
    this.fit = BoxFit.cover,
    this.alignment = Alignment.center,
    this.width,
    this.height,
    this.borderRadius,
  });

  final String imageUrl;
  final BoxFit fit;
  final Alignment alignment;
  final double? width;
  final double? height;
  final BorderRadius? borderRadius;

  @override
  Widget build(BuildContext context) {
    final child = CachedNetworkImage(
      imageUrl: imageUrl,
      fit: fit,
      alignment: alignment,
      width: width,
      height: height,
      fadeInDuration: const Duration(milliseconds: 180),
      placeholder: (_, _) => Container(
        color: AppColors.secondary100,
        alignment: Alignment.center,
        child: const SizedBox(
          width: 28,
          height: 28,
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
      ),
      errorWidget: (_, _, _) => Container(
        color: AppColors.secondary100,
        alignment: Alignment.center,
        child: const Icon(
          Icons.fitness_center,
          size: 30,
          color: AppColors.primary500,
        ),
      ),
    );

    if (borderRadius != null) {
      return ClipRRect(borderRadius: borderRadius!, child: child);
    }
    return child;
  }
}

/// Cover photo framed by owner crop center (home / browse cards).
class SalonFramedCoverImage extends StatelessWidget {
  const SalonFramedCoverImage({
    super.key,
    required this.imageUrl,
    this.originalUrl,
    this.crop,
    this.studioPageCrop,
    this.width,
    this.height,
  });

  final String imageUrl;
  final String? originalUrl;
  final StudioPhotoCropRect? crop;
  /// Back-compat alias for [crop].
  final StudioPhotoCropRect? studioPageCrop;
  final double? width;
  final double? height;

  @override
  Widget build(BuildContext context) {
    final frameCrop = crop ?? studioPageCrop;
    final original = originalUrl?.trim() ?? '';
    final useOriginal = original.isNotEmpty && frameCrop != null;
    final url = useOriginal ? original : imageUrl;
    final alignment = frameCrop?.coverAlignment ?? Alignment.center;

    return CachedSalonNetworkImage(
      imageUrl: url,
      fit: BoxFit.cover,
      width: width,
      height: height,
      alignment: alignment,
    );
  }
}
