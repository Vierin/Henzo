import 'package:shared_preferences/shared_preferences.dart';

/// Survives Android process death while the gallery is open.
class OwnerNavigationRestore {
  OwnerNavigationRestore._();

  static const _shellTabKey = 'owner_shell_tab_index';
  static const _pendingProfilePhotoKey = 'owner_pending_profile_photo';

  static Future<void> saveShellTabIndex(int index) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_shellTabKey, index);
  }

  static Future<int?> readShellTabIndex() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt(_shellTabKey);
  }

  static Future<void> markPendingProfilePhotoUpload() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_pendingProfilePhotoKey, true);
  }

  static Future<void> clearPendingProfilePhotoUpload() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_pendingProfilePhotoKey);
  }

  static Future<bool> consumePendingProfilePhotoUpload() async {
    final prefs = await SharedPreferences.getInstance();
    final pending = prefs.getBool(_pendingProfilePhotoKey) ?? false;
    if (pending) {
      await prefs.remove(_pendingProfilePhotoKey);
    }
    return pending;
  }
}
