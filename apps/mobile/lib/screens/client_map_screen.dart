import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../constants/colors.dart';
import '../services/api_client.dart';
import 'location_picker_screen.dart';

class ClientMapScreen extends StatefulWidget {
  const ClientMapScreen({super.key, required this.onBack});

  final VoidCallback onBack;

  @override
  State<ClientMapScreen> createState() => _ClientMapScreenState();
}

class _ClientMapScreenState extends State<ClientMapScreen> {
  static const _cityKey = 'client_city';
  static const _latKey = 'client_lat';
  static const _lonKey = 'client_lon';

  String _city = 'Set location';
  double? _lat;
  double? _lon;
  final MapController _mapController = MapController();
  List<_NearbyStudio> _nearbyStudios = const [];
  bool _isLoadingNearby = true;

  @override
  void initState() {
    super.initState();
    _loadLocation();
  }

  Future<void> _loadLocation() async {
    final prefs = await SharedPreferences.getInstance();
    final city = prefs.getString(_cityKey)?.trim();
    final lat = prefs.getDouble(_latKey);
    final lon = prefs.getDouble(_lonKey);
    if (!mounted) return;
    setState(() {
      _city = (city != null && city.isNotEmpty) ? city : 'Set location';
      _lat = lat;
      _lon = lon;
    });
    if (_lat != null && _lon != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _mapController.move(LatLng(_lat!, _lon!), 14);
      });
    }
    await _loadNearbyStudios();
  }

  Future<void> _openLocationInput() async {
    final picked = await Navigator.of(context).push<LocationPickerResult>(
      MaterialPageRoute(
        builder: (_) => LocationPickerScreen(
          initialCity: _city == 'Set location' ? '' : _city,
        ),
      ),
    );
    if (picked == null || picked.city.trim().isEmpty) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_cityKey, picked.city.trim());
    if (picked.lat != null && picked.lon != null) {
      await prefs.setDouble(_latKey, picked.lat!);
      await prefs.setDouble(_lonKey, picked.lon!);
    }
    if (!mounted) return;
    setState(() {
      _city = picked.city.trim();
      if (picked.lat != null && picked.lon != null) {
        _lat = picked.lat;
        _lon = picked.lon;
      }
    });
    if (_lat != null && _lon != null) {
      _mapController.move(LatLng(_lat!, _lon!), 14);
    }
    await _loadNearbyStudios();
  }

  Future<void> _loadNearbyStudios() async {
    if (!mounted) return;
    setState(() => _isLoadingNearby = true);
    try {
      final query = StringBuffer('/studios/nearby?limit=25');
      if (_lat != null && _lon != null) {
        query
          ..write('&lat=')
          ..write(_lat!.toStringAsFixed(6))
          ..write('&lng=')
          ..write(_lon!.toStringAsFixed(6))
          ..write('&radius=50');
      }
      final raw = await ApiClient.get(query.toString(), null);
      final list = raw is List ? raw : <dynamic>[];
      final mapped = <_NearbyStudio>[];
      for (final item in list) {
        if (item is! Map<String, dynamic>) continue;
        final lat = (item['latitude'] as num?)?.toDouble();
        final lon = (item['longitude'] as num?)?.toDouble();
        mapped.add(
          _NearbyStudio(
            id: (item['id'] ?? '').toString(),
            name: (item['name'] ?? 'Studio').toString(),
            address: (item['address'] ?? '').toString(),
            lat: lat,
            lon: lon,
            distanceKm: (item['distance'] as num?)?.toDouble(),
          ),
        );
      }
      if (!mounted) return;
      setState(() {
        _nearbyStudios = mapped;
        _isLoadingNearby = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _nearbyStudios = const [];
        _isLoadingNearby = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final center = (_lat != null && _lon != null)
        ? LatLng(_lat!, _lon!)
        : const LatLng(21.0285, 105.8542);
    final hasCoords = _lat != null && _lon != null;
    return Material(
      color: AppColors.backgroundPrimary,
      child: Stack(
        children: [
          Positioned.fill(
            child: FlutterMap(
              mapController: _mapController,
              options: MapOptions(initialCenter: center, initialZoom: hasCoords ? 14 : 10),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.henzo.mobile',
                ),
                MarkerLayer(
                  markers: _nearbyStudios
                      .where((s) => s.lat != null && s.lon != null)
                      .map(
                        (s) => Marker(
                          point: LatLng(s.lat!, s.lon!),
                          width: 34,
                          height: 34,
                          child: Container(
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: AppColors.backgroundPrimary,
                              border: Border.all(
                                color: AppColors.primary500,
                                width: 2.5,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.15),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: const Icon(
                              Icons.fitness_center,
                              size: 16,
                              color: AppColors.primary500,
                            ),
                          ),
                        ),
                      )
                      .toList(),
                ),
                if (hasCoords)
                  MarkerLayer(
                    markers: [
                      Marker(
                        point: LatLng(_lat!, _lon!),
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
                                      _city,
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
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 14),
                        child: Row(
                          children: [
                            Text(
                              'Nearby studios',
                              style: TextStyle(
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
                            : _nearbyStudios.isEmpty
                                ? const Center(
                                    child: Text(
                                      'No studios found nearby',
                                      style: TextStyle(color: AppColors.textSecondary),
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
