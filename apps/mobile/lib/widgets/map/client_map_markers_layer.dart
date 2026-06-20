import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_map_marker_cluster/flutter_map_marker_cluster.dart';
import 'package:latlong2/latlong.dart';

import '../../constants/colors.dart';
import '../../screens/client/client_explore_models.dart';
import '../../utils/client_map_viewport.dart';

/// Pin anchor — bottom-center of the slot sits on the coordinate.
const Alignment kMapPinAlignment = Alignment.bottomCenter;

/// Fixed marker slot — inactive and active share the same anchor box.
const double kMapPinSlotSize = 40.0;
const double kMapPinIconSize = 32.0;
const double kMapPinActiveScale = 1.25;

const Color kMapPinInactiveColor = Color(0xFF4D39A8);

Marker _studioPinMarker({
  required LatLng point,
  required bool active,
  required VoidCallback onTap,
}) {
  return Marker(
    point: point,
    width: kMapPinSlotSize,
    height: kMapPinSlotSize,
    alignment: kMapPinAlignment,
    child: _MapStudioPin(active: active, onTap: onTap),
  );
}

/// Pin icon scaled from the bottom — tip stays on the map coordinate.
class _MapStudioPin extends StatelessWidget {
  const _MapStudioPin({
    required this.active,
    required this.onTap,
  });

  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: kMapPinSlotSize,
      height: kMapPinSlotSize,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Align(
          alignment: Alignment.bottomCenter,
          child: Transform.scale(
            scale: active ? kMapPinActiveScale : 1,
            alignment: Alignment.bottomCenter,
            child: Icon(
              Icons.location_on,
              size: kMapPinIconSize,
              color: active ? AppColors.primary500 : kMapPinInactiveColor,
            ),
          ),
        ),
      ),
    );
  }
}

/// Clustered studio pins (excluding the selected pin).
class ClientMapStudioClusterLayer extends StatelessWidget {
  const ClientMapStudioClusterLayer({
    super.key,
    required this.mapController,
    required this.mapStudios,
    required this.selectedStudioId,
    required this.onPinTap,
    required this.clusterFitPadding,
  });

  final MapController mapController;
  final List<ExploreStudioItem> mapStudios;
  final String? selectedStudioId;
  final ValueChanged<ExploreStudioItem> onPinTap;
  final EdgeInsets clusterFitPadding;

  @override
  Widget build(BuildContext context) {
    final markers = <Marker>[
      for (final studio in mapStudios)
        if (studio.lat != null &&
            studio.lng != null &&
            studio.id != selectedStudioId)
          _studioPinMarker(
            point: LatLng(studio.lat!, studio.lng!),
            active: false,
            onTap: () => onPinTap(studio),
          ),
    ];

    if (markers.isEmpty) return const SizedBox.shrink();

    final fitPadding = clusterFitPadding;

    return MarkerClusterLayerWidget(
      options: MarkerClusterLayerOptions(
        disableClusteringAtZoom: ClientMapViewport.clusterDisableZoom,
        maxClusterRadius: 50,
        size: const Size(36, 36),
        alignment: Alignment.center,
        padding: fitPadding,
        showPolygon: false,
        centerMarkerOnClick: false,
        zoomToBoundsOnClick: false,
        onClusterTap: (cluster) {
          mapController.fitCamera(
            CameraFit.bounds(
              bounds: ClientMapViewport.clusterFitBounds(cluster.bounds),
              padding: fitPadding,
              maxZoom: 17,
            ),
          );
        },
        markers: markers,
        builder: (context, clusterMarkers) {
          return Container(
            decoration: BoxDecoration(
              color: kMapPinInactiveColor,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 2),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.18),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Center(
              child: Text(
                '${clusterMarkers.length}',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

/// Selected studio pin — same slot/anchor, scaled up from the bottom.
class ClientMapSelectedPinLayer extends StatelessWidget {
  const ClientMapSelectedPinLayer({
    super.key,
    required this.studio,
    required this.onPinTap,
  });

  final ExploreStudioItem studio;
  final ValueChanged<ExploreStudioItem> onPinTap;

  @override
  Widget build(BuildContext context) {
    final lat = studio.lat;
    final lng = studio.lng;
    if (lat == null || lng == null) return const SizedBox.shrink();

    return MarkerLayer(
      alignment: kMapPinAlignment,
      markers: [
        _studioPinMarker(
          point: LatLng(lat, lng),
          active: true,
          onTap: () => onPinTap(studio),
        ),
      ],
    );
  }
}

/// User location dot on the client map.
class ClientMapUserMarkerLayer extends StatelessWidget {
  const ClientMapUserMarkerLayer({
    super.key,
    required this.lat,
    required this.lon,
  });

  static const _size = 20.0;

  final double lat;
  final double lon;

  @override
  Widget build(BuildContext context) {
    return MarkerLayer(
      markers: [
        Marker(
          point: LatLng(lat, lon),
          width: _size,
          height: _size,
          child: Container(
            width: _size,
            height: _size,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.primary500,
              border: Border.all(color: Colors.white, width: 2),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary500.withValues(alpha: 0.35),
                  blurRadius: 8,
                  spreadRadius: 1,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
