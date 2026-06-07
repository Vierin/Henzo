import '../models/studio_photo_asset.dart';

/// Cover image for browse/list cards (card crop when available).
String? studioBrowsePhotoUrl({
  List<StudioPhotoAsset>? gallery,
  List<String>? photos,
}) {
  final first = gallery != null && gallery.isNotEmpty ? gallery.first : null;
  final card = first?.cardUrl.trim();
  if (card != null && card.isNotEmpty) return card;
  final hero = first?.heroUrl.trim();
  if (hero != null && hero.isNotEmpty) return hero;
  if (photos != null && photos.isNotEmpty) {
    final legacy = photos.first.trim();
    if (legacy.isNotEmpty) return legacy;
  }
  return null;
}

/// Hero carousel / studio page photos.
List<String> studioHeroPhotoUrls({
  List<StudioPhotoAsset>? gallery,
  List<String>? photos,
}) {
  if (gallery != null && gallery.isNotEmpty) {
    return gallery
        .map((asset) => asset.heroUrl.trim())
        .where((url) => url.isNotEmpty)
        .toList();
  }
  if (photos == null) return <String>[];
  return photos.map((url) => url.trim()).where((url) => url.isNotEmpty).toList();
}

List<StudioPhotoAsset> studioPhotoGalleryFromPayload({
  Object? photoGallery,
  List<String>? photos,
}) {
  final parsed = StudioPhotoAsset.listFromJson(photoGallery);
  if (parsed.isNotEmpty) return parsed;
  if (photos == null) return <StudioPhotoAsset>[];
  return photos
      .map((url) => url.trim())
      .where((url) => url.isNotEmpty)
      .map(StudioPhotoAsset.legacy)
      .toList();
}
