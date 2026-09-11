import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
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

  static Future<bool> hasPending() async {
    final token = await readToken();
    return token != null && token.isNotEmpty;
  }

  static Future<void> clear() async {
    await _secureStorage.delete(key: _tokenKey);
    await _secureStorage.delete(key: _actionKey);
    await _secureStorage.delete(key: _emailKey);
    await _secureStorage.delete(key: _studioNameKey);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }

  /// `henzo://studio-claim/<token>?action=…` or
  /// `https://*.henzo.app/.../studio-claim/<token>?action=…`
  static ({String? token, String action}) extractFromUri(Uri uri) {
    final action = uri.queryParameters['action'] ?? 'manage';
    final isAppScheme =
        uri.scheme == 'henzo' && uri.host == 'studio-claim';
    final isWebPath = uri.scheme == 'https' &&
        (uri.host == 'henzo.app' || uri.host.endsWith('.henzo.app')) &&
        uri.path.contains('/studio-claim/');

    if (isAppScheme) {
      final parts = uri.pathSegments;
      return (
        token: parts.isNotEmpty ? parts.first : null,
        action: action,
      );
    }
    if (isWebPath) {
      final parts =
          uri.path.split('/').where((s) => s.isNotEmpty).toList();
      final idx = parts.indexOf('studio-claim');
      if (idx >= 0 && idx + 1 < parts.length) {
        return (token: parts[idx + 1], action: action);
      }
    }
    return (token: null, action: action);
  }

  static bool looksLikeClaimUri(Uri uri) {
    final extracted = extractFromUri(uri);
    return extracted.token != null && extracted.token!.isNotEmpty;
  }

  /// Best-effort restore after Store install (clipboard written by web landing).
  static Future<bool> tryRestoreFromClipboard() async {
    try {
      final data = await Clipboard.getData(Clipboard.kTextPlain);
      final text = data?.text?.trim() ?? '';
      if (text.isEmpty) return false;
      final uri = Uri.tryParse(text);
      if (uri == null || !looksLikeClaimUri(uri)) return false;
      final ok = await storeFromUri(uri);
      if (ok) {
        await Clipboard.setData(const ClipboardData(text: ''));
      }
      return ok;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[StudioClaimPending] clipboard restore failed: $e');
      }
      return false;
    }
  }

  /// Android Play Install Referrer: `henzo_dl=<urlencoded deep link>`.
  static Future<bool> tryRestoreFromInstallReferrer() async {
    if (kIsWeb || !Platform.isAndroid) return false;
    try {
      const channel = MethodChannel('com.henzo.mobile/install_referrer');
      final referrer = await channel.invokeMethod<String>('getReferrer');
      if (referrer == null || referrer.trim().isEmpty) return false;
      final params = Uri.splitQueryString(referrer);
      var deepLink = params['henzo_dl'] ?? params['utm_content'] ?? '';
      if (deepLink.isEmpty) return false;
      if (deepLink.contains('%')) {
        try {
          deepLink = Uri.decodeComponent(deepLink);
        } catch (_) {}
      }
      final uri = Uri.tryParse(deepLink);
      if (uri == null || !looksLikeClaimUri(uri)) return false;
      return await storeFromUri(uri);
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[StudioClaimPending] install referrer failed: $e');
      }
      return false;
    }
  }

  static Future<bool> storeFromUri(Uri uri) async {
    final extracted = extractFromUri(uri);
    final token = extracted.token?.trim();
    if (token == null || token.isEmpty) return false;

    String? email;
    String? studioName;
    try {
      final preview = await StudioClaimApiService.getClaimPreview(token);
      email = preview['ownerEmailHint'] as String?;
      studioName = preview['studioName'] as String?;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[StudioClaimPending] preview failed: $e');
      }
    }

    await store(
      token: token,
      action: extracted.action,
      email: email,
      studioName: studioName,
    );
    return true;
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
