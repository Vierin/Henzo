import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Конфигурация из `assets/.env`. Ключи соответствуют именам в .env: EXPO_PUBLIC_*.
abstract final class AppConfig {
  static String get supabaseUrl =>
      (dotenv.env['EXPO_PUBLIC_SUPABASE_URL'] ?? '').trim();

  static String get supabaseAnonKey =>
      (dotenv.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] ?? '').trim();

  /// URL API без завершающего слэша.
  static String get apiUrl {
    final url = (dotenv.env['EXPO_PUBLIC_API_URL'] ?? '').trim();
    return url.endsWith('/') ? url.substring(0, url.length - 1) : url;
  }

  /// URL веб-приложения для ссылки на онлайн-запись (без завершающего слэша).
  static String get webUrl =>
      (dotenv.env['EXPO_PUBLIC_WEB_URL'] ?? 'https://www.henzo.app')
          .trim()
          .replaceAll(RegExp(r'/$'), '');

  /// Web Client ID из Google Cloud (тот же, что в Supabase → Auth → Google).
  static String get googleWebClientId =>
      (dotenv.env['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'] ?? '').trim();

  /// iOS Client ID из Google Cloud (только для iOS).
  static String get googleIosClientId =>
      (dotenv.env['EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'] ?? '').trim();

  static String get studioPhotosBucket =>
      (dotenv.env['EXPO_PUBLIC_STUDIO_PHOTOS_BUCKET'] ?? 'studio-photos')
          .trim();

  /// `EXPO_PUBLIC_APP_ENV`: `development` / `dev` → dev; иначе production (по умолчанию).
  static bool get isDevelopment {
    final v = (dotenv.env['EXPO_PUBLIC_APP_ENV'] ?? '').trim().toLowerCase();
    return v == 'development' || v == 'dev';
  }

  static String get henzoEnv =>
      (dotenv.env['EXPO_PUBLIC_HENZO_ENV'] ?? '').trim().toLowerCase();

  static bool get isProduction => !isDevelopment;

  static String _firstEnv(List<String> keys) {
    for (final key in keys) {
      final value = (dotenv.env[key] ?? '').trim();
      if (value.isNotEmpty) return value;
    }
    return '';
  }

  /// RevenueCat public SDK key (Test Store `test_`, prod `appl_` / `goog_`).
  static String get revenueCatApiKey {
    const sharedKeys = [
      'EXPO_PUBLIC_REVENUECAT_API_KEY',
      'REVENUECAT_API_KEY',
    ];
    if (Platform.isIOS) {
      return _firstEnv([
        'EXPO_PUBLIC_REVENUECAT_IOS_API_KEY',
        'REVENUECAT_IOS_API_KEY',
        ...sharedKeys,
      ]);
    }
    if (Platform.isAndroid) {
      return _firstEnv([
        'EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY',
        'REVENUECAT_ANDROID_API_KEY',
        ...sharedKeys,
      ]);
    }
    return '';
  }

  /// Entitlement identifier in RevenueCat (legacy / fallback).
  static String get revenueCatEntitlementId =>
      (dotenv.env['EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID'] ??
              dotenv.env['REVENUECAT_ENTITLEMENT_ID'] ??
              'premium_studio')
          .trim();

  static String get revenueCatStudioEntitlementId =>
      (dotenv.env['EXPO_PUBLIC_REVENUECAT_STUDIO_ENTITLEMENT_ID'] ??
              'premium_studio')
          .trim();

  static String get revenueCatEnterpriseEntitlementId =>
      (dotenv.env['EXPO_PUBLIC_REVENUECAT_ENTERPRISE_ENTITLEMENT_ID'] ??
              'premium_enterprise')
          .trim();

  static String get revenueCatSoloEntitlementId =>
      (dotenv.env['EXPO_PUBLIC_REVENUECAT_SOLO_ENTITLEMENT_ID'] ??
              'premium_solo')
          .trim();

  static bool get isRevenueCatEnabled => revenueCatApiKey.isNotEmpty;

  /// Логирование только в development (например детали ошибок входа).
  static void logIfDevelopment(
    String tag,
    String message, [
    Object? error,
    StackTrace? stackTrace,
  ]) {
    if (!isDevelopment) return;
    final buf = StringBuffer('[APP_ENV=dev][$tag] $message');
    if (error != null) buf.write('\n$error');
    if (stackTrace != null) buf.write('\n$stackTrace');
    debugPrint(buf.toString());
  }
}
