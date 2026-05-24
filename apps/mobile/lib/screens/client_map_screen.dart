import 'dart:async';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import '../services/api_client.dart';
import '../services/client_location_store.dart';
import '../services/cache/client_nearby_cache.dart';
import '../utils/load_error_message.dart';
import '../utils/nearby_payload.dart';
import '../widgets/common/load_error_view.dart';
import '../widgets/map/henzo_map_layers.dart';
import 'location_picker_screen.dart';

class ClientMapScreen extends StatefulWidget {
  const ClientMapScreen({super.key, required this.onBack});

  final VoidCallback onBack;

  @override
  State<ClientMapScreen> createState() => _ClientMapScreenState();
}

class _ClientMapScreenState extends State<ClientMapScreen> {
  final MapController _mapController = MapController();
  ClientLocationStore? _locationStore;
  final Distance _distance = const Distance();
  List<_NearbyStudio> _nearbyStudios = const [];
  bool _isLoadingNearby = true;
  String? _nearbyLoadError;
  bool _showSearchThisArea = false;
  double? _lastSearchLat;
  double? _lastSearchLon;
  double? _pendingSearchLat;
  double? _pendingSearchLon;
  static const double _searchAreaThresholdKm = 2.0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _syncMapToLocation());
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final next = context.read<ClientLocationStore>();
    if (_locationStore == next) return;
    _locationStore?.removeListener(_onSharedLocationChanged);
    _locationStore = next;
    _locationStore!.addListener(_onSharedLocationChanged);
  }

  @override
  void dispose() {
    _locationStore?.removeListener(_onSharedLocationChanged);
    super.dispose();
  }

  void _onSharedLocationChanged() {
    if (!mounted) return;
    _syncMapToLocation();
    unawaited(_loadNearbyStudios());
  }

  void _syncMapToLocation() {
    if (!mounted) return;
    final loc = context.read<ClientLocationStore>();
    if (loc.lat != null && loc.lon != null) {
      _mapController.move(LatLng(loc.lat!, loc.lon!), 14);
    }
  }

  Future<void> _openLocationInput() async {
    final loc = context.read<ClientLocationStore>();
    final picked = await Navigator.of(context).push<LocationPickerResult>(
      MaterialPageRoute(
        builder: (_) => LocationPickerScreen(
          initialCity: loc.displayLabel(''),
        ),
      ),
    );
    if (picked == null || picked.city.trim().isEmpty) return;
    await context.read<ClientLocationStore>().applyFromPicker(picked);
    if (!mounted) return;
    setState(() {
      _showSearchThisArea = false;
      _pendingSearchLat = null;
      _pendingSearchLon = null;
    });
    _syncMapToLocation();
    await _loadNearbyStudios();
  }

  Future<void> _loadNearbyStudios({double? searchLat, double? searchLon}) async {
    final loc = context.read<ClientLocationStore>();
    final effectiveLat = searchLat ?? loc.lat;
    final effectiveLon = searchLon ?? loc.lon;
    if (!mounted) return;
    setState(() {
      _isLoadingNearby = true;
      _nearbyLoadError = null;
      _showSearchThisArea = false;
    });
    try {
      final query = StringBuffer('/studios/nearby?limit=25');
      if (effectiveLat != null && effectiveLon != null) {
        query
          ..write('&lat=')
          ..write(effectiveLat.toStringAsFixed(6))
          ..write('&lng=')
          ..write(effectiveLon.toStringAsFixed(6))
          ..write('&radius=50');
      }
      final path = query.toString();
      dynamic raw = ClientNearbyCache.get(path);
      if (raw == null &&
          effectiveLat != null &&
          effectiveLon != null) {
        final sliced = ClientNearbyCache.sliceFromHomeCache(
          effectiveLat,
          effectiveLon,
          take: 25,
        );
        if (sliced != null) {
          raw = sliced;
        }
      }
      raw ??= await ApiClient.get(path, null);
      ClientNearbyCache.put(path, raw);
      final list = extractStudiosListFromNearby(raw);
      final mapped = <_NearbyStudio>[];
      for (final item in list) {
        if (item is! Map) continue;
        final data = Map<String, dynamic>.from(item);
        final lat = (data['latitude'] as num?)?.toDouble();
        final lon = (data['longitude'] as num?)?.toDouble();
        mapped.add(
          _NearbyStudio(
            id: (data['id'] ?? '').toString(),
            name: (data['name'] ?? 'Studio').toString(),
            address: (data['address'] ?? '').toString(),
            lat: lat,
            lon: lon,
            distanceKm: (data['distance'] as num?)?.toDouble(),
          ),
        );
      }
      if (!mounted) return;
      setState(() {
        _nearbyStudios = mapped;
        _isLoadingNearby = false;
        _nearbyLoadError = null;
        _lastSearchLat = effectiveLat;
        _lastSearchLon = effectiveLon;
        _pendingSearchLat = null;
        _pendingSearchLon = null;
      });
    } catch (e) {
      if (!mounted) return;
      final locale = context.read<LocaleProvider>();
      setState(() {
        _isLoadingNearby = false;
        _nearbyLoadError = loadErrorMessage(locale, e);
        _lastSearchLat = effectiveLat;
        _lastSearchLon = effectiveLon;
      });
    }
  }

  void _handleMapPositionChanged(MapCamera camera, bool hasGesture) {
    if (!hasGesture) return;
    final center = camera.center;
    final loc = context.read<ClientLocationStore>();
    final baseLat = _lastSearchLat ?? loc.lat;
    final baseLon = _lastSearchLon ?? loc.lon;
    if (baseLat == null || baseLon == null) return;
    final movedKm = _distance.as(
      LengthUnit.Kilometer,
      LatLng(baseLat, baseLon),
      center,
    );
    if (movedKm >= _searchAreaThresholdKm) {
      if (!mounted) return;
      setState(() {
        _pendingSearchLat = center.latitude;
        _pendingSearchLon = center.longitude;
        _showSearchThisArea = true;
      });
      return;
    }
    if (_showSearchThisArea) {
      setState(() {
        _showSearchThisArea = false;
        _pendingSearchLat = null;
        _pendingSearchLon = null;
      });
    }
  }

  Future<void> _searchThisArea() async {
    final lat = _pendingSearchLat;
    final lon = _pendingSearchLon;
    if (lat == null || lon == null) return;
    await _loadNearbyStudios(searchLat: lat, searchLon: lon);
  }

  @override
  Widget build(BuildContext context) {
    final loc = context.watch<ClientLocationStore>();
    final locale = context.watch<LocaleProvider>();
    final center = (loc.lat != null && loc.lon != null)
        ? LatLng(loc.lat!, loc.lon!)
        : const LatLng(21.0285, 105.8542);
    final hasCoords = loc.lat != null && loc.lon != null;
    final cityLabel = loc.displayLabel(locale.t('clientHome.setLocation'));
    return Material(
      color: AppColors.backgroundPrimary,
      child: Stack(
        children: [
          Positioned.fill(
            child: FlutterMap(
              mapController: _mapController,
              options: MapOptions(
                initialCenter: center,
                initialZoom: hasCoords ? 14 : 10,
                onPositionChanged: _handleMapPositionChanged,
                interactionOptions: HenzoMapLayers.interactionOptions(),
              ),
              children: [
                HenzoMapLayers.cartoLightTileLayer(),
                MarkerLayer(
                  markers: _nearbyStudios
                      .where((s) => s.lat != null && s.lon != null)
                      .map(
                        (s) => Marker(
                          point: LatLng(s.lat!, s.lon!),
                          width: 32,
                          height: 32,
                          child: const Icon(
                            Icons.location_on,
                            size: 32,
                            color: AppColors.primary500,
                          ),
                        ),
                      )
                      .toList(),
                ),
                if (hasCoords)
                  MarkerLayer(
                    markers: [
                      Marker(
                        point: LatLng(loc.lat!, loc.lon!),
                        width: 26,
                        height: 26,
                        child: Container(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppColors.primary500,
                            border: Border.all(color: Colors.white, width: 3),
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.primary500.withValues(alpha: 0.35),
                                blurRadius: 10,
                                spreadRadius: 2,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                HenzoMapLayers.cartoAttribution(),
              ],
            ),
          ),
          Positioned.fill(
            child: IgnorePointer(
              child: Container(
                color: const Color(0x1FE1D7C8),
              ),
            ),
          ),
          Positioned(
            top: 10,
            left: 12,
            right: 12,
            child: SafeArea(
              bottom: false,
              child: Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: BackdropFilter(
                      filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
                      child: Material(
                        color: Colors.white.withValues(alpha: 0.45),
                        borderRadius: BorderRadius.circular(999),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(999),
                          onTap: widget.onBack,
                          child: const Padding(
                            padding: EdgeInsets.all(10),
                            child: Icon(Icons.arrow_back, color: AppColors.textPrimary),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
                        child: Material(
                          color: Colors.white.withValues(alpha: 0.45),
                          borderRadius: BorderRadius.circular(12),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(12),
                            onTap: _openLocationInput,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 12,
                              ),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppColors.borderPrimary),
                              ),
                              child: Row(
                                children: [
                                  const Icon(
                                    Icons.location_on_outlined,
                                    size: 18,
                                    color: AppColors.textSecondary,
                                  ),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      cityLabel,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (_showSearchThisArea)
            Positioned(
              top: 68,
              left: 0,
              right: 0,
              child: SafeArea(
                bottom: false,
                child: Center(
                  child: ElevatedButton.icon(
                    onPressed: _isLoadingNearby ? null : _searchThisArea,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary500,
                      foregroundColor: Colors.white,
                      elevation: 4,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 10,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                    icon: const Icon(Icons.search, size: 16),
                    label: const Text(
                      'Search this area',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ),
            ),
          Positioned.fill(
            top: 84,
            child: DraggableScrollableSheet(
              minChildSize: 0.16,
              initialChildSize: 0.22,
              maxChildSize: 0.62,
              builder: (context, scrollController) {
                return Container(
                  decoration: const BoxDecoration(
                    color: AppColors.backgroundPrimary,
                    borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
                    boxShadow: [
                      BoxShadow(
                        color: Color(0x22000000),
                        blurRadius: 10,
                        offset: Offset(0, -2),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      const SizedBox(height: 8),
                      Container(
                        width: 42,
                        height: 5,
                        decoration: BoxDecoration(
                          color: AppColors.borderSecondary,
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                        child: Row(
                          children: [
                            Text(
                              locale.t('clientMap.nearbyStudios'),
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 8),
                      Expanded(
                        child: _isLoadingNearby
                            ? const Center(child: CircularProgressIndicator())
                            : _nearbyLoadError != null
                                ? LoadErrorView(
                                    compact: true,
                                    message: _nearbyLoadError!,
                                    onRetry: () => _loadNearbyStudios(
                                      searchLat: _lastSearchLat,
                                      searchLon: _lastSearchLon,
                                    ),
                                  )
                            : _nearbyStudios.isEmpty
                                ? Center(
                                    child: Text(
                                      locale.t('clientMap.noStudiosNearby'),
                                      style: const TextStyle(
                                        color: AppColors.textSecondary,
                                      ),
                                    ),
                                  )
                                : ListView.separated(
                                    controller: scrollController,
                                    itemCount: _nearbyStudios.length,
                                    separatorBuilder: (_, __) => const Divider(
                                      height: 1,
                                      color: AppColors.borderPrimary,
                                    ),
                                    itemBuilder: (_, index) {
                                      final studio = _nearbyStudios[index];
                                      return ListTile(
                                        contentPadding: const EdgeInsets.symmetric(
                                          horizontal: 14,
                                          vertical: 2,
                                        ),
                                        leading: Container(
                                          width: 30,
                                          height: 30,
                                          decoration: const BoxDecoration(
                                            color: AppColors.primary50,
                                            shape: BoxShape.circle,
                                          ),
                                          child: const Icon(
                                            Icons.fitness_center,
                                            size: 15,
                                            color: AppColors.primary500,
                                          ),
                                        ),
                                        title: Text(
                                          studio.name,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w700,
                                            color: AppColors.textPrimary,
                                          ),
                                        ),
                                        subtitle: Text(
                                          studio.address.isEmpty ? 'No address' : studio.address,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        trailing: studio.distanceKm != null
                                            ? Text(
                                                '${studio.distanceKm!.toStringAsFixed(1)} km',
                                                style: const TextStyle(
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.w700,
                                                  color: AppColors.textSecondary,
                                                ),
                                              )
                                            : null,
                                        onTap: () {
                                          if (studio.lat == null || studio.lon == null) return;
                                          _mapController.move(
                                            LatLng(studio.lat!, studio.lon!),
                                            15,
                                          );
                                        },
                                      );
                                    },
                                  ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _NearbyStudio {
  const _NearbyStudio({
    required this.id,
    required this.name,
    required this.address,
    this.lat,
    this.lon,
    this.distanceKm,
  });

  final String id;
  final String name;
  final String address;
  final double? lat;
  final double? lon;
  final double? distanceKm;
}
