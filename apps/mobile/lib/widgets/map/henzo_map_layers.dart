import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_map_vector_tiles/flutter_map_vector_tiles.dart' as vt;

import 'henzo_map_attribution.dart';

/// OpenFreeMap basemap (OpenStreetMap data). No API key, commercial use allowed.
abstract final class HenzoMapLayers {
  HenzoMapLayers._();

  static const openFreeMapStyle =
      'https://tiles.openfreemap.org/styles/positron';

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

  @override
  void initState() {
    super.initState();
    _ensureStyle();
  }

  void _ensureStyle() {
    if (_style != null) return;
    _loading ??= vt.StyleReader(uri: HenzoMapLayers.openFreeMapStyle).read();
    _loading!.then((style) {
      _style = style;
      if (mounted) setState(() {});
    }).catchError((Object _) {
      _loading = null;
      if (mounted) setState(() {});
    });
  }

  @override
  Widget build(BuildContext context) {
    final style = _style;
    if (style == null) {
      return const ColoredBox(color: Color(0xFFE8E4DF));
    }
    return vt.VectorTileLayer(
      theme: style.theme,
      tileProviders: style.providers,
      rasterSources: style.rasterSources,
      sprites: style.sprites,
    );
  }
}
