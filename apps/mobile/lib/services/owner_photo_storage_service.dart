import 'package:flutter/foundation.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/app_config.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Upload owner images to the studio-photos Supabase bucket (`owners/{userId}/…`).
class OwnerPhotoStorageService {
  OwnerPhotoStorageService._();

  static const int maxPhotoBytes = 3 * 1024 * 1024;

  /// Profile avatar in lists / hero cards.
  static const int avatarMaxEdge = 512;

  /// Studio gallery cards.
  static const int galleryMaxEdge = 1200;

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
      if (original.length > maxBytes * 8) return null;

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
    final path = ownerStoragePath(
      '${DateTime.now().millisecondsSinceEpoch}_${_randomSuffix()}.webp',
    );
    return uploadWebpBytes(bytes: bytes, storagePath: path);
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
}
