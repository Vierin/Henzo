import 'package:flutter/foundation.dart';

import '../../models/studio.dart';
import '../dashboard_api_service.dart';

/// In-memory cache for current studio. TTL 3 minutes; invalidate on update.
class StudioCache extends ChangeNotifier {
  Studio? _studio;
  String? _tokenHint;
  DateTime? _fetchedAt;
  static const _ttl = Duration(minutes: 3);

  Studio? get studio => _studio;

  bool get isStale {
    if (_fetchedAt == null) return true;
    return DateTime.now().difference(_fetchedAt!) > _ttl;
  }

  Future<Studio?> getStudio(String? accessToken) async {
    if (accessToken == null || accessToken.isEmpty) {
      _clear();
      return null;
    }
    if (_studio != null && _tokenHint == accessToken && !isStale) {
      return _studio;
    }
    try {
      final s = await DashboardApiService.getCurrentStudio(accessToken);
      if (s != null) {
        _studio = s;
        _tokenHint = accessToken;
        _fetchedAt = DateTime.now();
        notifyListeners();
      } else {
        _clear();
      }
      return _studio;
    } catch (_) {
      rethrow;
    }
  }

  void invalidate() {
    _clear();
    notifyListeners();
  }

  void _clear() {
    _studio = null;
    _tokenHint = null;
    _fetchedAt = null;
  }
}
