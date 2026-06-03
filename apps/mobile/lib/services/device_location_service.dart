import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:location/location.dart' as location;
import 'package:permission_handler/permission_handler.dart';

/// Android-safe GPS (timeouts, permission_handler, fallbacks).
/// Same strategy as [AddressPickerModal].
abstract final class DeviceLocationService {
  DeviceLocationService._();

  static const _freshLastKnownMaxAge = Duration(minutes: 5);
  static Future<Position?>? _inflightResolve;

  static bool permissionGranted(LocationPermission permission) =>
      permission == LocationPermission.always ||
      permission == LocationPermission.whileInUse;

  static bool isUsablePosition(Position? position) {
    if (position == null) return false;
    final lat = position.latitude;
    final lon = position.longitude;
    if (lat.isNaN || lon.isNaN) return false;
    if (lat.abs() < 1e-6 && lon.abs() < 1e-6) return false;
    return lat.abs() <= 90 && lon.abs() <= 180;
  }

  static bool _isFreshLastKnown(Position position) {
    final age = DateTime.now().difference(position.timestamp);
    return age <= _freshLastKnownMaxAge;
  }

  static LocationSettings _gpsSettings({
    Duration timeLimit = const Duration(seconds: 20),
    bool forceLocationManager = false,
    LocationAccuracy accuracy = LocationAccuracy.low,
  }) {
    if (Platform.isAndroid) {
      return AndroidSettings(
        accuracy: accuracy,
        timeLimit: timeLimit,
        distanceFilter: 0,
        forceLocationManager: forceLocationManager,
      );
    }
    if (Platform.isIOS) {
      return AppleSettings(
        accuracy: accuracy,
        timeLimit: timeLimit,
        distanceFilter: 0,
      );
    }
    return LocationSettings(
      accuracy: accuracy,
      timeLimit: timeLimit,
      distanceFilter: 0,
    );
  }

  /// [openSettingsOnDeniedForever] — e.g. open app settings after snack.
  static Future<bool> ensureAccess({
    bool openSettingsOnDeniedForever = true,
  }) async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      return false;
    }

    var geoPermission = await Geolocator.checkPermission();
    if (geoPermission == LocationPermission.denied) {
      geoPermission = await Geolocator.requestPermission();
    }

    if (!permissionGranted(geoPermission) && Platform.isAndroid) {
      var phStatus = await Permission.location.status;
      if (!phStatus.isGranted && !phStatus.isLimited) {
        phStatus = await Permission.location.request();
      }
      geoPermission = await Geolocator.checkPermission();
    }

    if (!permissionGranted(geoPermission)) {
      await Future<void>.delayed(const Duration(milliseconds: 350));
      geoPermission = await Geolocator.checkPermission();
    }

    if (permissionGranted(geoPermission)) return true;

    if (openSettingsOnDeniedForever &&
        (geoPermission == LocationPermission.deniedForever ||
            await Permission.location.isPermanentlyDenied)) {
      await openAppSettings();
    }
    return false;
  }

  static Future<Position?> resolvePosition() async {
    final active = _inflightResolve;
    if (active != null) return active;
    final future = _resolvePositionInternal();
    _inflightResolve = future;
    try {
      return await future;
    } finally {
      if (identical(_inflightResolve, future)) {
        _inflightResolve = null;
      }
    }
  }

  static Future<Position?> _resolvePositionInternal() async {
    Position? lastKnown;
    try {
      lastKnown = await Geolocator.getLastKnownPosition();
    } catch (e) {
      if (kDebugMode) debugPrint('[DeviceLocation] lastKnown: $e');
    }

    if (isUsablePosition(lastKnown) && _isFreshLastKnown(lastKnown!)) {
      return lastKnown;
    }

    if (Platform.isAndroid) {
      // Fast path: vendor GPS service often responds here when geolocator hangs.
      final viaLocationPlugin = await _tryLocationPlugin();
      if (isUsablePosition(viaLocationPlugin)) return viaLocationPlugin;

      // Keep Android attempts short to avoid "infinite" loaders.
      final streamPos = await _tryPositionStream(forceLocationManager: false);
      if (streamPos != null) return streamPos;

      final pos = await _tryCurrentPosition(
        forceLocationManager: false,
        accuracy: LocationAccuracy.low,
        timeout: const Duration(seconds: 10),
      );
      if (pos != null) return pos;

      final forcedPos = await _tryCurrentPosition(
        forceLocationManager: true,
        accuracy: LocationAccuracy.medium,
        timeout: const Duration(seconds: 10),
      );
      if (forcedPos != null) return forcedPos;
    } else {
      final pos = await _tryCurrentPosition(forceLocationManager: false);
      if (pos != null) return pos;
      final streamPos = await _tryPositionStream(forceLocationManager: false);
      if (streamPos != null) return streamPos;
    }

    if (isUsablePosition(lastKnown)) return lastKnown;

    try {
      final retry = await Geolocator.getLastKnownPosition();
      if (isUsablePosition(retry)) return retry;
    } catch (_) {}

    return null;
  }

  static Future<Position?> _tryCurrentPosition({
    required bool forceLocationManager,
    LocationAccuracy accuracy = LocationAccuracy.low,
    Duration timeout = const Duration(seconds: 18),
  }) async {
    try {
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: _gpsSettings(
          forceLocationManager: forceLocationManager,
          accuracy: accuracy,
        ),
      ).timeout(timeout);
      return isUsablePosition(pos) ? pos : null;
    } catch (e) {
      if (kDebugMode) {
        debugPrint(
          '[DeviceLocation] getCurrentPosition force=$forceLocationManager: $e',
        );
      }
      return null;
    }
  }

  static Future<Position?> _tryPositionStream({
    required bool forceLocationManager,
  }) async {
    StreamSubscription<Position>? sub;
    try {
      final completer = Completer<Position?>();
      final stream = Geolocator.getPositionStream(
        locationSettings: _gpsSettings(
          forceLocationManager: forceLocationManager,
          timeLimit: const Duration(seconds: 10),
          accuracy: LocationAccuracy.low,
        ),
      );
      sub = stream.listen(
        (position) {
          if (isUsablePosition(position) && !completer.isCompleted) {
            completer.complete(position);
          }
        },
        onError: (Object e) {
          if (kDebugMode) debugPrint('[DeviceLocation] stream: $e');
          if (!completer.isCompleted) completer.complete(null);
        },
        cancelOnError: true,
      );
      final pos = await completer.future.timeout(
        const Duration(seconds: 10),
        onTimeout: () => null,
      );
      return isUsablePosition(pos) ? pos : null;
    } catch (e) {
      if (kDebugMode) debugPrint('[DeviceLocation] stream failed: $e');
      return null;
    } finally {
      await sub?.cancel();
    }
  }

  static Future<Position?> _tryLocationPlugin() async {
    try {
      final loc = location.Location();
      var serviceEnabled = await loc.serviceEnabled();
      if (!serviceEnabled) {
        serviceEnabled = await loc.requestService();
      }
      if (!serviceEnabled) return null;

      var permission = await loc.hasPermission();
      if (permission == location.PermissionStatus.denied) {
        permission = await loc.requestPermission();
      }
      if (permission != location.PermissionStatus.granted &&
          permission != location.PermissionStatus.grantedLimited) {
        return null;
      }

      final data = await loc.getLocation().timeout(
        const Duration(seconds: 12),
        onTimeout: () => throw TimeoutException('location.getLocation'),
      );
      final lat = data.latitude;
      final lon = data.longitude;
      if (lat == null || lon == null) return null;
      final now = DateTime.now();
      final p = Position(
        latitude: lat,
        longitude: lon,
        timestamp: now,
        accuracy: data.accuracy ?? 100,
        altitude: data.altitude ?? 0,
        altitudeAccuracy: 0,
        heading: data.heading ?? 0,
        headingAccuracy: 0,
        speed: data.speed ?? 0,
        speedAccuracy: 0,
        floor: null,
        isMocked: false,
      );
      if (kDebugMode) {
        debugPrint('[DeviceLocation] location plugin -> ${p.latitude},${p.longitude}');
      }
      return isUsablePosition(p) ? p : null;
    } catch (e) {
      if (kDebugMode) debugPrint('[DeviceLocation] location plugin failed: $e');
      return null;
    }
  }

  static String cityFromAddress(String? address, String fallback) {
    final extracted = _extractCityFromAddress(address);
    if (extracted != null && extracted.isNotEmpty) return extracted;
    final trimmed = address?.trim() ?? '';
    if (trimmed.isNotEmpty) {
      final first = trimmed.split(',').first.trim();
      if (first.isNotEmpty) return first;
    }
    return fallback;
  }

  static String? _extractCityFromAddress(String? address) {
    if (address == null || address.trim().isEmpty) return null;
    final parts = address
        .split(',')
        .map((e) => e.trim())
        .where((e) => e.isNotEmpty)
        .toList();
    if (parts.isEmpty) return null;
    if (parts.length >= 2) return parts[parts.length - 2];
    return parts.first;
  }
}
