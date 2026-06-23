import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';

import 'henzo_map_attribution.dart';

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
  static Widget cartoAttribution({
    AttributionAlignment alignment = AttributionAlignment.bottomRight,
  }) =>
      HenzoMapAttributionWidget(alignment: alignment);
}
