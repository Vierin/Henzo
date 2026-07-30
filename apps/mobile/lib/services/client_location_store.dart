import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../screens/location_picker_screen.dart';
import 'cache/client_nearby_cache.dart';

/// Shared client city / country / coordinates (Home, Browse, Map, …).
class ClientLocationStore extends ChangeNotifier {
  static const String cityKey = 'client_city';
  static const String countryKey = 'client_country';
  static const String latKey = 'client_lat';
  static const String lonKey = 'client_lon';

  String? _city;
  String? _country;
  double? _lat;
  double? _lon;
  bool _loaded = false;

  /// Optional remote sync (set from app bootstrap when auth is ready).
  Future<void> Function(String city, String? country)? remoteSync;

  String? get city => _city;
  String? get country => _country;
  double? get lat => _lat;
  double? get lon => _lon;
  bool get isLoaded => _loaded;
  bool get hasCity => _city != null && _city!.trim().isNotEmpty;

  String displayLabel(String fallbackWhenEmpty) {
    if (!hasCity) return fallbackWhenEmpty;
    return _city!.trim();
  }

  Future<void> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final city = prefs.getString(cityKey)?.trim();
      final country = prefs.getString(countryKey)?.trim();
      _city = (city != null && city.isNotEmpty) ? city : null;
      _country = (country != null && country.isNotEmpty)
          ? country.toUpperCase()
          : null;
      _lat = prefs.getDouble(latKey);
      _lon = prefs.getDouble(lonKey);
    } catch (_) {
      _city = null;
      _country = null;
      _lat = null;
      _lon = null;
    }
    _loaded = true;
    notifyListeners();
  }

  /// Hydrate from server profile without pushing back (login).
  Future<void> hydrateFromProfile({
    String? city,
    String? country,
    bool onlyIfEmpty = true,
  }) async {
    final nextCity = city?.trim();
    if (nextCity == null || nextCity.isEmpty) return;
    if (onlyIfEmpty && hasCity) return;
    await apply(
      city: nextCity,
      country: country,
      syncRemote: false,
    );
  }

  Future<void> apply({
    required String city,
    String? country,
    double? lat,
    double? lon,
    bool syncRemote = true,
  }) async {
    final trimmed = city.trim();
    if (trimmed.isEmpty) return;
    final nextCountry = country?.trim().toUpperCase();
    final countryValue =
        (nextCountry != null && nextCountry.isNotEmpty) ? nextCountry : null;

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(cityKey, trimmed);
      if (countryValue != null) {
        await prefs.setString(countryKey, countryValue);
      } else {
        await prefs.remove(countryKey);
      }
      if (lat != null && lon != null) {
        await prefs.setDouble(latKey, lat);
        await prefs.setDouble(lonKey, lon);
      } else {
        await prefs.remove(latKey);
        await prefs.remove(lonKey);
      }
    } catch (_) {}

    _city = trimmed;
    _country = countryValue;
    _lat = lat;
    _lon = lon;
    ClientNearbyCache.clear();
    notifyListeners();

    if (syncRemote) {
      final sync = remoteSync;
      if (sync != null) {
        try {
          await sync(trimmed, countryValue);
        } catch (e) {
          if (kDebugMode) {
            debugPrint('[ClientLocation] remote sync failed: $e');
          }
        }
      }
    }
  }

  Future<void> applyFromPicker(LocationPickerResult picked) => apply(
        city: picked.city,
        country: picked.country,
        lat: picked.lat,
        lon: picked.lon,
      );

  /// Push current local location to server (after login).
  Future<void> pushToRemoteIfNeeded() async {
    if (!hasCity) return;
    final sync = remoteSync;
    if (sync == null) return;
    try {
      await sync(_city!.trim(), _country);
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[ClientLocation] push after auth failed: $e');
      }
    }
  }
}
