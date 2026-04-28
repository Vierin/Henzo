import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import '../models/public_studio_preview.dart';
import '../services/api_client.dart';
import '../services/mapbox_api_service.dart';
import '../widgets/public/top_studio_card.dart';
import 'location_picker_screen.dart';

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

  @override
  void initState() {
    super.initState();
    _loadSavedLocation();
    _loadFeaturedStudios();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadFeaturedStudios() async {
    if (!mounted) return;
    setState(() => _isLoadingStudios = true);
    try {
      final raw = await ApiClient.get('/studios/featured?limit=10', null);
      final list = raw is List ? raw : <dynamic>[];
      final mapped = <PublicStudioPreview>[];
      for (final item in list) {
        if (item is! Map<String, dynamic>) continue;
        final categories = item['categories'];
        final category = categories is List && categories.isNotEmpty
            ? (categories.first?.toString() ?? 'Fitness')
            : 'Fitness';
        final rating = (item['avgRating'] as num?)?.toDouble() ?? 0;
        final address = (item['address'] ?? '').toString();
        final photos = item['photos'];
        final photoUrl = photos is List && photos.isNotEmpty
            ? photos.first?.toString()
            : null;
        mapped.add(
          PublicStudioPreview(
            id: (item['id'] ?? '').toString(),
            name: (item['name'] ?? 'Studio').toString(),
            category: category,
            rating: rating,
            city: address.isNotEmpty ? address : '—',
            photoUrl: photoUrl,
          ),
        );
      }
      if (!mounted) return;
      setState(() {
        _allStudios = mapped;
        _isLoadingStudios = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _allStudios = const [];
        _isLoadingStudios = false;
      });
    }
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
    if ((_selectedCity == null || _selectedCity!.isEmpty) && !_locationModalShown) {
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
    if (!mounted) return;
    setState(() {
      _selectedCity = city;
      _selectedLat = lat;
      _selectedLon = lon;
    });
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
                  style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
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
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      final reverse = await MapboxApiService.reverseGeocode(
        pos.latitude,
        pos.longitude,
      );
      final city = _extractCityFromAddress(reverse?.address) ?? 'Current location';
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
          studio.category.toLowerCase().contains(query) ||
          studio.city.toLowerCase().contains(query);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
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
                      height: 34,
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
                                size: 18,
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
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: TextField(
                  controller: _searchController,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    hintText: locale.t('publicHome.searchHint'),
                    prefixIcon: const Icon(Icons.search),
                    filled: true,
                    fillColor: AppColors.backgroundPrimary,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 12,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.borderPrimary),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.borderPrimary),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.borderFocus),
                    ),
                  ),
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
                height: 205,
                child: _isLoadingStudios
                    ? const Center(child: CircularProgressIndicator())
                    : studios.isEmpty
                    ? Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Center(
                          child: Text(
                            locale.t('publicHome.noStudios'),
                            style: const TextStyle(color: AppColors.textSecondary),
                          ),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        scrollDirection: Axis.horizontal,
                        itemCount: studios.length,
                        itemBuilder: (_, index) => TopStudioCard(studio: studios[index]),
                      ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(18),
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
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        (_selectedLat != null && _selectedLon != null)
                            ? 'Around $_selectedCity'
                            : 'Set location to show closest studios',
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 10),
                      SizedBox(
                        height: 140,
                        width: double.infinity,
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            Container(
                              height: 140,
                              width: double.infinity,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(12),
                                color: AppColors.neutral100,
                                border: Border.all(color: AppColors.borderPrimary),
                              ),
                              child: const Center(
                                child: Icon(
                                  Icons.map_outlined,
                                  size: 44,
                                  color: AppColors.textSecondary,
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
