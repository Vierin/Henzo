import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Тонкая обёртка над FirebaseAnalytics + Crashlytics user identification.
/// Все вызовы — best-effort: если Firebase не поднялся, тихо игнорируем.
class AnalyticsService {
  AnalyticsService._();

  static final AnalyticsService instance = AnalyticsService._();

  static const _optInKey = 'analytics.optIn';

  bool _optedIn = false;
  bool _loaded = false;

  /// Прочитать сохранённый opt-in на старте. Дефолт — false (GDPR / stores).
  Future<void> load() async {
    if (_loaded) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      _optedIn = prefs.getBool(_optInKey) ?? false;
    } catch (_) {}
    _loaded = true;
    await _applyCollection();
  }

  bool get isOptedIn => _optedIn;

  Future<void> setOptIn(bool enabled) async {
    _optedIn = enabled;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_optInKey, enabled);
    } catch (_) {}
    await _applyCollection();
  }

  Future<void> _applyCollection() async {
    try {
      await FirebaseAnalytics.instance.setAnalyticsCollectionEnabled(_optedIn);
      // Crashlytics в debug всегда выключен (см. main.dart). В release — по opt-in.
      await FirebaseCrashlytics.instance
          .setCrashlyticsCollectionEnabled(!kDebugMode && _optedIn);
    } catch (e) {
      if (kDebugMode) debugPrint('[Analytics] setOptIn failed: $e');
    }
  }

  Future<void> logEvent(String name, [Map<String, Object?> params = const {}]) async {
    if (!_optedIn) return;
    try {
      final sanitized = <String, Object>{};
      params.forEach((k, v) {
        if (v != null) sanitized[k] = v;
      });
      await FirebaseAnalytics.instance.logEvent(name: name, parameters: sanitized);
    } catch (e) {
      if (kDebugMode) debugPrint('[Analytics] logEvent $name failed: $e');
    }
  }

  Future<void> setUser(String? userId, {String? role, String? locale}) async {
    try {
      await FirebaseAnalytics.instance.setUserId(id: userId);
      if (userId != null && userId.isNotEmpty) {
        await FirebaseCrashlytics.instance.setUserIdentifier(userId);
      } else {
        await FirebaseCrashlytics.instance.setUserIdentifier('');
      }
      if (role != null && role.isNotEmpty) {
        await FirebaseAnalytics.instance
            .setUserProperty(name: 'role', value: role);
      }
      if (locale != null && locale.isNotEmpty) {
        await FirebaseAnalytics.instance
            .setUserProperty(name: 'locale', value: locale);
      }
    } catch (e) {
      if (kDebugMode) debugPrint('[Analytics] setUser failed: $e');
    }
  }
}
