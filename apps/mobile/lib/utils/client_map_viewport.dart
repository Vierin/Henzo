import 'package:flutter/material.dart';
import 'dart:math' as math;

import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../screens/client/client_explore_models.dart';

/// Viewport filtering and zoom-based fetch radius for the client map.
abstract final class ClientMapViewport {
  static const mapFetchLimit = 100;
  /// Pins and carousel — strict viewport, no bleed past screen edges.
  static const visibleBoundsPadFraction = 0.0;
  /// Class schedule prefetch only — slightly ahead of pan direction.
  static const preloadBoundsPadFraction = 0.06;
  static const minSearchRadiusKm = 3.0;
  static const maxSearchRadiusKm = 50.0;
  static const clusterDisableZoom = 14;
  static const mapScheduleLimit = 15;
  static const classesCacheMaxSize = 15;
  static const carouselCardHeight = 170.0;
  static const carouselBottomPadding = 24.0;
  static const mapTopChromePadding = 72.0;
  static const mapSidePadding = 32.0;
  /// Extra bottom inset so southern pins are not clipped by the carousel strip.
  static const mapPinBottomExtra = 56.0;

  /// Keeps clustered pins above the bottom studio card strip after zoom.
  static EdgeInsets clusterFitPadding({
    required double bottomSafeInset,
  }) {
    return EdgeInsets.only(
      top: mapTopChromePadding,
      left: mapSidePadding,
      right: mapSidePadding,
      bottom: bottomSafeInset +
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
  static double maxCornerDistanceKm(
    LatLngBounds bounds,
    LatLng from,
  ) {
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
