import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../services/trainer_api_service.dart';

const _prefsKey = 'pending_trainer_invite_token';

/// Persists trainer invite token across login/registration.
class TrainerInvitePending {
  TrainerInvitePending._();

  static Future<void> store(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsKey, token.trim());
  }

  static Future<String?> read() async {
    final prefs = await SharedPreferences.getInstance();
    final v = prefs.getString(_prefsKey);
    if (v == null || v.trim().isEmpty) return null;
    return v.trim();
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_prefsKey);
  }

  /// Accepts pending invite if stored. Returns true on success.
  static Future<bool> tryAccept(String accessToken) async {
    final token = await read();
    if (token == null) return false;
    try {
      await TrainerApiService.acceptInvite(accessToken, token);
      await clear();
      return true;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[TrainerInvitePending] accept failed: $e');
      }
      return false;
    }
  }
}
