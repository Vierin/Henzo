import 'package:flutter_screenutil/flutter_screenutil.dart';
class PublicStudioPreview {
  const PublicStudioPreview({
    required this.id,
    required this.studioName,
    required this.categories,
    required this.rating,
    required this.address,
    this.distanceKm,
    this.lat,
    this.lng,
    this.photoUrl,
    this.reviewCount = 0,
  });

  final String id;

  /// Studio brand (not a training-location label).
  final String studioName;
  final List<String> categories;
  final double rating;
  final String address;
  final double? distanceKm;
  final double? lat;
  final double? lng;
  final String? photoUrl;
  final int reviewCount;

  /// Back-compat for search / favorites keyed by display name.
  String get name => studioName;

  String get primaryCategory =>
      categories.isNotEmpty ? categories.first : 'Fitness';
}
