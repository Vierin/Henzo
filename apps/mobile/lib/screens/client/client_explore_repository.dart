import '../../models/studio_photo_asset.dart';
import '../../services/api_client.dart';
import '../../services/cache/client_nearby_cache.dart';
import '../../utils/formatters.dart';
import '../../utils/nearby_payload.dart';
import '../../utils/studio_photo_urls.dart';
import 'client_explore_models.dart';

class ClientExploreRepository {
  const ClientExploreRepository._();

  static Future<List<ExploreStudioItem>> loadStudiosNearby({
    required double lat,
    required double lon,
    required int radiusKm,
  }) async {
    final nearbyQuery =
        StringBuffer('/studios/nearby?limit=50&radius=$radiusKm')
          ..write('&lat=')
          ..write(lat.toStringAsFixed(6))
          ..write('&lng=')
          ..write(lon.toStringAsFixed(6));
    final nearbyPath = nearbyQuery.toString();
    var nearbyRaw = ClientNearbyCache.get(nearbyPath);
    if (nearbyRaw == null) {
      nearbyRaw = await ApiClient.get(nearbyPath, null);
      ClientNearbyCache.put(nearbyPath, nearbyRaw);
    }
    final nearbyList = extractStudiosListFromNearby(nearbyRaw);

    final studios = <ExploreStudioItem>[];
    for (final item in nearbyList) {
      if (item is! Map) continue;
      final map = Map<String, dynamic>.from(item);
      final id = (map['id'] ?? '').toString();
      if (id.isEmpty) continue;
      final reviews = map['Review'] is List ? map['Review'] as List : const [];
      final reviewCount = reviews.length;
      final avgRating = reviewCount > 0
          ? reviews
                    .whereType<Map>()
                    .map((r) => (r['rating'] as num?)?.toDouble() ?? 0)
                    .fold<double>(0, (a, b) => a + b) /
                reviewCount
          : ((map['avgRating'] as num?)?.toDouble() ?? 0);

      final trainingCategoryIds = <int>[];
      final rawCatIds = map['trainingCategoryIds'];
      if (rawCatIds is List) {
        for (final e in rawCatIds) {
          if (e is num) trainingCategoryIds.add(e.toInt());
        }
      }
      final categoryNames = <String>[];
      final rawCats = map['categories'];
      if (rawCats is List) {
        for (final e in rawCats) {
          final s = e.toString().trim();
          if (s.isNotEmpty) categoryNames.add(s);
        }
      }
      final photos = map['photos'];
      final gallery = StudioPhotoAsset.listFromJson(map['photoGallery']);
      final galleryOrNull = gallery.isEmpty ? null : gallery;
      final legacyPhotos = photos is List
          ? photos.map((e) => e?.toString() ?? '').toList()
          : null;
      final photoUrl = studioBrowsePhotoUrl(
        gallery: galleryOrNull,
        photos: legacyPhotos,
      );
      final firstAsset = galleryOrNull?.first;
      final photoOriginalUrl = firstAsset?.originalUrl.trim();

      studios.add(
        ExploreStudioItem(
          id: id,
          name: (map['name'] ?? 'Studio').toString(),
          address: (map['address'] ?? '').toString(),
          locationName: (map['locationName'] ?? '').toString().trim().isEmpty
              ? null
              : (map['locationName'] ?? '').toString().trim(),
          distanceKm: (map['distance'] as num?)?.toDouble(),
          rating: avgRating,
          reviewCount: reviewCount,
          photoUrl: photoUrl,
          photoOriginalUrl:
              photoOriginalUrl != null && photoOriginalUrl.isNotEmpty
              ? photoOriginalUrl
              : null,
          studioPageCrop: firstAsset?.crops.studioPage,
          browseCardCrop: firstAsset?.crops.browseCard,
          logoUrl:
              (map['logoUrl'] ??
                      map['logo'] ??
                      map['brandLogoUrl'] ??
                      map['avatarUrl'])
                  ?.toString(),
          lat:
              (map['lat'] as num?)?.toDouble() ??
              (map['latitude'] as num?)?.toDouble(),
          lng:
              (map['lng'] as num?)?.toDouble() ??
              (map['lon'] as num?)?.toDouble() ??
              (map['longitude'] as num?)?.toDouble(),
          trainingCategoryIds: trainingCategoryIds,
          categoryNames: categoryNames,
        ),
      );
    }
    return studios;
  }

  static Future<List<ExploreClassItem>> loadStudioClasses({
    required ExploreStudioItem studio,
    required String fromQuery,
    required String toQuery,
    required String defaultClassName,
  }) async {
    try {
      final raw = await ApiClient.get(
        '/studios/${studio.id}/schedule?from=$fromQuery&to=$toQuery&limit=500',
        null,
      );
      if (raw is! List) return const [];
      final out = <ExploreClassItem>[];
      for (final row in raw) {
        if (row is! Map) continue;
        final map = Map<String, dynamic>.from(row);
        final training = map['training'] is Map
            ? Map<String, dynamic>.from(map['training'] as Map)
            : <String, dynamic>{};
        final studioBlock = map['studio'] is Map
            ? Map<String, dynamic>.from(map['studio'] as Map)
            : <String, dynamic>{};
        final studioLocationCount =
            (studioBlock['locationCount'] as num?)?.toInt() ?? 1;
        final endsAt = parseApiDateTime(map['endsAt']);
        final locationName = map['locationName']?.toString();
        final startsAt = parseApiDateTime(map['startsAt']);
        if (startsAt == null) continue;
        final trainingCategoryId = training['trainingCategoryId'] == null
            ? null
            : (training['trainingCategoryId'] as num).toInt();
        out.add(
          ExploreClassItem(
            sessionId: (map['id'] ?? '').toString(),
            studioId: studio.id,
            studioName: studio.name,
            studioAddress: studio.address,
            startsAt: startsAt,
            durationMin: (training['duration'] as num?)?.toInt(),
            trainerName: map['trainer'] is Map
                ? () {
                    final trainer = Map<String, dynamic>.from(
                      map['trainer'] as Map,
                    );
                    final user = trainer['User'] ?? trainer['user'];
                    final fromUser = user is Map
                        ? (user['name'] ?? '').toString().trim()
                        : '';
                    final fromTrainer = (trainer['name'] ?? '')
                        .toString()
                        .trim();
                    return fromUser.isNotEmpty ? fromUser : fromTrainer;
                  }()
                : '',
            className: (training['name'] ?? defaultClassName).toString(),
            price: (training['price'] as num?)?.toDouble(),
            capacity: (map['capacity'] as num?)?.toInt(),
            bookedCount: (map['bookedCount'] as num?)?.toInt() ?? 0,
            displayColorHex: training['displayColor']?.toString(),
            rating: studio.rating,
            reviewCount: studio.reviewCount,
            trainingCategoryId: trainingCategoryId,
            language: (training['language'] ?? '').toString().trim().isEmpty
                ? null
                : (training['language'] ?? '').toString().trim().toLowerCase(),
            trainingId: (training['id'] ?? '').toString(),
            endsAt: endsAt,
            locationName: locationName,
            studioLocationCount: studioLocationCount,
            distanceKm: studio.distanceKm,
            currency: (studioBlock['currency'] ?? map['currency'])?.toString() ?? 'EUR',
          ),
        );
      }
      return out;
    } catch (_) {
      return const [];
    }
  }
}
