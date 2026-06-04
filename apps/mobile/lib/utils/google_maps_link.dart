/// Google Maps search URLs for directions and share sheets.
Uri? googleMapsSearchUri({
  String? address,
  double? latitude,
  double? longitude,
}) {
  if (latitude != null && longitude != null) {
    return Uri.parse(
      'https://www.google.com/maps/search/?api=1&query=$latitude,$longitude',
    );
  }
  final q = address?.trim() ?? '';
  if (q.isEmpty) return null;
  return Uri.parse(
    'https://www.google.com/maps/search/?api=1'
    '&query=${Uri.encodeComponent(q)}',
  );
}

/// Location block for [Share.share] — emoji + label + Maps URL (auto-linkified).
String formatShareLocationBlock({
  String? address,
  double? latitude,
  double? longitude,
}) {
  final label = address?.trim() ?? '';
  final uri = googleMapsSearchUri(
    address: label.isNotEmpty ? label : address,
    latitude: latitude,
    longitude: longitude,
  );
  if (uri == null) return '';
  if (label.isNotEmpty) {
    return '📍 $label\n${uri.toString()}';
  }
  return '📍 ${uri.toString()}';
}
