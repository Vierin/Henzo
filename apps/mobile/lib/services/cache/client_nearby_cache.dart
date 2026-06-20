import 'dart:convert';

/// Short-lived in-memory cache for [GET /studios/nearby] responses (decoded JSON).
/// Reduces duplicate calls when Home, Explore, and Map use the same area.
class ClientNearbyCache {
  ClientNearbyCache._();

  static const Duration ttl = Duration(seconds: 90);

  static final Map<String, _Entry> _entries = {};

  static dynamic _clone(dynamic raw) {
    if (raw == null) return null;
    return json.decode(json.encode(raw));
  }

  /// Returns a fresh copy of the cached body, or null if missing/expired.
  static dynamic get(String path) {
    final e = _entries[path];
    if (e == null) return null;
    if (DateTime.now().difference(e.at) > ttl) {
      _entries.remove(path);
      return null;
    }
    return _clone(e.raw);
  }

  static void put(String path, dynamic raw) {
    _entries[path] = _Entry(_clone(raw), DateTime.now());
  }

  /// When Map requests limit=N but Home recently fetched limit=50 for the same point.
  static List<dynamic>? sliceFromHomeCache(
    double lat,
    double lon, {
    required int take,
    int radius = 50,
  }) {
    final latS = lat.toStringAsFixed(6);
    final lonS = lon.toStringAsFixed(6);
    final mapPath =
        '/studios/nearby/map?limit=$take&strict=true&lat=$latS&lng=$lonS&radius=$radius';
    final mapRaw = get(mapPath);
    if (mapRaw is List && mapRaw.isNotEmpty) {
      return List<dynamic>.from(mapRaw.take(take));
    }
    final homePath =
        '/studios/nearby?limit=50&lat=$latS&lng=$lonS&radius=$radius';
    final raw = get(homePath);
    if (raw is List && raw.isNotEmpty) {
      return List<dynamic>.from(raw.take(take));
    }
    return null;
  }

  static void clear() {
    _entries.clear();
  }
}

class _Entry {
  _Entry(this.raw, this.at);

  final dynamic raw;
  final DateTime at;
}
