import 'package:flutter/material.dart';
import 'dart:math' as math;

import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../screens/client/client_explore_models.dart';

/// Viewport filtering and zoom-based fetch radius for the client map.
abstract final class ClientMapViewport {
  static const mapFetchLimit = 100;

  /// Pins and carousel — extra geographic bleed beyond the padded screen rect.
  static const pinVisibilityBleedKm = 2.0;
  static const visibleBoundsPadFraction = 0.0;

  /// Class schedule prefetch only — slightly ahead of pan direction.
  static const preloadBoundsPadFraction = 0.06;
  static const minSearchRadiusKm = 3.0;
  static const maxSearchRadiusKm = 120.0;

  /// Prevents zoom-out so far that search radius / pin projection break down.
  static const clientMapMinZoom = 9.0;
  static const clientMapMaxZoom = 22.0;

  /// Clustering only at zoom ≤ this level; individual pins from zoom + 1 up.
  static const clusterDisableZoom = 13;
  static const clusterMaxRadius = 36;
  static const mapScheduleLimit = 15;
  static const classesCacheMaxSize = 15;
  static const carouselCardHeight = 170.0;
  static const carouselBottomPadding = 24.0;
  static const mapTopChromePadding = 72.0;
  static const mapSidePadding = 32.0;

  /// Extra bottom inset so southern pins are not clipped by the carousel strip.
  static const mapPinBottomExtra = 56.0;

  /// Inset for pin visibility — carousel strip only when a card is open.
  static EdgeInsets pinFilterPadding({
    required double bottomSafeInset,
    required bool showCarouselCard,
  }) {
    return EdgeInsets.only(
      top: mapTopChromePadding,
      left: mapSidePadding,
      right: mapSidePadding,
      bottom:
          bottomSafeInset +
          (showCarouselCard
              ? carouselBottomPadding + carouselCardHeight + mapPinBottomExtra
              : mapPinBottomExtra),
    );
  }

  /// Keeps clustered pins above the bottom studio card strip after zoom.
  static EdgeInsets clusterFitPadding({required double bottomSafeInset}) {
    return EdgeInsets.only(
      top: mapTopChromePadding,
      left: mapSidePadding,
      right: mapSidePadding,
      bottom:
          bottomSafeInset +
          carouselBottomPadding +
          carouselCardHeight +
          mapPinBottomExtra,
    );
  }

  /// Expand cluster bounds — more to the south where carousel covers the map.
  static LatLngBounds clusterFitBounds(LatLngBounds bounds) {
    final latSpan = (bounds.north - bounds.south).clamp(0.00005, 90.0);
    final lngSpan = (bounds.east - bounds.west).clamp(0.00005, 180.0);
    return LatLngBounds(
      LatLng(bounds.south - latSpan * 0.22, bounds.west - lngSpan * 0.12),
      LatLng(bounds.north + latSpan * 0.1, bounds.east + lngSpan * 0.12),
    );
  }

  /// Approximate fetch radius from map zoom (zoom 15 ≈ 3 km, 14 ≈ 6 km, …).
  static double searchRadiusKmForZoom(double zoom) {
    final km = 3.0 * math.pow(2, 15 - zoom);
    return km.clamp(minSearchRadiusKm, maxSearchRadiusKm).toDouble();
  }

  /// Fetch radius for map load — matches the padded on-screen area only.
  /// Broader areas use «Search this area».
  static double searchRadiusKmForMapLoad({
    required MapCamera camera,
    required LatLng center,
    EdgeInsets? pinPadding,
  }) {
    final paddedKm = pinPadding != null
        ? maxPaddedCornerDistanceKm(camera, pinPadding, center)
        : 0.0;
    if (paddedKm > 0) {
      return paddedKm.clamp(0.5, maxSearchRadiusKm);
    }
    final viewportKm = maxCornerDistanceKm(camera.visibleBounds, center);
    if (viewportKm > 0) {
      return viewportKm.clamp(0.5, maxSearchRadiusKm);
    }
    return searchRadiusKmForZoom(camera.zoom);
  }

  /// Farthest padded screen corner from [from] — matches visible pin area.
  static double maxPaddedCornerDistanceKm(
    MapCamera camera,
    EdgeInsets padding,
    LatLng from,
  ) {
    final size = camera.nonRotatedSize;
    if (!size.width.isFinite ||
        !size.height.isFinite ||
        size.width <= 0 ||
        size.height <= 0) {
      return 0;
    }
    final maxX = size.width - padding.right;
    final maxY = size.height - padding.bottom;
    if (padding.left >= maxX || padding.top >= maxY) {
      return maxCornerDistanceKm(camera.visibleBounds, from);
    }
    const distance = Distance();
    final corners = <LatLng>[
      camera.screenOffsetToLatLng(Offset(padding.left, padding.top)),
      camera.screenOffsetToLatLng(Offset(maxX, padding.top)),
      camera.screenOffsetToLatLng(Offset(padding.left, maxY)),
      camera.screenOffsetToLatLng(Offset(maxX, maxY)),
    ];
    var maxKm = 0.0;
    for (final corner in corners) {
      final km = distance.as(LengthUnit.Kilometer, from, corner);
      if (km > maxKm) maxKm = km;
    }
    return maxKm;
  }

  /// Geographic bounds of the padded on-screen pin area.
  static LatLngBounds? pinVisibleLatLngBounds(
    MapCamera camera,
    EdgeInsets padding,
  ) {
    final size = camera.nonRotatedSize;
    if (!size.width.isFinite ||
        !size.height.isFinite ||
        size.width <= 0 ||
        size.height <= 0) {
      return null;
    }
    final maxX = size.width - padding.right;
    final maxY = size.height - padding.bottom;
    if (padding.left >= maxX || padding.top >= maxY) {
      return camera.visibleBounds;
    }
    final nw = camera.screenOffsetToLatLng(Offset(padding.left, padding.top));
    final se = camera.screenOffsetToLatLng(Offset(maxX, maxY));
    return LatLngBounds(
      LatLng(
        math.min(nw.latitude, se.latitude),
        math.min(nw.longitude, se.longitude),
      ),
      LatLng(
        math.max(nw.latitude, se.latitude),
        math.max(nw.longitude, se.longitude),
      ),
    );
  }

  /// Widen [bounds] by [bleedKm] on each side (approximate).
  static LatLngBounds expandBoundsByKm(LatLngBounds bounds, double bleedKm) {
    if (bleedKm <= 0) return bounds;
    final latMid = (bounds.north + bounds.south) / 2;
    final latDelta = bleedKm / 111.32;
    final cosLat = math.cos(latMid * math.pi / 180).abs().clamp(0.01, 1.0);
    final lngDelta = bleedKm / (111.32 * cosLat);
    return LatLngBounds(
      LatLng(bounds.south - latDelta, bounds.west - lngDelta),
      LatLng(bounds.north + latDelta, bounds.east + lngDelta),
    );
  }

  static bool containsPoint(
    LatLngBounds bounds,
    LatLng point, {
    double padFraction = visibleBoundsPadFraction,
  }) {
    if (padFraction == 0) return bounds.contains(point);
    final latSpan = bounds.north - bounds.south;
    final lngSpan = bounds.east - bounds.west;
    final south = bounds.south - latSpan * padFraction;
    final north = bounds.north + latSpan * padFraction;
    final west = bounds.west - lngSpan * padFraction;
    final east = bounds.east + lngSpan * padFraction;
    return point.latitude >= south &&
        point.latitude <= north &&
        point.longitude >= west &&
        point.longitude <= east;
  }

  /// Whether [point] lies inside the on-screen map area minus UI chrome.
  static bool isPointInVisibleArea(
    MapCamera camera,
    LatLng point,
    EdgeInsets padding,
  ) {
    final size = camera.nonRotatedSize;
    if (!size.width.isFinite ||
        !size.height.isFinite ||
        size.width <= 0 ||
        size.height <= 0) {
      return false;
    }
    final maxX = size.width - padding.right;
    final maxY = size.height - padding.bottom;
    if (padding.left >= maxX || padding.top >= maxY) {
      return containsPoint(camera.visibleBounds, point);
    }
    final offset = camera.latLngToScreenOffset(point);
    return offset.dx >= padding.left &&
        offset.dx <= maxX &&
        offset.dy >= padding.top &&
        offset.dy <= maxY;
  }

  /// Studios whose pins fall inside the padded on-screen map area.
  static List<ExploreStudioItem> studiosForMapPins(
    List<ExploreStudioItem> studios,
    MapCamera camera, {
    required EdgeInsets pinPadding,
    required LatLng sortFrom,
  }) {
    if (studios.isEmpty) return const [];

    final paddedBounds = pinVisibleLatLngBounds(camera, pinPadding);
    if (paddedBounds != null) {
      final bleedBounds = expandBoundsByKm(paddedBounds, pinVisibilityBleedKm);
      final inPadded = studiosInBounds(
        studios,
        bleedBounds,
        sortFrom: sortFrom,
      );
      if (inPadded.isNotEmpty) return inPadded;
    }

    return studiosInBounds(
      studios,
      expandBoundsByKm(camera.visibleBounds, pinVisibilityBleedKm),
      sortFrom: sortFrom,
    );
  }

  /// Studios whose pins fall inside the padded on-screen map area.
  static List<ExploreStudioItem> studiosInVisibleArea(
    List<ExploreStudioItem> studios,
    MapCamera camera, {
    required EdgeInsets padding,
    required LatLng sortFrom,
  }) {
    const distance = Distance();
    final visible = <ExploreStudioItem>[];
    for (final studio in studios) {
      final lat = studio.lat;
      final lng = studio.lng;
      if (lat == null || lng == null) continue;
      if (!isPointInVisibleArea(camera, LatLng(lat, lng), padding)) {
        continue;
      }
      visible.add(studio);
    }
    visible.sort((a, b) {
      final aLat = a.lat;
      final aLng = a.lng;
      final bLat = b.lat;
      final bLng = b.lng;
      if (aLat == null || aLng == null) return 1;
      if (bLat == null || bLng == null) return -1;
      final aKm = distance.as(
        LengthUnit.Kilometer,
        sortFrom,
        LatLng(aLat, aLng),
      );
      final bKm = distance.as(
        LengthUnit.Kilometer,
        sortFrom,
        LatLng(bLat, bLng),
      );
      return aKm.compareTo(bKm);
    });
    return visible;
  }

  /// Studios inside viewport bounds, sorted by distance from [sortFrom].
  static List<ExploreStudioItem> studiosInBounds(
    List<ExploreStudioItem> studios,
    LatLngBounds bounds, {
    required LatLng sortFrom,
    double padFraction = visibleBoundsPadFraction,
  }) {
    const distance = Distance();
    final visible = <ExploreStudioItem>[];
    for (final studio in studios) {
      final lat = studio.lat;
      final lng = studio.lng;
      if (lat == null || lng == null) continue;
      if (!containsPoint(bounds, LatLng(lat, lng), padFraction: padFraction)) {
        continue;
      }
      visible.add(studio);
    }
    visible.sort((a, b) {
      final aLat = a.lat;
      final aLng = a.lng;
      final bLat = b.lat;
      final bLng = b.lng;
      if (aLat == null || aLng == null) return 1;
      if (bLat == null || bLng == null) return -1;
      final aKm = distance.as(
        LengthUnit.Kilometer,
        sortFrom,
        LatLng(aLat, aLng),
      );
      final bKm = distance.as(
        LengthUnit.Kilometer,
        sortFrom,
        LatLng(bLat, bLng),
      );
      return aKm.compareTo(bKm);
    });
    return visible;
  }

  /// Farthest map corner from a point — used to detect stale search coverage.
  static double maxCornerDistanceKm(LatLngBounds bounds, LatLng from) {
    const distance = Distance();
    final corners = <LatLng>[
      LatLng(bounds.south, bounds.west),
      LatLng(bounds.south, bounds.east),
      LatLng(bounds.north, bounds.west),
      LatLng(bounds.north, bounds.east),
    ];
    var maxKm = 0.0;
    for (final corner in corners) {
      final km = distance.as(LengthUnit.Kilometer, from, corner);
      if (km > maxKm) maxKm = km;
    }
    return maxKm;
  }
}
