import 'package:flutter_map/flutter_map.dart';
import 'package:url_launcher/url_launcher.dart';

/// Shared CARTO basemap tiles (OSM data) and legal attribution.
abstract final class HenzoMapLayers {
  HenzoMapLayers._();

  /// All gestures except two-finger / keyboard rotation.
  static const int interactiveFlagsNoRotate =
      InteractiveFlag.all & ~InteractiveFlag.rotate;

  static InteractionOptions interactionOptions({bool interactive = true}) =>
      InteractionOptions(
        flags: interactive ? interactiveFlagsNoRotate : InteractiveFlag.none,
        cursorKeyboardRotationOptions:
            CursorKeyboardRotationOptions.disabled(),
      );

  static const _userAgentPackageName = 'com.henzo.mobile';
  static const _cartoLightUrlTemplate =
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  static const _cartoSubdomains = ['a', 'b', 'c', 'd'];

  /// CARTO light basemap — use instead of tile.openstreetmap.org in production.
  static TileLayer cartoLightTileLayer() => TileLayer(
        urlTemplate: _cartoLightUrlTemplate,
        subdomains: _cartoSubdomains,
        retinaMode: true,
        userAgentPackageName: _userAgentPackageName,
      );

  /// OSM + CARTO attribution (required by tile ToS).
  static RichAttributionWidget cartoAttribution({
    AttributionAlignment alignment = AttributionAlignment.bottomRight,
  }) =>
      RichAttributionWidget(
        alignment: alignment,
        attributions: [
          TextSourceAttribution(
            'OpenStreetMap contributors',
            onTap: () => _openAttributionUrl(
              Uri.parse('https://www.openstreetmap.org/copyright'),
            ),
          ),
          TextSourceAttribution(
            'CARTO',
            onTap: () => _openAttributionUrl(
              Uri.parse('https://carto.com/attributions/'),
            ),
          ),
        ],
      );

  static Future<void> _openAttributionUrl(Uri uri) async {
    if (!await canLaunchUrl(uri)) return;
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}
