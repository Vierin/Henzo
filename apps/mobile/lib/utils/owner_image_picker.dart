import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:image_picker_android/image_picker_android.dart';
import 'package:image_picker_platform_interface/image_picker_platform_interface.dart';

/// Gallery picks tuned for owner uploads (less RAM / fewer process kills on Android).
class OwnerImagePicker {
  OwnerImagePicker._();

  static bool _configured = false;
  static final ImagePicker _picker = ImagePicker();

  /// Call once at app start (see [main]).
  static void configure() {
    if (_configured) return;
    _configured = true;
    if (defaultTargetPlatform == TargetPlatform.android) {
      final platform = ImagePickerPlatform.instance;
      if (platform is ImagePickerAndroid) {
        platform.useAndroidPhotoPicker = true;
      }
    }
  }

  static Future<void> _prepareForExternalPicker() async {
    if (!kIsWeb) {
      final cache = PaintingBinding.instance.imageCache;
      cache.clear();
      cache.clearLiveImages();
    }
    await Future<void>.delayed(Duration.zero);
  }

  /// Match [OwnerPhotoStorageService.galleryOriginalMaxEdge] so gallery
  /// originals are not pre-crushed below the web hero target (1520).
  static const double _galleryPickMaxEdge = 2400;

  static Future<XFile?> pickSingleFromGallery() async {
    configure();
    await _prepareForExternalPicker();
    return _picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: _galleryPickMaxEdge,
      maxHeight: _galleryPickMaxEdge,
      requestFullMetadata: false,
    );
  }

  static Future<List<XFile>> pickMultipleFromGallery({int? limit}) async {
    configure();
    await _prepareForExternalPicker();
    return _picker.pickMultiImage(
      maxWidth: _galleryPickMaxEdge,
      maxHeight: _galleryPickMaxEdge,
      requestFullMetadata: false,
      limit: limit,
    );
  }
}
