import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/foundation.dart';

class AnalyticsService {
  AnalyticsService._();

  static final AnalyticsService instance = AnalyticsService._();

  Future<void> load() async {
    try {
      await FirebaseAnalytics.instance.setAnalyticsCollectionEnabled(true);
      await FirebaseCrashlytics.instance
          .setCrashlyticsCollectionEnabled(!kDebugMode);
    } catch (e) {
      if (kDebugMode) debugPrint('[Analytics] init failed: $e');
    }
  }

  Future<void> logEvent(String name, [Map<String, Object?> params = const {}]) async {
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
