class ExploreStudioItem {
  const ExploreStudioItem({
    required this.id,
    required this.name,
    required this.address,
    required this.distanceKm,
    required this.rating,
    required this.reviewCount,
    required this.logoUrl,
    required this.lat,
    required this.lng,
    this.trainingCategoryIds = const [],
    this.categoryNames = const [],
  });
  final String id;
  final String name;
  final String address;
  final double? distanceKm;
  final double rating;
  final int reviewCount;
  final String? logoUrl;
  final double? lat;
  final double? lng;
  final List<int> trainingCategoryIds;
  final List<String> categoryNames;
}

class ExploreClassItem {
  const ExploreClassItem({
    required this.sessionId,
    required this.studioId,
    required this.studioName,
    required this.studioAddress,
    required this.startsAt,
    required this.durationMin,
    required this.trainerName,
    required this.className,
    required this.price,
    required this.capacity,
    required this.bookedCount,
    this.displayColorHex,
    required this.rating,
    required this.reviewCount,
    this.trainingCategoryId,
    this.trainingId = '',
    this.endsAt,
    this.locationName,
    this.studioLocationCount = 1,
    this.distanceKm,
  });
  final String sessionId;
  final String studioId;
  final String studioName;
  final String studioAddress;
  final DateTime startsAt;
  final int? durationMin;
  final String trainerName;
  final String className;
  final double? price;
  final int? capacity;
  final int bookedCount;
  final String? displayColorHex;
  final double rating;
  final int reviewCount;
  final int? trainingCategoryId;

  /// Training template id (public schedule `training.id`).
  final String trainingId;
  final DateTime? endsAt;
  final String? locationName;
  final int studioLocationCount;
  final double? distanceKm;
}
