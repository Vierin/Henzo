import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_map_vector_tiles/flutter_map_vector_tiles.dart' as vt;

import 'henzo_map_attribution.dart';

/// OpenFreeMap basemap (OpenStreetMap data). No API key, commercial use allowed.
abstract final class HenzoMapLayers {
  HenzoMapLayers._();

  /// Documented OpenFreeMap style. Not a CARTO raster URL.
  static const openFreeMapStyle =
      'https://tiles.openfreemap.org/styles/liberty';

  /// Used only if the vector style fails to load. No API key.
  static const _fallbackTiles =
      'https://server.arcgisonline.com/ArcGIS/rest/services/'
      'Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';

  /// All gestures except two-finger / keyboard rotation.
  static const int interactiveFlagsNoRotate =
      InteractiveFlag.all & ~InteractiveFlag.rotate;

  static InteractionOptions interactionOptions({bool interactive = true}) =>
      InteractionOptions(
        flags: interactive ? interactiveFlagsNoRotate : InteractiveFlag.none,
        cursorKeyboardRotationOptions:
            CursorKeyboardRotationOptions.disabled(),
      );

  static Widget basemapLayer() => const _OpenFreeMapBasemap();

  /// OSM + OpenMapTiles + OpenFreeMap attribution (required).
  static Widget basemapAttribution({
    AttributionAlignment alignment = AttributionAlignment.bottomRight,
  }) =>
      HenzoMapAttributionWidget(alignment: alignment);
}

class _OpenFreeMapBasemap extends StatefulWidget {
  const _OpenFreeMapBasemap();

  @override
  State<_OpenFreeMapBasemap> createState() => _OpenFreeMapBasemapState();
}

class _OpenFreeMapBasemapState extends State<_OpenFreeMapBasemap> {
  static vt.Style? _style;
  static Future<vt.Style>? _loading;
  static bool _failed = false;

  @override
  void initState() {
    super.initState();
    _ensureStyle();
  }

  void _ensureStyle() {
    if (_style != null || _failed) return;
    // cache: false — iOS style-disk cache can throw before any tile
    // is requested and leave the map on the empty placeholder.
    _loading ??= vt.StyleReader(
      uri: HenzoMapLayers.openFreeMapStyle,
      cache: false,
    ).read();
    _loading!.then(
      (style) {
        _style = style;
        _failed = false;
        if (mounted) setState(() {});
      },
      onError: (Object error) {
        debugPrint('OpenFreeMap style failed: $error');
        _loading = null;
        _failed = true;
        if (mounted) setState(() {});
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final style = _style;
    if (style == null) {
      if (!_failed) {
        return const ColoredBox(color: Color(0xFFE8E4DF));
      }
      return TileLayer(
        urlTemplate: HenzoMapLayers._fallbackTiles,
        userAgentPackageName: 'com.henzo.vn.Henzo',
        maxZoom: 16,
      );
    }
    return vt.VectorTileLayer(
      theme: style.theme,
      tileProviders: style.providers,
      rasterSources: style.rasterSources,
      sprites: style.sprites,
    );
  }
}
