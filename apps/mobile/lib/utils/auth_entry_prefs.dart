import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Local "has this device finished the first auth entry?" flag.
///
/// Drives cold-start: first-run → role selection; returning → login.
/// Not tied to logout — after sign-out users still see [LoginScreen].
class AuthEntryPrefs {
  AuthEntryPrefs._();

  static const key = 'auth_intro_completed';

  /// `null` until [load] finishes; then `true`/`false`.
  static final ValueNotifier<bool?> completed = ValueNotifier<bool?>(null);

  static Future<void> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (prefs.containsKey(key)) {
        completed.value = prefs.getBool(key) ?? false;
        return;
      }

      // Upgrade from pre-flag builds: any prior local data or a stored
      // Supabase session ⇒ treat as returning device (show Login).
      final returning = prefs.getKeys().isNotEmpty ||
          Supabase.instance.client.auth.currentSession != null;
      completed.value = returning;
      if (returning) {
        await prefs.setBool(key, true);
      }
    } catch (e) {
      if (kDebugMode) debugPrint('[AuthEntryPrefs] load error: $e');
      completed.value = false;
    }
  }

  static Future<void> markCompleted() async {
    if (completed.value == true) return;
    completed.value = true;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(key, true);
    } catch (e) {
      if (kDebugMode) debugPrint('[AuthEntryPrefs] markCompleted error: $e');
    }
  }
}
