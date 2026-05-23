import '../models/public_studio_preview.dart';

/// Normalizes various `/studios/nearby` JSON shapes to a raw studio list.
List<dynamic> extractStudiosListFromNearby(dynamic raw) {
  if (raw is List) return raw;
  if (raw is Map) {
    final data = raw['data'];
    if (data is List) return data;
    if (data is Map && data['items'] is List) {
      return data['items'] as List<dynamic>;
    }
    if (raw['items'] is List) return raw['items'] as List<dynamic>;
    if (raw['results'] is List) return raw['results'] as List<dynamic>;
    if (raw['studios'] is List) return raw['studios'] as List<dynamic>;
  }
  return const <dynamic>[];
}

PublicStudioPreview parsePublicStudioPreviewFromNearby(
  Map<String, dynamic> data,
) {
  final categories = data['categories'];
  final parsedCategories = categories is List
      ? categories
            .where((c) => c != null)
            .map((c) => c.toString().trim())
            .where((c) => c.isNotEmpty)
            .toList()
      : <String>[];
  final rating = (data['avgRating'] as num?)?.toDouble() ?? 0;
  final address = (data['address'] ?? '').toString();
  final distanceKm = (data['distance'] as num?)?.toDouble();
  final photos = data['photos'];
  final photoUrl = photos is List && photos.isNotEmpty
      ? photos.first?.toString()
      : null;
  final studioName = (data['studioName'] ?? data['name'] ?? 'Studio')
      .toString()
      .trim();

  var reviewCount = (data['reviewCount'] as num?)?.toInt() ?? 0;
  if (reviewCount == 0 && data['_count'] is Map) {
    final count = Map<String, dynamic>.from(data['_count'] as Map);
    reviewCount =
        (count['Review'] as num?)?.toInt() ??
        (count['reviews'] as num?)?.toInt() ??
        reviewCount;
  }
  if (reviewCount == 0 && data['Review'] is List) {
    reviewCount = (data['Review'] as List).length;
  }

  return PublicStudioPreview(
    id: (data['id'] ?? '').toString(),
    studioName: studioName.isNotEmpty ? studioName : 'Studio',
    categories: parsedCategories,
    rating: rating,
    address: address.isNotEmpty ? address : '—',
    distanceKm: distanceKm,
    photoUrl: photoUrl,
    reviewCount: reviewCount,
  );
}
