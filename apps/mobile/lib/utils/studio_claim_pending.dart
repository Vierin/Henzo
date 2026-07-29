import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../services/studio_claim_api_service.dart';

const _tokenKey = 'pending_studio_claim_token';
const _actionKey = 'pending_studio_claim_action';
const _emailKey = 'pending_studio_claim_email';
const _studioNameKey = 'pending_studio_claim_studio_name';

const _secureStorage = FlutterSecureStorage(
  aOptions: AndroidOptions(encryptedSharedPreferences: true),
);

/// Persists studio claim token across install → first open → login.
class StudioClaimPending {
  StudioClaimPending._();

  static Future<void> store({
    required String token,
    String action = 'manage',
    String? email,
    String? studioName,
  }) async {
    final trimmed = token.trim();
    if (trimmed.isEmpty) return;
    await _secureStorage.write(key: _tokenKey, value: trimmed);
    await _secureStorage.write(key: _actionKey, value: action.trim());
    if (email != null && email.trim().isNotEmpty) {
      await _secureStorage.write(key: _emailKey, value: email.trim());
    }
    if (studioName != null && studioName.trim().isNotEmpty) {
      await _secureStorage.write(
        key: _studioNameKey,
        value: studioName.trim(),
      );
    }
  }

  static Future<String?> readToken() async {
    final stored = await _secureStorage.read(key: _tokenKey);
    if (stored != null && stored.trim().isNotEmpty) return stored.trim();
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey)?.trim();
  }

  static Future<String?> readAction() async {
    return _secureStorage.read(key: _actionKey);
  }

  static Future<String?> readEmail() async {
    return _secureStorage.read(key: _emailKey);
  }

  static Future<String?> readStudioName() async {
    return _secureStorage.read(key: _studioNameKey);
  }

  static Future<void> clear() async {
    await _secureStorage.delete(key: _tokenKey);
    await _secureStorage.delete(key: _actionKey);
    await _secureStorage.delete(key: _emailKey);
    await _secureStorage.delete(key: _studioNameKey);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }

  /// Accepts pending claim after auth. Returns true on success.
  static Future<bool> tryAccept(String accessToken) async {
    final token = await readToken();
    final action = (await readAction())?.trim().toLowerCase() ?? 'manage';
    final confirmBooking = action == 'confirm';
    try {
      if (token != null && token.isNotEmpty) {
        await StudioClaimApiService.acceptClaim(
          accessToken,
          token,
          confirmBooking: confirmBooking,
        );
      } else {
        final result =
            await StudioClaimApiService.acceptPending(accessToken);
        if (result['claimed'] != true && result['success'] != true) {
          return false;
        }
      }
      await clear();
      return true;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[StudioClaimPending] accept failed: $e');
      }
      return false;
    }
  }
}
