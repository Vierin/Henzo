import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Конфигурация приложения из переменных окружения (assets/.env).
/// Ключи соответствуют именам в .env: EXPO_PUBLIC_*.
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
      (dotenv.env['EXPO_PUBLIC_WEB_URL'] ?? 'https://henzo.app')
          .trim()
          .replaceAll(RegExp(r'/$'), '');

  /// Страница регистрации владельца (можно переопределить `EXPO_PUBLIC_OWNER_REGISTER_URL`).
  static String get ownerRegisterUrl {
    final custom = (dotenv.env['EXPO_PUBLIC_OWNER_REGISTER_URL'] ?? '').trim();
    if (custom.isNotEmpty) {
      return custom.replaceAll(RegExp(r'/$'), '');
    }
    return '$webUrl/register';
  }

  /// Web Client ID из Google Cloud (тот же, что в Supabase → Auth → Google).
  static String get googleWebClientId =>
      (dotenv.env['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'] ?? '').trim();

  /// iOS Client ID из Google Cloud (только для iOS).
  static String get googleIosClientId =>
      (dotenv.env['EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'] ?? '').trim();

  static String get studioPhotosBucket =>
      (dotenv.env['EXPO_PUBLIC_STUDIO_PHOTOS_BUCKET'] ?? 'studio-photos')
          .trim();
}
