import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Deferred share intent so studio/class opens after install, not registration.
class ShareIntent {
  const ShareIntent.studio(this.idOrSlug)
      : kind = ShareIntentKind.studio,
        sessionId = null,
        startsAtIso = null;

  const ShareIntent.classSession({
    required this.idOrSlug,
    required this.sessionId,
    required this.startsAtIso,
  }) : kind = ShareIntentKind.classSession;

  final ShareIntentKind kind;

  /// Studio id or slug (for studio) / studioId (for class).
  final String idOrSlug;
  final String? sessionId;
  final String? startsAtIso;

  String get signature => kind == ShareIntentKind.studio
      ? 'studio|$idOrSlug'
      : 'class|$idOrSlug|$sessionId|$startsAtIso';
}

enum ShareIntentKind { studio, classSession }

const _storageKey = 'pending_share_intent_v1';
const _secureStorage = FlutterSecureStorage(
  aOptions: AndroidOptions(encryptedSharedPreferences: true),
);

class ShareIntentPending {
  ShareIntentPending._();

  static Future<void> storeStudio(String idOrSlug) async {
    final trimmed = idOrSlug.trim();
    if (trimmed.isEmpty) return;
    await _write('studio|$trimmed');
  }

  static Future<void> storeClass({
    required String studioId,
    required String sessionId,
    required DateTime startsAt,
  }) async {
    final s = studioId.trim();
    final sess = sessionId.trim();
    if (s.isEmpty || sess.isEmpty) return;
    await _write(
      'class|$s|$sess|${startsAt.toUtc().toIso8601String()}',
    );
  }

  static Future<void> storeFromUri(Uri uri) async {
    final parsed = tryParseHenzoUri(uri);
    if (parsed == null) return;
    if (parsed.kind == ShareIntentKind.studio) {
      await storeStudio(parsed.idOrSlug);
    } else {
      await storeClass(
        studioId: parsed.idOrSlug,
        sessionId: parsed.sessionId!,
        startsAt: DateTime.parse(parsed.startsAtIso!),
      );
    }
  }

  static Future<ShareIntent?> read() async {
    final raw = await _secureStorage.read(key: _storageKey);
    if (raw != null && raw.trim().isNotEmpty) {
      return _parseStored(raw.trim());
    }
    final prefs = await SharedPreferences.getInstance();
    final legacy = prefs.getString(_storageKey);
    if (legacy == null || legacy.trim().isEmpty) return null;
    await _write(legacy.trim());
    return _parseStored(legacy.trim());
  }

  static Future<bool> hasPending() async => (await read()) != null;

  static Future<void> clear() async {
    await _secureStorage.delete(key: _storageKey);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_storageKey);
  }

  /// Best-effort restore after Store install (clipboard written by web landing).
  static Future<bool> tryRestoreFromClipboard() async {
    try {
      final data = await Clipboard.getData(Clipboard.kTextPlain);
      final text = data?.text?.trim() ?? '';
      if (text.isEmpty) return false;
      final uri = Uri.tryParse(text);
      if (uri == null) return false;
      if (!looksLikeHenzoShareUri(uri)) return false;
      await storeFromUri(uri);
      // Clear so we don't re-consume on next launch.
      await Clipboard.setData(const ClipboardData(text: ''));
      return true;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[ShareIntentPending] clipboard restore failed: $e');
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
      // Play may leave the value still percent-encoded.
      if (deepLink.contains('%')) {
        try {
          deepLink = Uri.decodeComponent(deepLink);
        } catch (_) {}
      }
      final uri = Uri.tryParse(deepLink);
      if (uri == null || !looksLikeHenzoShareUri(uri)) return false;
      await storeFromUri(uri);
      return true;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[ShareIntentPending] install referrer failed: $e');
      }
      return false;
    }
  }

  static bool looksLikeHenzoShareUri(Uri uri) {
    if (uri.scheme == 'henzo' &&
        (uri.host == 'studio' || uri.host == 'class')) {
      return true;
    }
    if (uri.scheme == 'https' &&
        (uri.host == 'henzo.app' || uri.host.endsWith('.henzo.app'))) {
      final path = uri.path;
      return path.contains('/studio/') ||
          path == '/class' ||
          path.endsWith('/class');
    }
    return false;
  }

  static ShareIntent? tryParseHenzoUri(Uri uri) {
    if (uri.scheme == 'henzo' && uri.host == 'studio') {
      final id = uri.pathSegments.where((s) => s.isNotEmpty).firstOrNull;
      if (id == null || id.isEmpty) return null;
      return ShareIntent.studio(id);
    }
    if (uri.scheme == 'https' &&
        (uri.host == 'henzo.app' || uri.host.endsWith('.henzo.app'))) {
      final segments = uri.pathSegments.where((s) => s.isNotEmpty).toList();
      final studioIdx = segments.indexOf('studio');
      if (studioIdx >= 0 && studioIdx + 1 < segments.length) {
        return ShareIntent.studio(segments[studioIdx + 1]);
      }
    }

    // Class: henzo://class?... or https://.../class?...
    final isAppClass = uri.scheme == 'henzo' && uri.host == 'class';
    final normPath = uri.path.replaceAll(RegExp(r'/+$'), '');
    final isWebClass = uri.scheme == 'https' &&
        (uri.host == 'henzo.app' || uri.host.endsWith('.henzo.app')) &&
        (normPath == '/class' || normPath.endsWith('/class'));
    if (!isAppClass && !isWebClass) return null;

    final studioId = uri.queryParameters['studioId']?.trim() ?? '';
    final sessionId = uri.queryParameters['sessionId']?.trim() ?? '';
    final startsAt = uri.queryParameters['startsAt']?.trim() ?? '';
    if (studioId.isEmpty || sessionId.isEmpty || startsAt.isEmpty) return null;
    if (DateTime.tryParse(startsAt) == null) return null;
    return ShareIntent.classSession(
      idOrSlug: studioId,
      sessionId: sessionId,
      startsAtIso: startsAt,
    );
  }

  static Future<void> _write(String value) async {
    await _secureStorage.write(key: _storageKey, value: value);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_storageKey);
  }

  static ShareIntent? _parseStored(String raw) {
    final parts = raw.split('|');
    if (parts.isEmpty) return null;
    if (parts[0] == 'studio' && parts.length >= 2 && parts[1].isNotEmpty) {
      return ShareIntent.studio(parts[1]);
    }
    if (parts[0] == 'class' &&
        parts.length >= 4 &&
        parts[1].isNotEmpty &&
        parts[2].isNotEmpty &&
        parts[3].isNotEmpty) {
      return ShareIntent.classSession(
        idOrSlug: parts[1],
        sessionId: parts[2],
        startsAtIso: parts[3],
      );
    }
    return null;
  }
}

extension _FirstOrNull<E> on Iterable<E> {
  E? get firstOrNull {
    final it = iterator;
    if (!it.moveNext()) return null;
    return it.current;
  }
}
