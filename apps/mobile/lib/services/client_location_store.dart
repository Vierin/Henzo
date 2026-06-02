import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../screens/location_picker_screen.dart';
import 'cache/client_nearby_cache.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Shared client city / coordinates (Home, Browse, Map, …).
class ClientLocationStore extends ChangeNotifier {
  static const String cityKey = 'client_city';
  static const String latKey = 'client_lat';
  static const String lonKey = 'client_lon';

  String? _city;
  double? _lat;
  double? _lon;
  bool _loaded = false;

  String? get city => _city;
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
      _city = (city != null && city.isNotEmpty) ? city : null;
      _lat = prefs.getDouble(latKey);
      _lon = prefs.getDouble(lonKey);
    } catch (_) {
      _city = null;
      _lat = null;
      _lon = null;
    }
    _loaded = true;
    notifyListeners();
  }

  Future<void> apply({
    required String city,
    double? lat,
    double? lon,
  }) async {
    final trimmed = city.trim();
    if (trimmed.isEmpty) return;

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(cityKey, trimmed);
      if (lat != null && lon != null) {
        await prefs.setDouble(latKey, lat);
        await prefs.setDouble(lonKey, lon);
      } else {
        await prefs.remove(latKey);
        await prefs.remove(lonKey);
      }
    } catch (_) {}

    _city = trimmed;
    _lat = lat;
    _lon = lon;
    ClientNearbyCache.clear();
    notifyListeners();
  }

  Future<void> applyFromPicker(LocationPickerResult picked) => apply(
    city: picked.city,
    lat: picked.lat,
    lon: picked.lon,
  );
}
