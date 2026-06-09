import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../services/trainer_api_service.dart';

const _storageKey = 'pending_trainer_invite_token';
const _legacyPrefsKey = 'pending_trainer_invite_token';

const _secureStorage = FlutterSecureStorage(
  aOptions: AndroidOptions(encryptedSharedPreferences: true),
);

/// Persists trainer invite token across login/registration.
class TrainerInvitePending {
  TrainerInvitePending._();

  static Future<void> store(String token) async {
    final trimmed = token.trim();
    await _secureStorage.write(key: _storageKey, value: trimmed);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_legacyPrefsKey);
  }

  static Future<String?> read() async {
    final stored = await _secureStorage.read(key: _storageKey);
    if (stored != null && stored.trim().isNotEmpty) {
      return stored.trim();
    }

    final prefs = await SharedPreferences.getInstance();
    final legacy = prefs.getString(_legacyPrefsKey);
    if (legacy == null || legacy.trim().isEmpty) return null;

    await store(legacy);
    return legacy.trim();
  }

  static Future<void> clear() async {
    await _secureStorage.delete(key: _storageKey);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_legacyPrefsKey);
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
