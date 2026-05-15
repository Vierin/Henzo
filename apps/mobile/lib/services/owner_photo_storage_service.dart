import 'dart:typed_data';

import 'package:flutter/foundation.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/app_config.dart';

/// Upload owner images to the studio-photos Supabase bucket (`owners/{userId}/…`).
class OwnerPhotoStorageService {
  OwnerPhotoStorageService._();

  static const int maxPhotoBytes = 3 * 1024 * 1024;

  static String get bucket {
    final configured = AppConfig.studioPhotosBucket.trim();
    return configured.isEmpty ? 'studio-photos' : configured;
  }

  static Future<Uint8List?> convertXFileToWebp(
    XFile file, {
    int maxBytes = maxPhotoBytes,
    int minWidth = 1000,
  }) async {
    final bytesLength = await file.length();
    if (bytesLength > maxBytes) return null;

    final original = await file.readAsBytes();
    final compressed = await FlutterImageCompress.compressWithList(
      original,
      minWidth: minWidth,
      quality: 82,
      format: CompressFormat.webp,
      keepExif: false,
    );
    return Uint8List.fromList(compressed.isEmpty ? original : compressed);
  }

  static Future<({String? url, String? error})> uploadWebpBytes({
    required Uint8List bytes,
    required String storagePath,
    bool upsert = false,
  }) async {
    if (Supabase.instance.client.auth.currentSession == null) {
      return (url: null, error: 'Нет сессии Supabase — войдите снова');
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

  /// Gallery photo — same path pattern as studio profile photos.
  static Future<({String? url, String? error})> uploadStudioGalleryPhoto({
    required XFile file,
    required String userId,
  }) async {
    final bytes = await convertXFileToWebp(file);
    if (bytes == null) {
      return (url: null, error: 'Фото больше 3 MB');
    }
    final path =
        'owners/$userId/${DateTime.now().millisecondsSinceEpoch}_${_randomSuffix()}.webp';
    return uploadWebpBytes(bytes: bytes, storagePath: path);
  }

  /// Single profile avatar per owner (`owners/{userId}/avatar.webp`).
  static Future<({String? url, String? error})> uploadProfileAvatar({
    required XFile file,
    required String userId,
  }) async {
    final bytes = await convertXFileToWebp(file);
    if (bytes == null) {
      return (url: null, error: 'Фото больше 3 MB');
    }
    return uploadWebpBytes(
      bytes: bytes,
      storagePath: 'owners/$userId/avatar.webp',
      upsert: true,
    );
  }

  static String _randomSuffix() {
    final ms = DateTime.now().microsecondsSinceEpoch.toRadixString(36);
    return ms.substring(ms.length > 6 ? ms.length - 6 : 0);
  }
}
