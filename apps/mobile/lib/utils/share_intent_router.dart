import 'package:flutter/material.dart';

import '../screens/public_class_detail_screen.dart';
import '../screens/public_studio_detail_screen.dart';
import 'root_navigator_key.dart';
import 'share_intent_pending.dart';

/// Opens a stored share intent on the root navigator.
class ShareIntentRouter {
  ShareIntentRouter._();

  static String? _lastOpenedSig;
  static DateTime? _lastOpenedAt;

  static Future<void> open(
    ShareIntent intent, {
    GlobalKey<NavigatorState>? navigatorKey,
  }) async {
    final now = DateTime.now();
    if (_lastOpenedSig == intent.signature &&
        _lastOpenedAt != null &&
        now.difference(_lastOpenedAt!).inMilliseconds < 2500) {
      return;
    }
    _lastOpenedSig = intent.signature;
    _lastOpenedAt = now;

    final nav = (navigatorKey ?? henzoRootNavigatorKey).currentState;
    if (nav == null) return;

    if (intent.kind == ShareIntentKind.studio) {
      nav.push(
        MaterialPageRoute<void>(
          builder: (_) => PublicStudioDetailScreen(studioId: intent.idOrSlug),
        ),
      );
      return;
    }

    final startsAt = DateTime.tryParse(intent.startsAtIso ?? '')?.toLocal();
    nav.push(
      MaterialPageRoute<void>(
        builder: (_) => PublicClassDetailScreen(
          studioId: intent.idOrSlug,
          sessionId: intent.sessionId!,
          sessionStartsAtHint: startsAt ?? DateTime.now(),
        ),
      ),
    );
  }

  /// Reads pending (without clearing) and opens. Call after auth shell mounts.
  static Future<bool> openPendingIfAny({
    GlobalKey<NavigatorState>? navigatorKey,
    bool clearAfterOpen = false,
  }) async {
    final pending = await ShareIntentPending.read();
    if (pending == null) return false;
    await open(pending, navigatorKey: navigatorKey);
    if (clearAfterOpen) {
      await ShareIntentPending.clear();
    }
    return true;
  }

  static Future<void> openPendingWithRetry({
    GlobalKey<NavigatorState>? navigatorKey,
    int attempt = 0,
  }) async {
    final key = navigatorKey ?? henzoRootNavigatorKey;
    if (key.currentState == null) {
      if (attempt >= 20) return;
      await Future<void>.delayed(const Duration(milliseconds: 250));
      return openPendingWithRetry(
        navigatorKey: key,
        attempt: attempt + 1,
      );
    }
    await openPendingIfAny(navigatorKey: key);
  }
}
