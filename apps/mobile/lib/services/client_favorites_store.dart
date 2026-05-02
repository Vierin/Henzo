import 'package:flutter/foundation.dart';

import 'api_client.dart';

/// Holds `/auth/favorites` list for the client shell: hearts on Home/Detail and Favorites tab.
class ClientFavoritesStore extends ChangeNotifier {
  List<Map<String, dynamic>> _favorites = const [];
  DateTime? _lastSyncedAt;
  bool _loading = false;
  bool _hasCompletedSync = false;

  static const Duration syncThrottle = Duration(seconds: 45);

  List<Map<String, dynamic>> get favorites => List.unmodifiable(_favorites);

  bool get isLoading => _loading;

  bool get hasCompletedSync => _hasCompletedSync;

  bool isFavorite(String studioId) {
    if (studioId.isEmpty) return false;
    return _favorites.any((m) => (m['id'] ?? '').toString() == studioId);
  }

  /// Full sync from API. [force] bypasses throttle (pull-to-refresh, first open).
  Future<void> sync(String? accessToken, {bool force = false}) async {
    if (accessToken == null || accessToken.isEmpty) {
      _favorites = const [];
      _lastSyncedAt = null;
      _hasCompletedSync = true;
      notifyListeners();
      return;
    }

    if (!force &&
        _lastSyncedAt != null &&
        DateTime.now().difference(_lastSyncedAt!) < syncThrottle) {
      return;
    }

    _loading = true;
    notifyListeners();

    try {
      final raw = await ApiClient.get('/auth/favorites', accessToken);
      final list = raw is Map<String, dynamic> && raw['favorites'] is List
          ? raw['favorites'] as List<dynamic>
          : <dynamic>[];
      final parsed = <Map<String, dynamic>>[];
      for (final item in list) {
        if (item is Map) parsed.add(Map<String, dynamic>.from(item));
      }
      _favorites = parsed;
      _lastSyncedAt = DateTime.now();
    } catch (_) {
      if (_favorites.isEmpty) {
        _favorites = const [];
      }
    } finally {
      _loading = false;
      _hasCompletedSync = true;
      notifyListeners();
    }
  }

  void removeLocal(String studioId) {
    _favorites = _favorites
        .where((m) => (m['id'] ?? '').toString() != studioId)
        .toList();
    notifyListeners();
  }

  void upsertStudioMap(Map<String, dynamic> studio) {
    final id = (studio['id'] ?? '').toString();
    if (id.isEmpty) return;
    final without =
        _favorites.where((m) => (m['id'] ?? '').toString() != id).toList();
    _favorites = [...without, Map<String, dynamic>.from(studio)];
    notifyListeners();
  }

  void clear() {
    _favorites = const [];
    _lastSyncedAt = null;
    _loading = false;
    _hasCompletedSync = false;
    notifyListeners();
  }
}
