import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import '../models/public_studio_preview.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../services/cache/client_nearby_cache.dart';
import '../services/client_favorites_store.dart';
import '../services/mapbox_api_service.dart';
import '../widgets/public/top_studio_card.dart';
import 'location_picker_screen.dart';
import 'public_studio_detail_screen.dart';

class PublicHomeScreen extends StatefulWidget {
  const PublicHomeScreen({super.key, this.onOpenMap});

  final VoidCallback? onOpenMap;

  @override
  State<PublicHomeScreen> createState() => _PublicHomeScreenState();
}

class _PublicHomeScreenState extends State<PublicHomeScreen> {
  static const _cityKey = 'client_city';
  static const _latKey = 'client_lat';
  static const _lonKey = 'client_lon';
  final TextEditingController _searchController = TextEditingController();
  List<PublicStudioPreview> _allStudios = const [];
  bool _isLoadingStudios = true;
  String? _selectedCity;
  double? _selectedLat;
  double? _selectedLon;
  bool _locationModalShown = false;
  final Set<String> _favoriteLoadingIds = <String>{};

  @override
  void initState() {
    super.initState();
    _loadSavedLocation();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadTopStudiosNearby() async {
    if (!mounted) return;
    setState(() => _isLoadingStudios = true);
    try {
      final query = StringBuffer('/studios/nearby?limit=50');
      if (_selectedLat != null && _selectedLon != null) {
        query
          ..write('&lat=')
          ..write(_selectedLat!.toStringAsFixed(6))
          ..write('&lng=')
          ..write(_selectedLon!.toStringAsFixed(6))
          ..write('&radius=50');
      }
      final path = query.toString();
      var raw = ClientNearbyCache.get(path);
      if (raw == null) {
        raw = await ApiClient.get(path, null);
        ClientNearbyCache.put(path, raw);
      }
      final list = _extractStudiosList(raw);
      final mapped = <PublicStudioPreview>[];
      for (final item in list) {
        if (item is! Map) continue;
        final data = Map<String, dynamic>.from(item);
        final categories = data['categories'];
        final parsedCategories = categories is List
            ? categories
                  .where((c) => c != null)
                  .map((c) => c.toString().trim())
                  .where((c) => c.isNotEmpty)
                  .toList()
            : <String>[];
        final rating = (data['avgRating'] as num?)?.toDouble() ?? 0;
        final address = (data['address'] ?? '').toString();
        final distanceKm = _distanceKmForStudio(
          data,
          (data['distance'] as num?)?.toDouble(),
        );
        final photos = data['photos'];
        final photoUrl = photos is List && photos.isNotEmpty
            ? photos.first?.toString()
            : null;
        mapped.add(
          PublicStudioPreview(
            id: (data['id'] ?? '').toString(),
            name: (data['name'] ?? 'Studio').toString(),
            categories: parsedCategories,
            rating: rating,
            address: address.isNotEmpty ? address : '—',
            distanceKm: distanceKm,
            photoUrl: photoUrl,
          ),
        );
      }
      if (!mounted) return;
      setState(() {
        _allStudios = mapped;
        _isLoadingStudios = false;
      });
      final token = context.read<AuthService>().accessToken;
      unawaited(context.read<ClientFavoritesStore>().sync(token, force: false));
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _allStudios = const [];
        _isLoadingStudios = false;
      });
    }
  }

  List<dynamic> _extractStudiosList(dynamic raw) {
    if (raw is List) return raw;
    if (raw is Map) {
      final data = raw['data'];
      if (data is List) return data;
      if (data is Map && data['items'] is List) {
        return data['items'] as List<dynamic>;
      }
      if (raw['items'] is List) return raw['items'] as List<dynamic>;
      if (raw['results'] is List) return raw['results'] as List<dynamic>;
      if (raw['studios'] is List) return raw['studios'] as List<dynamic>;
    }
    return const <dynamic>[];
  }

  /// Same idea as Explore: use API `distance` when present; otherwise Haversine
  /// from saved client position + studio coordinates (e.g. featured fallback).
  double? _distanceKmForStudio(Map<String, dynamic> data, double? apiDistance) {
    if (apiDistance != null) return apiDistance;
    if (_selectedLat == null || _selectedLon == null) return null;
    final slat =
        (data['latitude'] as num?)?.toDouble() ??
        (data['lat'] as num?)?.toDouble();
    final slng =
        (data['longitude'] as num?)?.toDouble() ??
        (data['lng'] as num?)?.toDouble() ??
        (data['lon'] as num?)?.toDouble();
    if (slat == null || slng == null) return null;
    const d = Distance();
    final meters = d.as(
      LengthUnit.Meter,
      LatLng(_selectedLat!, _selectedLon!),
      LatLng(slat, slng),
    );
    return meters / 1000.0;
  }

  Future<void> _loadSavedLocation() async {
    final prefs = await SharedPreferences.getInstance();
    final city = prefs.getString(_cityKey)?.trim();
    final lat = prefs.getDouble(_latKey);
    final lon = prefs.getDouble(_lonKey);
    if (!mounted) return;
    setState(() {
      _selectedCity = (city != null && city.isNotEmpty) ? city : null;
      _selectedLat = lat;
      _selectedLon = lon;
    });
    await _loadTopStudiosNearby();
    if ((_selectedCity == null || _selectedCity!.isEmpty) &&
        !_locationModalShown) {
      _locationModalShown = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _showLocationRequestModal();
      });
    }
  }

  Future<void> _persistLocation({
    required String city,
    double? lat,
    double? lon,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_cityKey, city);
    if (lat != null && lon != null) {
      await prefs.setDouble(_latKey, lat);
      await prefs.setDouble(_lonKey, lon);
    }
    ClientNearbyCache.clear();
    if (!mounted) return;
    setState(() {
      _selectedCity = city;
      _selectedLat = lat;
      _selectedLon = lon;
    });
    await _loadTopStudiosNearby();
  }

  Future<void> _showLocationRequestModal() async {
    await showModalBottomSheet<void>(
      context: context,
      isDismissible: true,
      showDragHandle: true,
      backgroundColor: AppColors.backgroundPrimary,
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Share your location',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'To show nearby studios, allow location access or choose city manually.',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () async {
                      Navigator.of(ctx).pop();
                      await _requestCurrentLocation();
                    },
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.primary500,
                    ),
                    child: const Text('Use current location'),
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: () async {
                      Navigator.of(ctx).pop();
                      await _openManualLocationInput();
                    },
                    child: const Text('Enter city manually'),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _requestCurrentLocation() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Location service is disabled')),
      );
      await _openManualLocationInput();
      return;
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Location permission denied')),
      );
      await _openManualLocationInput();
      return;
    }
    try {
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );
      final reverse = await MapboxApiService.reverseGeocode(
        pos.latitude,
        pos.longitude,
      );
      final city =
          _extractCityFromAddress(reverse?.address) ?? 'Current location';
      await _persistLocation(city: city, lat: pos.latitude, lon: pos.longitude);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to detect location')),
      );
      await _openManualLocationInput();
    }
  }

  String? _extractCityFromAddress(String? address) {
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

  Future<void> _openManualLocationInput() async {
    final picked = await Navigator.of(context).push<LocationPickerResult>(
      MaterialPageRoute(
        builder: (_) => LocationPickerScreen(initialCity: _selectedCity ?? ''),
      ),
    );
    if (picked == null || picked.city.trim().isEmpty) return;
    await _persistLocation(
      city: picked.city.trim(),
      lat: picked.lat,
      lon: picked.lon,
    );
  }

  List<PublicStudioPreview> get _filteredStudios {
    final query = _searchController.text.trim().toLowerCase();
    if (query.isEmpty) return _allStudios;
    return _allStudios.where((studio) {
      return studio.name.toLowerCase().contains(query) ||
          studio.primaryCategory.toLowerCase().contains(query) ||
          studio.address.toLowerCase().contains(query);
    }).toList();
  }

  Future<void> _toggleFavorite(PublicStudioPreview studio) async {
    final token = context.read<AuthService>().accessToken;
    final favStore = context.read<ClientFavoritesStore>();
    if (token == null ||
        token.isEmpty ||
        _favoriteLoadingIds.contains(studio.id)) {
      return;
    }
    final wasFavorite = favStore.isFavorite(studio.id);
    setState(() => _favoriteLoadingIds.add(studio.id));
    if (wasFavorite) {
      favStore.removeLocal(studio.id);
    } else {
      favStore.upsertStudioMap({
        'id': studio.id,
        'name': studio.name,
        'address': studio.address,
        if (studio.photoUrl != null && studio.photoUrl!.isNotEmpty)
          'photos': [studio.photoUrl],
        'avgRating': studio.rating,
      });
    }
    try {
      if (wasFavorite) {
        await ApiClient.delete('/auth/favorites/${studio.id}', token);
        if (mounted) {
          ScaffoldMessenger.of(context)
            ..hideCurrentSnackBar()
            ..showSnackBar(
              const SnackBar(content: Text('Removed from favorites')),
            );
        }
      } else {
        await ApiClient.post(
          '/auth/favorites/${studio.id}',
          token,
          body: {'studioId': studio.id},
        );
        HapticFeedback.lightImpact();
        if (mounted) {
          ScaffoldMessenger.of(context)
            ..hideCurrentSnackBar()
            ..showSnackBar(const SnackBar(content: Text('Added to favorites')));
        }
      }
    } catch (_) {
      if (!mounted) return;
      final messenger = ScaffoldMessenger.of(context);
      await favStore.sync(token, force: true);
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(content: Text('Failed to update favorites')),
        );
    } finally {
      if (mounted) {
        setState(() => _favoriteLoadingIds.remove(studio.id));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final favStore = context.watch<ClientFavoritesStore>();
    final localizationLabel = _selectedCity ?? 'Set location';
    final studios = _filteredStudios;
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
                child: Row(
                  children: [
                    Image.asset(
                      'assets/icon.png',
                      height: 40,
                      fit: BoxFit.contain,
                      errorBuilder: (_, _, _) => const Text(
                        'Henzo',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                          color: AppColors.primary500,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: InkWell(
                        borderRadius: BorderRadius.circular(10),
                        onTap: _openManualLocationInput,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 9,
                          ),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Row(
                            children: [
                              const Icon(
                                Icons.location_on_outlined,
                                size: 22,
                                color: AppColors.textSecondary,
                              ),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  localizationLabel,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: _selectedCity == null
                                        ? AppColors.textSecondary
                                        : AppColors.textPrimary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
                child: Text(
                  locale.t('publicHome.topStudiosTitle'),
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: SizedBox(
                height: 210,
                child: _isLoadingStudios
                    ? const Center(child: CircularProgressIndicator())
                    : studios.isEmpty
                    ? Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Center(
                          child: Text(
                            locale.t('publicHome.noStudios'),
                            style: const TextStyle(
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ),
                      )
                    : ListView.builder(
                        cacheExtent: 320,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        scrollDirection: Axis.horizontal,
                        itemCount: studios.length,
                        itemBuilder: (_, index) {
                          final studio = studios[index];
                          return TopStudioCard(
                            studio: studio,
                            isFavorite: favStore.isFavorite(studio.id),
                            isFavoriteLoading: _favoriteLoadingIds.contains(
                              studio.id,
                            ),
                            onToggleFavorite: () => _toggleFavorite(studio),
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => PublicStudioDetailScreen(
                                    studioId: studio.id,
                                  ),
                                ),
                              );
                            },
                          );
                        },
                      ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.backgroundPrimary,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: AppColors.borderPrimary),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Find nearby',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 10),
                      SizedBox(
                        height: 180,
                        width: double.infinity,
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            Container(
                              height: 180,
                              width: double.infinity,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(12),
                                color: AppColors.neutral100,
                                border: Border.all(
                                  color: AppColors.borderPrimary,
                                ),
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child:
                                    (_selectedLat != null &&
                                        _selectedLon != null)
                                    ? IgnorePointer(
                                        child: FlutterMap(
                                          options: MapOptions(
                                            initialCenter: LatLng(
                                              _selectedLat!,
                                              _selectedLon!,
                                            ),
                                            initialZoom: 13,
                                          ),
                                          children: [
                                            TileLayer(
                                              urlTemplate:
                                                  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
                                              subdomains: const [
                                                'a',
                                                'b',
                                                'c',
                                                'd',
                                              ],
                                              retinaMode: true,
                                              userAgentPackageName:
                                                  'com.henzo.mobile',
                                            ),
                                            MarkerLayer(
                                              markers: [
                                                Marker(
                                                  point: LatLng(
                                                    _selectedLat!,
                                                    _selectedLon!,
                                                  ),
                                                  width: 24,
                                                  height: 24,
                                                  child: const Icon(
                                                    Icons.location_on,
                                                    color: AppColors.primary500,
                                                    size: 24,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                      )
                                    : const Center(
                                        child: Icon(
                                          Icons.map_outlined,
                                          size: 44,
                                          color: AppColors.textSecondary,
                                        ),
                                      ),
                              ),
                            ),
                            Material(
                              color: AppColors.primary500,
                              borderRadius: BorderRadius.circular(999),
                              child: InkWell(
                                borderRadius: BorderRadius.circular(999),
                                onTap: widget.onOpenMap,
                                child: const Padding(
                                  padding: EdgeInsets.symmetric(
                                    horizontal: 14,
                                    vertical: 8,
                                  ),
                                  child: Text(
                                    'View map',
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.textInverse,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 10),
                      if (widget.onOpenMap == null)
                        const Text(
                          'Map is not available yet',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 12)),
          ],
        ),
      ),
    );
  }
}
