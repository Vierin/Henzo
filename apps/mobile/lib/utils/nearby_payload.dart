/// Normalizes various `/studios/nearby` JSON shapes to a raw studio list.
List<dynamic> extractStudiosListFromNearby(dynamic raw) {
  if (raw is List) return raw;
  if (raw is Map) {
    final data = raw['data'];
    if (data is List) return data;
    if (data is Map && data['items'] is List) {
      return data['items'] as List<dynamic>;
    }
    if (raw['items'] is List) return raw['items'] as List<dynamic>;
    if (raw['results'] is List) return raw['results'] as List<dynamic>;
    if (raw['studios'] is List) return raw['studios'] as List<dynamic>;
  }
  return const <dynamic>[];
}
