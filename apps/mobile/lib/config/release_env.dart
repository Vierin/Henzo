import 'package:flutter/foundation.dart';

import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'app_config.dart';
import 'load_app_env.dart';

/// Validates bundled env before release builds start the app.
void assertValidReleaseConfiguration() {
  if (kDebugMode) return;

  final loaded = loadedAppEnvFile ?? '';
  if (loaded.contains('.example')) {
    throw StateError(
      'Release build loaded example env ($loaded). '
      'Add assets/.env with production values before uploading.',
    );
  }

  final url = AppConfig.supabaseUrl.toLowerCase();
  final placeholders = <String>[
    'your-project.supabase.co',
    'staging_ref',
    'your_prod_ref',
    'your-prod-anon-key',
    'your_prod_anon',
  ];
  for (final needle in placeholders) {
    if (url.contains(needle)) {
      throw StateError(
        'Release build has placeholder EXPO_PUBLIC_SUPABASE_URL. '
        'Use a real assets/.env.',
      );
    }
  }

  if (AppConfig.apiUrl.isEmpty) {
    throw StateError('Release build: EXPO_PUBLIC_API_URL is empty.');
  }

  if (!AppConfig.apiUrl.toLowerCase().startsWith('https://')) {
    throw StateError(
      'Release build: EXPO_PUBLIC_API_URL must use https://',
    );
  }

  final appEnv =
      (dotenv.env['EXPO_PUBLIC_APP_ENV'] ?? '').trim().toLowerCase();
  const allowed = {'production', 'staging', 'prod', 'stage'};
  if (appEnv.isEmpty || !allowed.contains(appEnv)) {
    throw StateError(
      'Release build: EXPO_PUBLIC_APP_ENV must be production or staging.',
    );
  }

  final rc = AppConfig.revenueCatApiKey;
  if (rc.startsWith('test_')) {
    throw StateError(
      'Release build uses RevenueCat Test Store key (test_). '
      'Use appl_/goog_ for store uploads.',
    );
  }
}
