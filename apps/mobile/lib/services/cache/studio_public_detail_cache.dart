import 'dart:convert';

/// In-memory cache for public studio detail payload ([GET /studios/:id]).
class StudioPublicDetailCache {
  StudioPublicDetailCache._();

  static const Duration ttl = Duration(minutes: 3);

  static final Map<String, _Entry> _entries = {};

  static Map<String, dynamic>? get(String studioId) {
    if (studioId.isEmpty) return null;
    final e = _entries[studioId];
    if (e == null) return null;
    if (DateTime.now().difference(e.at) > ttl) {
      _entries.remove(studioId);
      return null;
    }
    final raw = json.decode(json.encode(e.data)) as Map<String, dynamic>;
    return raw;
  }

  static void put(String studioId, Map<String, dynamic> data) {
    if (studioId.isEmpty) return;
    final raw =
        json.decode(json.encode(data)) as Map<String, dynamic>;
    _entries[studioId] = _Entry(raw, DateTime.now());
  }

  static void remove(String studioId) {
    _entries.remove(studioId);
  }

  static void clear() {
    _entries.clear();
  }
}

class _Entry {
  _Entry(this.data, this.at);

  final Map<String, dynamic> data;
  final DateTime at;
}
