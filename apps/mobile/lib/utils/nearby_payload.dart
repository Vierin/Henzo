import '../models/public_studio_preview.dart';
import '../models/studio_photo_asset.dart';
import '../models/training_category_option.dart';
import 'studio_photo_urls.dart';

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

/// Resolves studio category labels from API / favorites payload.
List<String> extractStudioCategoryLabels(
  Map<String, dynamic> data, {
  String localeCode = 'en',
  List<TrainingCategoryOption>? categoryOptions,
}) {
  final out = <String>[];

  void addUnique(String label) {
    final t = label.trim();
    if (t.isEmpty || out.contains(t)) return;
    out.add(t);
  }

  String? labelFromMap(Map<String, dynamic> m) {
    switch (localeCode) {
      case 'vi':
        final vn = (m['nameVn'] ?? m['name_vn'] ?? '').toString().trim();
        if (vn.isNotEmpty) return vn;
      case 'ru':
        final ru = (m['nameRu'] ?? m['name_ru'] ?? '').toString().trim();
        if (ru.isNotEmpty) return ru;
    }
    for (final key in ['nameEn', 'name_en', 'name', 'label']) {
      final v = m[key]?.toString().trim() ?? '';
      if (v.isNotEmpty) return v;
    }
    return null;
  }

  bool isCategoryId(dynamic c) {
    if (c is num) return true;
    return RegExp(r'^\d+$').hasMatch(c.toString().trim());
  }

  for (final field in ['categoryNames', 'categories']) {
    final raw = data[field];
    if (raw is! List) continue;
    for (final c in raw) {
      if (c is Map) {
        final label = labelFromMap(Map<String, dynamic>.from(c));
        if (label != null) addUnique(label);
      } else if (!isCategoryId(c)) {
        addUnique(c.toString());
      }
    }
  }

  final ids = <int>{};
  void addId(dynamic raw) {
    if (raw is num) {
      ids.add(raw.toInt());
    } else if (raw is String && isCategoryId(raw)) {
      ids.add(int.parse(raw.trim()));
    }
  }

  for (final field in ['trainingCategoryIds', 'categoryIds', 'categories']) {
    final raw = data[field];
    if (raw is! List) continue;
    for (final e in raw) {
      addId(e);
    }
  }

  for (final listKey in ['Training', 'training', 'services', 'Service']) {
    final raw = data[listKey];
    if (raw is! List) continue;
    for (final item in raw) {
      if (item is! Map) continue;
      final m = Map<String, dynamic>.from(item);
      final tc = m['trainingCategory'] ?? m['training_category'];
      if (tc is Map) {
        final label = labelFromMap(Map<String, dynamic>.from(tc));
        if (label != null) addUnique(label);
      }
      addId(m['trainingCategoryId'] ?? m['training_category_id']);
    }
  }

  if (categoryOptions != null && categoryOptions.isNotEmpty) {
    for (final id in ids) {
      for (final opt in categoryOptions) {
        if (opt.id == id) {
          addUnique(opt.label(localeCode));
          break;
        }
      }
    }
  }

  return out;
}

PublicStudioPreview parsePublicStudioPreviewFromNearby(
  Map<String, dynamic> data, {
  String localeCode = 'en',
  List<TrainingCategoryOption>? categoryOptions,
}) {
  final parsedCategories = extractStudioCategoryLabels(
    data,
    localeCode: localeCode,
    categoryOptions: categoryOptions,
  );
  final rating =
      (data['avgRating'] as num?)?.toDouble() ??
      (data['averageRating'] as num?)?.toDouble() ??
      0;
  final address = (data['address'] ?? '').toString();
  final distanceKm = (data['distance'] as num?)?.toDouble();
  final photos = data['photos'];
  final gallery = StudioPhotoAsset.listFromJson(data['photoGallery']);
  final photoUrl = studioBrowsePhotoUrl(
    gallery: gallery.isEmpty ? null : gallery,
    photos: photos is List
        ? photos.map((e) => e?.toString() ?? '').toList()
        : null,
  );
  final studioName = (data['studioName'] ?? data['name'] ?? 'Studio')
      .toString()
      .trim();

  var reviewCount =
      (data['reviewCount'] as num?)?.toInt() ??
      (data['review_count'] as num?)?.toInt() ??
      0;
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

  final lat =
      (data['lat'] as num?)?.toDouble() ??
      (data['latitude'] as num?)?.toDouble();
  final lng =
      (data['lng'] as num?)?.toDouble() ??
      (data['lon'] as num?)?.toDouble() ??
      (data['longitude'] as num?)?.toDouble();

  return PublicStudioPreview(
    id: (data['id'] ?? '').toString(),
    studioName: studioName.isNotEmpty ? studioName : 'Studio',
    categories: parsedCategories,
    rating: rating,
    address: address.isNotEmpty ? address : '—',
    distanceKm: distanceKm,
    lat: lat,
    lng: lng,
    photoUrl: photoUrl,
    reviewCount: reviewCount,
  );
}
