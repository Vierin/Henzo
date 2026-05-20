import 'dart:async';
import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'common/henzo_modal.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../constants/layout.dart';
import '../main.dart';
import 'common/sheet_action_button_style.dart';
import '../l10n/locale_provider.dart';
import '../services/mapbox_api_service.dart';
import 'map/henzo_map_layers.dart';

/// Result of address + location name pick.
class AddressPickerSelection {
  const AddressPickerSelection({
    required this.locationName,
    required this.address,
    required this.lat,
    required this.lon,
  });

  final String locationName;
  final String address;
  final double lat;
  final double lon;
}

/// Bottom sheet: location name → address search → map (Mapbox + CARTO).
class AddressPickerModal extends StatefulWidget {
  const AddressPickerModal({
    super.key,
    this.initialLocationName = '',
    required this.initialAddress,
    this.initialLat,
    this.initialLon,
  });

  final String initialLocationName;
  final String initialAddress;
  final double? initialLat;
  final double? initialLon;

  static Future<AddressPickerSelection?> show(
    BuildContext context, {
    String initialLocationName = '',
    required String initialAddress,
    double? initialLat,
    double? initialLon,
  }) {
    return showHenzoModalBottomSheet<AddressPickerSelection>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      isDismissible: false,
      enableDrag: true,
      builder: (sheetCtx) {
        final viewInsets = MediaQuery.viewInsetsOf(sheetCtx).bottom;
        return Padding(
          padding: EdgeInsets.only(top: 12, bottom: viewInsets),
          child: FractionallySizedBox(
            heightFactor: 0.92,
            child: AddressPickerModal(
              initialLocationName: initialLocationName,
              initialAddress: initialAddress,
              initialLat: initialLat,
              initialLon: initialLon,
            ),
          ),
        );
      },
    );
  }

  @override
  State<AddressPickerModal> createState() => _AddressPickerModalState();
}

class _AddressPickerModalState extends State<AddressPickerModal> {
  final _nameController = TextEditingController();
  final _searchController = TextEditingController();
  final _mapController = MapController();
  final _searchFocus = FocusNode();

  List<AddressSuggestion> _suggestions = [];
  bool _showSuggestions = false;
  bool _loadingSuggestions = false;
  bool _reverseGeocodeLoading = false;
  bool _currentLocationLoading = false;
  /// Bumps when user types in address; in-flight [_useCurrentLocation] ignores stale session.
  int _locationLoadSession = 0;
  Timer? _debounceTimer;

  double? _lat;
  double? _lon;
  String _address = '';

  @override
  void initState() {
    super.initState();
    _nameController.text = widget.initialLocationName;
    _address = widget.initialAddress;
    _searchController.text = widget.initialAddress;
    _lat = widget.initialLat;
    _lon = widget.initialLon;
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _nameController.dispose();
    _searchController.dispose();
    _searchFocus.dispose();
    super.dispose();
  }

  bool get _hasLocationName => _nameController.text.trim().isNotEmpty;

  bool get _hasSearchInput => _searchController.text.trim().isNotEmpty;

  bool get _hasCoordinates => _lat != null && _lon != null;

  bool get _mapInteractive =>
      _hasCoordinates ||
      (_hasLocationName && _searchController.text.trim().length > 3);

  bool _isUsablePosition(Position? position) {
    if (position == null) return false;
    final lat = position.latitude;
    final lon = position.longitude;
    if (lat.isNaN || lon.isNaN) return false;
    if (lat.abs() < 1e-6 && lon.abs() < 1e-6) return false;
    return lat.abs() <= 90 && lon.abs() <= 180;
  }

  bool _geoPermissionGranted(LocationPermission permission) =>
      permission == LocationPermission.always ||
      permission == LocationPermission.whileInUse;

  static const _freshLastKnownMaxAge = Duration(minutes: 5);

  LocationSettings _gpsSettings({
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

  Future<Position?> _readLastKnownPosition() async {
    try {
      return await Geolocator.getLastKnownPosition();
    } catch (e) {
      if (kDebugMode) debugPrint('[AddressPicker] lastKnown failed: $e');
      return null;
    }
  }

  bool _isFreshLastKnown(Position position) {
    final age = DateTime.now().difference(position.timestamp);
    return age <= _freshLastKnownMaxAge;
  }

  Future<bool> _ensureLocationAccess(LocaleProvider locale) async {
    final t = locale.t;
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      _showPickerSnack(t('addressPicker.locationServiceDisabled'));
      await Geolocator.openLocationSettings();
      return false;
    }

    var geoPermission = await Geolocator.checkPermission();
    if (geoPermission == LocationPermission.denied) {
      geoPermission = await Geolocator.requestPermission();
    }

    if (!_geoPermissionGranted(geoPermission)) {
      var phStatus = await Permission.location.status;
      if (!phStatus.isGranted && !phStatus.isLimited) {
        phStatus = await Permission.location.request();
      }
      geoPermission = await Geolocator.checkPermission();
    }

    if (_geoPermissionGranted(geoPermission)) return true;

    if (geoPermission == LocationPermission.deniedForever ||
        await Permission.location.isPermanentlyDenied) {
      _showPickerSnack(t('addressPicker.locationPermissionDenied'));
      await openAppSettings();
      return false;
    }

    _showPickerSnack(t('addressPicker.locationPermissionDenied'));
    return false;
  }

  Future<Position?> _tryCurrentPosition({
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
      return _isUsablePosition(pos) ? pos : null;
    } catch (e) {
      if (kDebugMode) {
        debugPrint(
          '[AddressPicker] getCurrentPosition '
          '(force=$forceLocationManager, accuracy=$accuracy): $e',
        );
      }
      return null;
    }
  }

  Future<Position?> _tryPositionStream({
    required bool forceLocationManager,
  }) async {
    StreamSubscription<Position>? sub;
    try {
      final completer = Completer<Position?>();
      final stream = Geolocator.getPositionStream(
        locationSettings: _gpsSettings(
          forceLocationManager: forceLocationManager,
          timeLimit: const Duration(seconds: 22),
          accuracy: LocationAccuracy.lowest,
        ),
      );
      sub = stream.listen(
        (position) {
          if (_isUsablePosition(position) && !completer.isCompleted) {
            completer.complete(position);
          }
        },
        onError: (Object e) {
          if (kDebugMode) debugPrint('[AddressPicker] stream error: $e');
          if (!completer.isCompleted) completer.complete(null);
        },
        cancelOnError: true,
      );
      final pos = await completer.future.timeout(
        const Duration(seconds: 24),
        onTimeout: () => null,
      );
      if (pos != null && kDebugMode) {
        debugPrint(
          '[AddressPicker] stream ${pos.latitude},${pos.longitude}',
        );
      }
      return _isUsablePosition(pos) ? pos : null;
    } catch (e) {
      if (kDebugMode) debugPrint('[AddressPicker] stream failed: $e');
      return null;
    } finally {
      await sub?.cancel();
    }
  }

  void _showPickerSnack(String message) {
    final rootCtx = henzoRootNavigatorKey.currentContext;
    final messenger = rootCtx != null
        ? ScaffoldMessenger.maybeOf(rootCtx)
        : ScaffoldMessenger.maybeOf(context);
    messenger?.showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _fetchSuggestions(String query) async {
    if (query.trim().length < 2) {
      setState(() {
        _suggestions = [];
        _showSuggestions = false;
      });
      return;
    }
    setState(() => _loadingSuggestions = true);
    final list = await MapboxApiService.getAutocomplete(
      query,
      country: 'VN',
      limit: 5,
    );
    if (!mounted) return;
    setState(() {
      _suggestions = list;
      _showSuggestions = list.isNotEmpty;
      _loadingSuggestions = false;
    });
  }

  void _clearAddressSearch() {
    _searchController.clear();
    setState(() {
      _address = '';
      _lat = null;
      _lon = null;
      _suggestions = [];
      _showSuggestions = false;
    });
  }

  void _onSearchChanged(String value) {
    if (value.isNotEmpty) {
      _locationLoadSession++;
      if (_currentLocationLoading) {
        setState(() => _currentLocationLoading = false);
      }
    }
    _debounceTimer?.cancel();
    setState(() {
      _address = value;
      _showSuggestions = value.trim().length >= 2;
    });
    if (value.trim().length >= 2) {
      _debounceTimer = Timer(
        const Duration(milliseconds: 300),
        () => _fetchSuggestions(value),
      );
    }
  }

  void _onSelectSuggestion(AddressSuggestion s) {
    _searchController.text = s.address;
    setState(() {
      _address = s.address;
      _lat = s.lat;
      _lon = s.lon;
      _suggestions = [];
      _showSuggestions = false;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _mapController.move(LatLng(s.lat, s.lon), 16);
    });
  }

  /// Fresh GPS fix, or cached coordinates when satellite fix times out.
  Future<({Position position, bool isCached})?> _resolveDevicePosition() async {
    final lastKnown = await _readLastKnownPosition();
    if (_isUsablePosition(lastKnown) && _isFreshLastKnown(lastKnown!)) {
      if (kDebugMode) {
        final age = DateTime.now().difference(lastKnown.timestamp);
        debugPrint(
          '[AddressPicker] fresh lastKnown ${lastKnown.latitude},'
          '${lastKnown.longitude} age=${age.inSeconds}s',
        );
      }
      return (position: lastKnown, isCached: false);
    }

    if (Platform.isAndroid) {
      var pos = await _tryCurrentPosition(forceLocationManager: true);
      if (pos != null) return (position: pos, isCached: false);

      pos = await _tryCurrentPosition(forceLocationManager: false);
      if (pos != null) return (position: pos, isCached: false);

      pos = await _tryPositionStream(forceLocationManager: true);
      if (pos != null) return (position: pos, isCached: false);

      pos = await _tryCurrentPosition(
        forceLocationManager: true,
        accuracy: LocationAccuracy.medium,
        timeout: const Duration(seconds: 22),
      );
      if (pos != null) return (position: pos, isCached: false);
    } else {
      var pos = await _tryCurrentPosition(forceLocationManager: false);
      if (pos != null) return (position: pos, isCached: false);

      pos = await _tryPositionStream(forceLocationManager: false);
      if (pos != null) return (position: pos, isCached: false);
    }

    if (_isUsablePosition(lastKnown)) {
      if (kDebugMode) {
        final age = DateTime.now().difference(lastKnown!.timestamp);
        debugPrint(
          '[AddressPicker] stale lastKnown ${lastKnown.latitude},'
          '${lastKnown.longitude} age=${age.inMinutes}m',
        );
      }
      return (position: lastKnown!, isCached: true);
    }

    final retryLastKnown = await _readLastKnownPosition();
    if (_isUsablePosition(retryLastKnown)) {
      return (position: retryLastKnown!, isCached: true);
    }

    return null;
  }

  void _applyResolvedCoordinates({
    required double lat,
    required double lon,
    required String address,
  }) {
    setState(() {
      _lat = lat;
      _lon = lon;
      _address = address;
      _searchController.text = address;
      _suggestions = [];
      _showSuggestions = false;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _mapController.move(LatLng(lat, lon), 16);
    });
  }

  Future<void> _useCurrentLocation() async {
    final locale = context.read<LocaleProvider>();
    final t = locale.t;
    FocusScope.of(context).unfocus();

    if (!await _ensureLocationAccess(locale)) return;
    if (!mounted) return;

    final session = ++_locationLoadSession;
    setState(() {
      _currentLocationLoading = true;
      _showSuggestions = false;
    });

    try {
      final resolved = await _resolveDevicePosition();
      if (!mounted || session != _locationLoadSession) return;
      if (resolved == null) {
        _showPickerSnack(
          '${t('addressPicker.locationDetectFailed')}\n'
          '${t('addressPicker.locationDetectFailedHint')}',
        );
        return;
      }

      final pos = resolved.position;
      if (resolved.isCached) {
        _showPickerSnack(t('addressPicker.locationUsingCachedPosition'));
      }
      if (!mounted || session != _locationLoadSession) return;

      ReverseGeocodeResult? result;
      try {
        result = await MapboxApiService.reverseGeocode(
          pos.latitude,
          pos.longitude,
        );
      } catch (e) {
        if (kDebugMode) debugPrint('[AddressPicker] reverse geocode: $e');
        result = null;
      }

      if (!mounted || session != _locationLoadSession) return;

      final geocoded = result?.address.trim() ?? '';
      final address = geocoded.isNotEmpty
          ? geocoded
          : '${pos.latitude.toStringAsFixed(6)}, '
              '${pos.longitude.toStringAsFixed(6)}';

      _applyResolvedCoordinates(
        lat: pos.latitude,
        lon: pos.longitude,
        address: address,
      );
    } catch (e) {
      if (kDebugMode) debugPrint('[AddressPicker] useCurrentLocation: $e');
      if (!mounted || session != _locationLoadSession) return;
      _showPickerSnack(t('addressPicker.locationDetectFailed'));
    } finally {
      if (mounted && session == _locationLoadSession) {
        setState(() => _currentLocationLoading = false);
      }
    }
  }

  Future<void> _onMapTap(TapPosition position, LatLng latLng) async {
    if (!_mapInteractive) return;

    setState(() {
      _lat = latLng.latitude;
      _lon = latLng.longitude;
      _reverseGeocodeLoading = true;
    });
    final result = await MapboxApiService.reverseGeocode(
      latLng.latitude,
      latLng.longitude,
    );
    if (!mounted) return;
    setState(() {
      _reverseGeocodeLoading = false;
      if (result != null) {
        _address = result.address;
        _searchController.text = result.address;
      }
    });
  }

  void _confirm() {
    final locale = context.read<LocaleProvider>();
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(content: Text(locale.t('addressPicker.nameRequired'))),
      );
      return;
    }
    if (_lat != null && _lon != null && _address.trim().isNotEmpty) {
      Navigator.of(context).pop(
        AddressPickerSelection(
          locationName: name,
          address: _address.trim(),
          lat: _lat!,
          lon: _lon!,
        ),
      );
    }
  }

  LatLng get _center {
    if (_lat != null && _lon != null) return LatLng(_lat!, _lon!);
    return const LatLng(21.0285, 105.8542);
  }

  InputDecoration _fieldDecoration({required String hint, Widget? suffixIcon}) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(fontSize: 16, color: AppColors.textTertiary),
      filled: true,
      fillColor: AppColors.backgroundPrimary,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.borderPrimary),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.primary500, width: 1.5),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      suffixIcon: suffixIcon,
    );
  }

  @override
  Widget build(BuildContext context) {
    final t = context.read<LocaleProvider>().t;
    final hasCoords = _lat != null && _lon != null;
    final canConfirm =
        _hasLocationName && hasCoords && _address.trim().isNotEmpty;

    return Material(
      color: AppColors.backgroundPrimary,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 10),
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.borderPrimary,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 12, 8, 8),
            child: Row(
              children: [
                const SizedBox(width: 48),
                Expanded(
                  child: Text(
                    t('addressPicker.title'),
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.3,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: kScreenPaddingHorizontal,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  t('addressPicker.locationNameLabel'),
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: _nameController,
                  textCapitalization: TextCapitalization.sentences,
                  onChanged: (_) => setState(() {}),
                  decoration: _fieldDecoration(
                    hint: t('addressPicker.locationNameHint'),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(
                      child: Text(
                        t('profileForm.address'),
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    InkWell(
                      onTap: _currentLocationLoading
                          ? null
                          : _useCurrentLocation,
                      borderRadius: BorderRadius.circular(6),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 2,
                          vertical: 2,
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (_currentLocationLoading)
                              const SizedBox(
                                width: 14,
                                height: 14,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: AppColors.primary500,
                                ),
                              )
                            else
                              SvgPicture.asset(
                                'assets/icons/icon-pin.svg',
                                width: 11,
                                height: 15,
                                colorFilter: const ColorFilter.mode(
                                  AppColors.primary500,
                                  BlendMode.srcIn,
                                ),
                              ),
                            const SizedBox(width: 4),
                            Text(
                              t('addressPicker.useCurrentLocation'),
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: _currentLocationLoading
                                    ? AppColors.textTertiary
                                    : AppColors.primary500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: _searchController,
                  focusNode: _searchFocus,
                  onChanged: _onSearchChanged,
                  onTap: () {
                    if (_suggestions.isEmpty &&
                        _searchController.text.trim().length >= 2) {
                      _fetchSuggestions(_searchController.text);
                    }
                  },
                  decoration:
                      _fieldDecoration(
                        hint: t('addressPicker.searchHint'),
                        suffixIcon: _loadingSuggestions
                            ? const Padding(
                                padding: EdgeInsets.all(12),
                                child: SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: AppColors.primary500,
                                  ),
                                ),
                              )
                            : _hasSearchInput
                            ? IconButton(
                                onPressed: _clearAddressSearch,
                                icon: const Icon(
                                  Icons.close,
                                  size: 20,
                                  color: AppColors.textSecondary,
                                ),
                              )
                            : null,
                      ).copyWith(
                        prefixIcon: Padding(
                          padding: const EdgeInsets.only(left: 12, right: 2),
                          child: SvgPicture.asset(
                            'assets/icons/icon-pin.svg',
                            width: 15,
                            height: 21,
                          ),
                        ),
                        prefixIconConstraints: const BoxConstraints(
                          minWidth: 32,
                          minHeight: 40,
                        ),
                      ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: kScreenPaddingHorizontal,
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  decoration: BoxDecoration(
                    color: AppColors.backgroundTertiary,
                    border: Border.all(color: AppColors.borderPrimary),
                  ),
                  child: Stack(
                    children: [
                      FlutterMap(
                        mapController: _mapController,
                        options: MapOptions(
                          initialCenter: _center,
                          initialZoom: hasCoords ? 16 : 10,
                          onTap: _onMapTap,
                          interactionOptions: HenzoMapLayers.interactionOptions(
                            interactive: _mapInteractive,
                          ),
                        ),
                        children: [
                          ColorFiltered(
                            colorFilter: ColorFilter.mode(
                              Colors.grey.withValues(alpha: 0.65),
                              BlendMode.saturation,
                            ),
                            child: HenzoMapLayers.cartoLightTileLayer(),
                          ),
                          HenzoMapLayers.cartoAttribution(),
                          if (hasCoords)
                            MarkerLayer(
                              markers: [
                                Marker(
                                  point: LatLng(_lat!, _lon!),
                                  width: 28,
                                  height: 28,
                                  alignment: Alignment.center,
                                  child: Container(
                                    decoration: BoxDecoration(
                                      color: AppColors.primary500,
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                        color: Colors.white,
                                        width: 3,
                                      ),
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.black.withValues(
                                            alpha: 0.3,
                                          ),
                                          blurRadius: 6,
                                          offset: const Offset(0, 2),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                        ],
                      ),
                      Positioned(
                        top: 8,
                        left: 8,
                        child: Column(
                          children: [
                            _MapZoomButton(
                              icon: Icons.add,
                              enabled: _mapInteractive,
                              onPressed: () {
                                final zoom = _mapController.camera.zoom + 1;
                                _mapController.move(
                                  _mapController.camera.center,
                                  zoom.clamp(3.0, 19.0),
                                );
                              },
                            ),
                            const SizedBox(height: 4),
                            _MapZoomButton(
                              icon: Icons.remove,
                              enabled: _mapInteractive,
                              onPressed: () {
                                final zoom = _mapController.camera.zoom - 1;
                                _mapController.move(
                                  _mapController.camera.center,
                                  zoom.clamp(3.0, 19.0),
                                );
                              },
                            ),
                          ],
                        ),
                      ),
                      if (!_mapInteractive)
                        Positioned.fill(
                          child: Container(
                            color: Colors.grey.withValues(alpha: 0.4),
                            alignment: Alignment.center,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 24,
                              ),
                              child: Text(
                                _hasLocationName
                                    ? t('addressPicker.enableMapHint')
                                    : t('addressPicker.enterNameFirstHint'),
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  color: Colors.white,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ),
                          ),
                        ),
                      if (_showSuggestions && _suggestions.isNotEmpty)
                        Positioned(
                          top: 8,
                          left: 8,
                          right: 8,
                          child: Material(
                            elevation: 8,
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              constraints: const BoxConstraints(maxHeight: 220),
                              decoration: BoxDecoration(
                                color: AppColors.backgroundPrimary,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: AppColors.borderPrimary,
                                ),
                              ),
                              child: ListView.builder(
                                shrinkWrap: true,
                                itemCount: _suggestions.length,
                                itemBuilder: (context, i) {
                                  final s = _suggestions[i];
                                  return ListTile(
                                    leading: const Icon(
                                      Icons.location_on_outlined,
                                      size: 20,
                                      color: AppColors.textSecondary,
                                    ),
                                    title: Text(
                                      s.address,
                                      style: const TextStyle(
                                        fontSize: 14,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                    onTap: () => _onSelectSuggestion(s),
                                  );
                                },
                              ),
                            ),
                          ),
                        ),
                      if (hasCoords && _mapInteractive)
                        Positioned(
                          bottom: 8,
                          left: 0,
                          right: 0,
                          child: Center(
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.5),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                t('addressPicker.mapHint'),
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.white.withValues(alpha: 0.95),
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ),
                          ),
                        ),
                      if (_reverseGeocodeLoading)
                        const Positioned.fill(
                          child: Center(
                            child: CircularProgressIndicator(
                              color: AppColors.primary500,
                            ),
                          ),
                        ),
                      if (!hasCoords &&
                          _hasSearchInput &&
                          _mapInteractive &&
                          !(_showSuggestions && _suggestions.isNotEmpty))
                        Positioned.fill(
                          child: Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.map_outlined,
                                  size: 48,
                                  color: AppColors.textTertiary,
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  t('addressPicker.selectAddressOnMap'),
                                  style: const TextStyle(
                                    fontSize: 14,
                                    color: AppColors.textSecondary,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                kScreenPaddingHorizontal,
                8,
                kScreenPaddingHorizontal,
                12,
              ),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: sheetCancelButtonStyle(),
                      child: Text(t('common.cancel')),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: canConfirm ? _confirm : null,
                      style: sheetPrimaryButtonStyle(),
                      child: Text(t('addressPicker.select')),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MapZoomButton extends StatelessWidget {
  const _MapZoomButton({
    required this.icon,
    required this.onPressed,
    this.enabled = true,
  });

  final IconData icon;
  final VoidCallback onPressed;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.backgroundPrimary,
      borderRadius: BorderRadius.circular(8),
      elevation: 2,
      child: InkWell(
        onTap: enabled ? onPressed : null,
        borderRadius: BorderRadius.circular(8),
        child: SizedBox(
          width: 36,
          height: 36,
          child: Icon(
            icon,
            size: 20,
            color: enabled ? AppColors.textPrimary : AppColors.textTertiary,
          ),
        ),
      ),
    );
  }
}
