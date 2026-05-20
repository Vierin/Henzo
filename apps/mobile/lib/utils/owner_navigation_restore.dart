import 'package:shared_preferences/shared_preferences.dart';

/// Survives Android process death while the gallery is open.
class OwnerNavigationRestore {
  OwnerNavigationRestore._();

  static const _shellTabKey = 'owner_shell_tab_index';
  static const _pendingProfilePhotoKey = 'owner_pending_profile_photo';
  static const _pendingProfilePhotoAtKey = 'owner_pending_profile_photo_at';
  static const _pendingPhotoMaxAge = Duration(minutes: 5);

  /// Saved only while the gallery may kill the process (photo pick).
  static Future<void> saveShellTabIndex(int index) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_shellTabKey, index);
  }

  static Future<int?> readShellTabIndex() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt(_shellTabKey);
  }

  static Future<void> clearShellTabIndex() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_shellTabKey);
  }

  static Future<bool> hasPendingProfilePhotoUpload() async {
    final prefs = await SharedPreferences.getInstance();
    if (!(prefs.getBool(_pendingProfilePhotoKey) ?? false)) return false;
    final atMs = prefs.getInt(_pendingProfilePhotoAtKey);
    if (atMs == null) return true;
    final age = DateTime.now().millisecondsSinceEpoch - atMs;
    if (age > _pendingPhotoMaxAge.inMilliseconds) {
      await clearOwnerNavigationRestore();
      return false;
    }
    return true;
  }

  static Future<void> markPendingProfilePhotoUpload({
    int shellTabIndex = 0,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_pendingProfilePhotoKey, true);
    await prefs.setInt(
      _pendingProfilePhotoAtKey,
      DateTime.now().millisecondsSinceEpoch,
    );
    await prefs.setInt(_shellTabKey, shellTabIndex);
  }

  static Future<void> clearOwnerNavigationRestore() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_pendingProfilePhotoKey);
    await prefs.remove(_pendingProfilePhotoAtKey);
    await prefs.remove(_shellTabKey);
  }

  static Future<void> clearPendingProfilePhotoUpload() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_pendingProfilePhotoKey);
    await prefs.remove(_pendingProfilePhotoAtKey);
  }

  static Future<bool> consumePendingProfilePhotoUpload() async {
    final pending = await hasPendingProfilePhotoUpload();
    if (pending) {
      await clearPendingProfilePhotoUpload();
    }
    return pending;
  }
}
