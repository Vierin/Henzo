import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Loads bundled env files (see `assets/.env.local.example`).
///
/// Debug: `assets/.env.local` → `assets/.env` → `assets/.env.local.example`
/// Release/profile: `assets/.env` → `assets/.env.production.example`
String? loadedAppEnvFile;

Future<String> loadAppEnv() async {
  final candidates = kDebugMode
      ? <String>[
          'assets/.env.local',
          'assets/.env',
          'assets/.env.local.example',
        ]
      : <String>[
          'assets/.env',
          'assets/.env.production.example',
        ];

  Object? lastError;
  for (final fileName in candidates) {
    try {
      await dotenv.load(fileName: fileName);
      loadedAppEnvFile = fileName;
      return fileName;
    } catch (e) {
      lastError = e;
    }
  }

  throw StateError(
    'No env file loaded. Tried: ${candidates.join(', ')}. Last error: $lastError',
  );
}
