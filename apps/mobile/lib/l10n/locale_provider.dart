import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app_locales.dart';

/// Loads and caches translations from assets/l10n/{locale}/app.json.
/// Use t('key') or t('section.key') for nested keys. Returns key if missing.
class LocaleProvider extends ChangeNotifier {
  LocaleProvider() {
    _loadSavedLocale();
  }

  String _localeCode = defaultLocaleCode;
  Map<String, dynamic> _strings = {};
  /// English strings for fallback when a key is missing in the active locale.
  Map<String, dynamic> _englishStrings = {};
  bool _loaded = false;

  String get localeCode => _localeCode;
  bool get isLoaded => _loaded;

  /// Current locale for MaterialApp (e.g. Locale('ru', 'RU')).
  String get languageTag {
    if (_localeCode == 'en') return 'en';
    if (_localeCode == 'vi') return 'vi';
    return 'ru';
  }

  static const _prefsKey = 'app_locale';

  Future<void> _loadSavedLocale() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_prefsKey);
      if (saved != null && supportedLocaleCodes.contains(saved)) {
        _localeCode = saved;
      }
    } catch (_) {}
    await loadStrings();
  }

  static Map<String, dynamic> _decodeRootObject(String data) {
    final raw = json.decode(data);
    if (raw is Map) {
      return Map<String, dynamic>.from(raw);
    }
    return {};
  }

  /// Load app.json for current locale. Call after setLocale.
  Future<void> loadStrings() async {
    try {
      final primaryPath = 'assets/l10n/$_localeCode/app.json';
      final primaryData = await rootBundle.loadString(primaryPath);
      _strings = _decodeRootObject(primaryData);

      if (_localeCode == 'en') {
        _englishStrings = _strings;
      } else {
        final enData = await rootBundle.loadString('assets/l10n/en/app.json');
        _englishStrings = _decodeRootObject(enData);
      }
      _loaded = true;
    } catch (e) {
      if (kDebugMode) debugPrint('[LocaleProvider] loadStrings: $e');
      _strings = {};
      _englishStrings = {};
      _loaded = true;
    }
    notifyListeners();
  }

  /// Set locale and reload strings. Persists to SharedPreferences.
  Future<void> setLocale(String code) async {
    if (!supportedLocaleCodes.contains(code) || code == _localeCode) return;
    _localeCode = code;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefsKey, code);
    } catch (_) {}
    await loadStrings();
  }

  /// Walk nested maps from JSON (nested maps are not always [Map<String, dynamic>]).
  static dynamic _walk(dynamic root, List<String> parts) {
    dynamic cur = root;
    for (final p in parts) {
      if (cur is! Map || !cur.containsKey(p)) return null;
      cur = cur[p];
    }
    return cur;
  }

  /// Get translation by key. Supports nested keys: t('nav.dashboard') -> map['nav']['dashboard'].
  /// Falls back to English if the key is missing in the current locale.
  /// Returns [key] if not found anywhere.
  String t(String key) {
    if (key.isEmpty) return key;
    final parts = key.split('.');
    final primary = _walk(_strings, parts);
    if (primary is String) return primary;
    if (!identical(_strings, _englishStrings)) {
      final fb = _walk(_englishStrings, parts);
      if (fb is String) return fb;
    }
    if (kDebugMode) {
      debugPrint(
        '[LocaleProvider] missing key "$key" (locale=$_localeCode). '
        'After editing assets/l10n/*/app.json use Hot Restart (Shift+R), '
        'not Hot Reload.',
      );
    }
    return key;
  }

  /// Get list of strings by key (e.g. calendar.months). Returns empty list if not found.
  List<String> tList(String key) {
    if (key.isEmpty) return [];
    final parts = key.split('.');
    dynamic node = _walk(_strings, parts);
    if (node is! List && !identical(_strings, _englishStrings)) {
      node = _walk(_englishStrings, parts);
    }
    if (node is List) {
      return node.map((e) => e?.toString() ?? '').toList();
    }
    return [];
  }
}
