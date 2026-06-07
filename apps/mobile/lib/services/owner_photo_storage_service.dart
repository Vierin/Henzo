import 'package:flutter/foundation.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/app_config.dart';

/// Upload owner images to the studio-photos Supabase bucket (`owners/{userId}/…`).
class OwnerPhotoStorageService {
  OwnerPhotoStorageService._();

  static const int maxPhotoBytes = 3 * 1024 * 1024;

  /// Raw file size limit before resize/compress (see [convertXFileToWebp]).
  static const int maxSourcePhotoBytes = maxPhotoBytes * 8;

  static int get maxSourcePhotoMb => maxSourcePhotoBytes ~/ (1024 * 1024);

  /// Profile avatar in lists / hero cards.
  static const int avatarMaxEdge = 512;

  /// Studio gallery cards.
  static const int galleryMaxEdge = 1200;

  /// Uncropped gallery source kept for re-adjust.
  static const int galleryOriginalMaxEdge = 2400;

  static String get bucket {
    final configured = AppConfig.studioPhotosBucket.trim();
    return configured.isEmpty ? 'studio-photos' : configured;
  }

  /// Must match Supabase RLS (`owners/{auth.uid()}/…`).
  static String? get authenticatedOwnerId =>
      Supabase.instance.client.auth.currentUser?.id;

  static String ownerStoragePath(String fileName) {
    final uid = authenticatedOwnerId;
    if (uid == null || uid.isEmpty) {
      throw StateError('No Supabase auth user for storage upload');
    }
    return 'owners/$uid/$fileName';
  }

  /// Resize longest edge to [maxEdge], encode WebP, cap at [maxBytes].
  static Future<Uint8List?> convertBytesToWebp(
    Uint8List bytes, {
    int maxBytes = maxPhotoBytes,
    int maxEdge = galleryMaxEdge,
    int quality = 82,
  }) async {
    if (bytes.length > maxSourcePhotoBytes) return null;

    final fromBytes = await FlutterImageCompress.compressWithList(
      bytes,
      minWidth: maxEdge,
      minHeight: maxEdge,
      quality: quality,
      format: CompressFormat.webp,
      keepExif: false,
    );
    if (fromBytes.isEmpty) return null;
    var webp = Uint8List.fromList(fromBytes);

    if (webp.length > maxBytes && quality > 60) {
      return convertBytesToWebp(
        bytes,
        maxBytes: maxBytes,
        maxEdge: maxEdge,
        quality: quality - 15,
      );
    }

    if (webp.length > maxBytes) return null;

    if (kDebugMode) {
      debugPrint(
        '[OwnerPhotoStorage] ${(bytes.length / 1024).toStringAsFixed(0)} KB → '
        '${(webp.length / 1024).toStringAsFixed(0)} KB webp '
        '(edge≤$maxEdge, q$quality)',
      );
    }

    return webp;
  }

  /// Resize longest edge to [maxEdge], encode WebP, cap at [maxBytes].
  static Future<Uint8List?> convertXFileToWebp(
    XFile file, {
    int maxBytes = maxPhotoBytes,
    int maxEdge = galleryMaxEdge,
    int quality = 82,
  }) async {
    final path = file.path.trim();
    Uint8List? webp;

    if (path.isNotEmpty) {
      final fromFile = await FlutterImageCompress.compressWithFile(
        path,
        minWidth: maxEdge,
        minHeight: maxEdge,
        quality: quality,
        format: CompressFormat.webp,
        keepExif: false,
      );
      if (fromFile != null && fromFile.isNotEmpty) {
        webp = fromFile;
      }
    }

    if (webp == null) {
      final original = await file.readAsBytes();
      if (original.length > maxSourcePhotoBytes) return null;

      final fromBytes = await FlutterImageCompress.compressWithList(
        original,
        minWidth: maxEdge,
        minHeight: maxEdge,
        quality: quality,
        format: CompressFormat.webp,
        keepExif: false,
      );
      if (fromBytes.isEmpty) return null;
      webp = Uint8List.fromList(fromBytes);
    }

    if (webp.length > maxBytes && quality > 60) {
      return convertXFileToWebp(
        file,
        maxBytes: maxBytes,
        maxEdge: maxEdge,
        quality: quality - 15,
      );
    }

    if (webp.length > maxBytes) return null;

    if (kDebugMode) {
      final rawLen = await file.length();
      debugPrint(
        '[OwnerPhotoStorage] ${(rawLen / 1024).toStringAsFixed(0)} KB → '
        '${(webp.length / 1024).toStringAsFixed(0)} KB webp '
        '(edge≤$maxEdge, q$quality)',
      );
    }

    return webp;
  }

  static Future<({String? url, String? error})> uploadWebpBytes({
    required Uint8List bytes,
    required String storagePath,
    bool upsert = false,
  }) async {
    final authUid = authenticatedOwnerId;
    if (Supabase.instance.client.auth.currentSession == null ||
        authUid == null) {
      return (url: null, error: 'Нет сессии Supabase — войдите снова');
    }
    final expectedPrefix = 'owners/$authUid/';
    if (!storagePath.startsWith(expectedPrefix)) {
      return (
        url: null,
        error:
            'Путь загрузки не совпадает с аккаунтом ($storagePath). '
            'Ожидался префикс $expectedPrefix',
      );
    }
    try {
      await Supabase.instance.client.storage.from(bucket).uploadBinary(
        storagePath,
        bytes,
        fileOptions: FileOptions(
          cacheControl: '3600',
          upsert: upsert,
          contentType: 'image/webp',
        ),
      );
      final publicUrl = Supabase.instance.client.storage
          .from(bucket)
          .getPublicUrl(storagePath);
      return (url: publicUrl, error: null);
    } on StorageException catch (e) {
      if (kDebugMode) {
        debugPrint('[OwnerPhotoStorage] StorageException: ${e.message}');
      }
      return (
        url: null,
        error:
            'Storage error: ${e.message}. Проверь bucket "$bucket" и policy на insert.',
      );
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[OwnerPhotoStorage] Unknown error: $e');
      }
      return (url: null, error: 'Upload error: $e');
    }
  }

  static Future<({String? url, String? error})> uploadStudioGalleryPhoto({
    required XFile file,
  }) async {
    if (authenticatedOwnerId == null) {
      return (url: null, error: 'Нет сессии Supabase — войдите снова');
    }
    final bytes = await convertXFileToWebp(
      file,
      maxEdge: galleryMaxEdge,
    );
    if (bytes == null) {
      return (url: null, error: 'Фото больше 3 MB после сжатия');
    }
    return uploadStudioGalleryWebpBytes(bytes: bytes);
  }

  static Future<({String? url, String? error})> uploadStudioGalleryCroppedBytes({
    required Uint8List croppedBytes,
  }) async {
    if (authenticatedOwnerId == null) {
      return (url: null, error: 'Нет сессии Supabase — войдите снова');
    }
    final bytes = await convertBytesToWebp(
      croppedBytes,
      maxEdge: galleryMaxEdge,
    );
    if (bytes == null) {
      return (url: null, error: 'Фото больше 3 MB после сжатия');
    }
    return uploadStudioGalleryWebpBytes(bytes: bytes);
  }

  static Future<({String? url, String? error})> uploadStudioGalleryWebpBytes({
    required Uint8List bytes,
  }) async {
    final path = ownerStoragePath(
      '${DateTime.now().millisecondsSinceEpoch}_${_randomSuffix()}.webp',
    );
    return uploadWebpBytes(bytes: bytes, storagePath: path);
  }

  static String galleryAssetPath(String photoId, String suffix) =>
      ownerStoragePath('gallery/${photoId}_$suffix.webp');

  static Future<({StudioGalleryUpload? asset, String? error})>
      uploadStudioGalleryAsset({
    required String photoId,
    required Uint8List originalBytes,
    required Uint8List heroBytes,
    required Uint8List cardBytes,
  }) async {
    if (authenticatedOwnerId == null) {
      return (asset: null, error: 'Нет сессии Supabase — войдите снова');
    }

    final original = await convertBytesToWebp(
      originalBytes,
      maxEdge: galleryOriginalMaxEdge,
      quality: 86,
    );
    final hero = await convertBytesToWebp(
      heroBytes,
      maxEdge: galleryMaxEdge,
    );
    final card = await convertBytesToWebp(
      cardBytes,
      maxEdge: galleryMaxEdge,
    );
    if (original == null || hero == null || card == null) {
      return (asset: null, error: 'Фото больше 3 MB после сжатия');
    }

    final originalUpload = await uploadWebpBytes(
      bytes: original,
      storagePath: galleryAssetPath(photoId, 'original'),
      upsert: true,
    );
    if (originalUpload.url == null) {
      return (asset: null, error: originalUpload.error);
    }

    final heroUpload = await uploadWebpBytes(
      bytes: hero,
      storagePath: galleryAssetPath(photoId, 'hero'),
      upsert: true,
    );
    if (heroUpload.url == null) {
      return (asset: null, error: heroUpload.error);
    }

    final cardUpload = await uploadWebpBytes(
      bytes: card,
      storagePath: galleryAssetPath(photoId, 'card'),
      upsert: true,
    );
    if (cardUpload.url == null) {
      return (asset: null, error: cardUpload.error);
    }

    return (
      asset: StudioGalleryUpload(
        originalUrl: originalUpload.url!,
        heroUrl: heroUpload.url!,
        cardUrl: cardUpload.url!,
      ),
      error: null,
    );
  }

  /// Single profile avatar (`owners/{auth.uid()}/avatar.webp`).
  static Future<({String? url, String? error})> uploadProfileAvatar({
    required XFile file,
  }) async {
    if (authenticatedOwnerId == null) {
      return (url: null, error: 'Нет сессии Supabase — войдите снова');
    }
    final bytes = await convertXFileToWebp(
      file,
      maxEdge: avatarMaxEdge,
    );
    if (bytes == null) {
      return (url: null, error: 'Фото больше 3 MB после сжатия');
    }
    return uploadWebpBytes(
      bytes: bytes,
      storagePath: ownerStoragePath('avatar.webp'),
      upsert: true,
    );
  }

  /// Studio logo on owner profile (`owners/{auth.uid()}/logo.webp`).
  static Future<({String? url, String? error})> uploadStudioLogo({
    required XFile file,
  }) async {
    if (authenticatedOwnerId == null) {
      return (url: null, error: 'Нет сессии Supabase — войдите снова');
    }
    final bytes = await convertXFileToWebp(
      file,
      maxEdge: avatarMaxEdge,
    );
    if (bytes == null) {
      return (url: null, error: 'Фото больше 3 MB после сжатия');
    }
    return uploadWebpBytes(
      bytes: bytes,
      storagePath: ownerStoragePath('logo.webp'),
      upsert: true,
    );
  }

  static String _randomSuffix() {
    final ms = DateTime.now().microsecondsSinceEpoch.toRadixString(36);
    return ms.substring(ms.length > 6 ? ms.length - 6 : 0);
  }

  static String newGalleryPhotoId() =>
      '${DateTime.now().millisecondsSinceEpoch}_${_randomSuffix()}';
}

class StudioGalleryUpload {
  const StudioGalleryUpload({
    required this.originalUrl,
    required this.heroUrl,
    required this.cardUrl,
  });

  final String originalUrl;
  final String heroUrl;
  final String cardUrl;
}
