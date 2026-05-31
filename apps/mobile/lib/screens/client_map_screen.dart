import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../constants/layout.dart';
import '../l10n/locale_provider.dart';
import '../models/training_category_option.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../services/client_favorites_mutations.dart';
import '../services/client_favorites_store.dart';
import '../services/cache/client_nearby_cache.dart';
import '../services/client_location_store.dart';
import '../services/mapbox_api_service.dart';
import '../utils/formatters.dart';
import '../utils/load_error_message.dart';
import '../utils/nearby_payload.dart';
import '../widgets/client/browse_studio_list_card.dart';
import '../widgets/training/training_category_color_chip.dart';
import '../widgets/common/henzo_modal.dart';
import '../widgets/common/load_error_view.dart';
import '../widgets/map/henzo_map_layers.dart';
import 'client/client_explore_models.dart';
import 'location_picker_screen.dart';
import 'public_class_detail_screen.dart';
import 'public_studio_detail_screen.dart';

/// Full-screen map (Browse «Map» / Home).
class ClientMapScreen extends StatefulWidget {
  const ClientMapScreen({
    super.key,
    required this.onBack,
  });

  final VoidCallback onBack;

  static Future<void> open(BuildContext context) {
    return Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (ctx) => ClientMapScreen(
          onBack: () => Navigator.of(ctx).pop(),
        ),
      ),
    );
  }

  @override
  State<ClientMapScreen> createState() => _ClientMapScreenState();
}

class _ClientMapScreenState extends State<ClientMapScreen> {
  static const _mapPinInactive = Color(0xFF4D39A8);
  static const _mapPinActive = AppColors.primary500;
  static const _carouselHeight = 158.0;
  static const _carouselBottomPadding = 24.0;
  static const _searchAreaThresholdKm = 2.0;
  static const _clientLocationZoom = 14.0;
  static const _userMarkerWidth = 20.0;
  static const _userMarkerHeight = 20.0;

  final MapController _mapController = MapController();
  final PageController _carouselController = PageController(viewportFraction: 0.88);
  ClientLocationStore? _locationStore;
  final Distance _distance = const Distance();
  final Set<String> _favoriteLoadingIds = <String>{};

  List<ExploreStudioItem> _studios = const [];
  List<TrainingCategoryOption> _trainingCategories = const [];
  Map<String, List<ExploreClassItem>> _classesByStudio = const {};
  bool _isLoadingStudios = true;
  String? _studiosLoadError;
  int _selectedStudioIndex = -1;
  bool _showCarouselCard = true;
  bool _showSearchThisArea = false;
  double? _lastSearchLat;
  double? _lastSearchLon;
  double? _pendingSearchLat;
  double? _pendingSearchLon;
  Set<int> _selectedCategoryIds = const {};
  StreamSubscription<MapEvent>? _mapEventSubscription;
  double? _pinchGestureStartZoom;

  List<ExploreStudioItem> get _filteredStudios {
    if (_selectedCategoryIds.isEmpty) return _studios;
    return _studios
        .where(
          (s) => s.trainingCategoryIds.any(_selectedCategoryIds.contains),
        )
        .toList();
  }

  @override
  void initState() {
    super.initState();
    _mapEventSubscription = _mapController.mapEventStream.listen(_onMapEvent);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(_bootstrapMap());
    });
  }

  bool _hasClientMapCenter(ClientLocationStore loc) =>
      loc.lat != null && loc.lon != null;

  Future<void> _bootstrapMap() async {
    if (!mounted) return;
    final loc = context.read<ClientLocationStore>();
    if (!_hasClientMapCenter(loc)) {
      await _showLocationRequestModal();
    }
    if (!mounted) return;
    _syncMapToClientLocation();
    final after = context.read<ClientLocationStore>();
    if (_hasClientMapCenter(after)) {
      unawaited(_loadStudios());
    } else if (mounted) {
      setState(() {
        _isLoadingStudios = false;
        _studios = const [];
        _studiosLoadError = null;
      });
    }
    unawaited(_loadTrainingCategories());
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
    _mapEventSubscription?.cancel();
    _locationStore?.removeListener(_onSharedLocationChanged);
    _mapController.dispose();
    _carouselController.dispose();
    super.dispose();
  }

  void _onSharedLocationChanged() {
    if (!mounted) return;
    _syncMapToClientLocation();
    final loc = context.read<ClientLocationStore>();
    if (_hasClientMapCenter(loc)) {
      unawaited(_loadStudios());
    }
  }

  void _syncMapToClientLocation() {
    if (!mounted) return;
    final loc = context.read<ClientLocationStore>();
    if (!_hasClientMapCenter(loc)) return;
    _mapController.move(
      LatLng(loc.lat!, loc.lon!),
      _clientLocationZoom,
    );
  }

  Future<void> _showLocationRequestModal() async {
    final locale = context.read<LocaleProvider>();
    await showHenzoModalBottomSheet<void>(
      context: context,
      isDismissible: true,
      showDragHandle: true,
      backgroundColor: AppColors.backgroundPrimary,
      builder: (ctx) {
        return SafeArea(
          top: false,
          child: Padding(
            padding: screenPaddingH(top: 10, bottom: 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  locale.t('clientMap.locationPromptTitle'),
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  locale.t('clientMap.locationPromptBody'),
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 14),
                FilledButton(
                  onPressed: () async {
                    Navigator.of(ctx).pop();
                    await _requestCurrentLocation();
                  },
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary500,
                  ),
                  child: Text(locale.t('clientHome.locationPickerUseCity')),
                ),
                const SizedBox(height: 8),
                OutlinedButton(
                  onPressed: () async {
                    Navigator.of(ctx).pop();
                    await _openManualLocationInput();
                  },
                  child: Text(locale.t('clientMap.locationPromptManual')),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _requestCurrentLocation() async {
    final locale = context.read<LocaleProvider>();
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(locale.t('addressPicker.locationServiceDisabled')),
        ),
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
        SnackBar(
          content: Text(locale.t('addressPicker.locationPermissionDenied')),
        ),
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
      final city = _extractCityFromAddress(reverse?.address) ??
          locale.t('clientHome.locationPickerUseCity');
      await context.read<ClientLocationStore>().apply(
        city: city,
        lat: pos.latitude,
        lon: pos.longitude,
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(locale.t('addressPicker.locationDetectFailed'))),
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
    final loc = context.read<ClientLocationStore>();
    final picked = await Navigator.of(context).push<LocationPickerResult>(
      MaterialPageRoute(
        builder: (_) => LocationPickerScreen(
          initialCity: loc.city ?? '',
        ),
      ),
    );
    if (picked == null || picked.city.trim().isEmpty) return;
    await context.read<ClientLocationStore>().applyFromPicker(picked);
  }

  Future<void> _loadTrainingCategories() async {
    if (_trainingCategories.isNotEmpty) return;
    try {
      final raw = await ApiClient.get('/trainings/categories', null);
      if (raw is! List || !mounted) return;
      final list = <TrainingCategoryOption>[];
      for (final row in raw) {
        if (row is! Map) continue;
        list.add(
          TrainingCategoryOption.fromJson(Map<String, dynamic>.from(row)),
        );
      }
      if (!mounted) return;
      setState(
        () => _trainingCategories = TrainingCategoryOption.withOtherLast(list),
      );
    } catch (_) {}
  }

  Future<void> _loadStudios({double? searchLat, double? searchLon}) async {
    final loc = context.read<ClientLocationStore>();
    final effectiveLat = searchLat ?? loc.lat;
    final effectiveLon = searchLon ?? loc.lon;
    if (!mounted) return;
    setState(() {
      _isLoadingStudios = true;
      _studiosLoadError = null;
      _showSearchThisArea = false;
      _classesByStudio = const {};
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
      if (raw == null && effectiveLat != null && effectiveLon != null) {
        raw = ClientNearbyCache.sliceFromHomeCache(
          effectiveLat,
          effectiveLon,
          take: 25,
        );
      }
      raw ??= await ApiClient.get(path, null);
      ClientNearbyCache.put(path, raw);
      final list = extractStudiosListFromNearby(raw);
      final localeCode = context.read<LocaleProvider>().localeCode;
      final mapped = <ExploreStudioItem>[];
      for (final item in list) {
        if (item is! Map) continue;
        final studio = _parseExploreStudio(
          Map<String, dynamic>.from(item),
          localeCode,
        );
        if (studio != null) mapped.add(studio);
      }
      if (!mounted) return;
      setState(() {
        _studios = mapped;
        _isLoadingStudios = false;
        _selectedStudioIndex = -1;
        _showCarouselCard = false;
        _lastSearchLat = effectiveLat;
        _lastSearchLon = effectiveLon;
        _pendingSearchLat = null;
        _pendingSearchLon = null;
      });
      if (mapped.isNotEmpty) {
        if (searchLat != null && searchLon != null) {
          _mapController.move(
            LatLng(searchLat, searchLon),
            _clientLocationZoom,
          );
        } else {
          _syncMapToClientLocation();
        }
        unawaited(_ensureStudioClassesLoaded(mapped.first));
      }
    } catch (e) {
      if (!mounted) return;
      final locale = context.read<LocaleProvider>();
      setState(() {
        _isLoadingStudios = false;
        _studiosLoadError = loadErrorMessage(locale, e);
        _lastSearchLat = effectiveLat;
        _lastSearchLon = effectiveLon;
      });
    }
  }

  ExploreStudioItem? _parseExploreStudio(
    Map<String, dynamic> map,
    String localeCode,
  ) {
    final id = (map['id'] ?? '').toString();
    if (id.isEmpty) return null;

    final reviews = map['Review'] is List ? map['Review'] as List : const [];
    final reviewCount = reviews.length;
    final avgRating = reviewCount > 0
        ? reviews
                  .whereType<Map>()
                  .map((r) => (r['rating'] as num?)?.toDouble() ?? 0)
                  .fold<double>(0, (a, b) => a + b) /
              reviewCount
        : ((map['avgRating'] as num?)?.toDouble() ?? 0);

    final trainingCategoryIds = <int>[];
    final rawCatIds = map['trainingCategoryIds'];
    if (rawCatIds is List) {
      for (final e in rawCatIds) {
        if (e is num) trainingCategoryIds.add(e.toInt());
      }
    }

    final categoryNames = extractStudioCategoryLabels(
      map,
      localeCode: localeCode,
      categoryOptions: _trainingCategories,
    );

    final photos = map['photos'];
    final photoUrl = photos is List && photos.isNotEmpty
        ? photos.first?.toString()
        : null;

    return ExploreStudioItem(
      id: id,
      name: (map['name'] ?? 'Studio').toString(),
      address: (map['address'] ?? '').toString(),
      locationName: (map['locationName'] ?? '').toString().trim().isEmpty
          ? null
          : (map['locationName'] ?? '').toString().trim(),
      distanceKm: (map['distance'] as num?)?.toDouble(),
      rating: avgRating,
      reviewCount: reviewCount,
      photoUrl: photoUrl,
      logoUrl: (map['logoUrl'] ??
              map['logo'] ??
              map['brandLogoUrl'] ??
              map['avatarUrl'])
          ?.toString(),
      lat: (map['lat'] as num?)?.toDouble() ??
          (map['latitude'] as num?)?.toDouble(),
      lng: (map['lng'] as num?)?.toDouble() ??
          (map['lon'] as num?)?.toDouble() ??
          (map['longitude'] as num?)?.toDouble(),
      trainingCategoryIds: trainingCategoryIds,
      categoryNames: categoryNames,
    );
  }

  Future<void> _ensureStudioClassesLoaded(ExploreStudioItem studio) async {
    if (!mounted || _classesByStudio.containsKey(studio.id)) return;
    final from = DateTime.now();
    final fromQ = Uri.encodeComponent(
      DateTime(from.year, from.month, from.day).toIso8601String(),
    );
    final toQ = Uri.encodeComponent(
      from.add(const Duration(days: 1)).toIso8601String(),
    );
    final classes = await _fetchClassesForStudio(studio, fromQ, toQ);
    if (!mounted) return;
    setState(() => _classesByStudio = {..._classesByStudio, studio.id: classes});
  }

  Future<List<ExploreClassItem>> _fetchClassesForStudio(
    ExploreStudioItem studio,
    String fromQuery,
    String toQuery,
  ) async {
    try {
      final raw = await ApiClient.get(
        '/studios/${studio.id}/schedule?from=$fromQuery&to=$toQuery&limit=20',
        null,
      );
      if (raw is! List) return const [];
      final out = <ExploreClassItem>[];
      final today = DateTime.now();
      for (final row in raw) {
        if (row is! Map) continue;
        final map = Map<String, dynamic>.from(row);
        final training = map['training'] is Map
            ? Map<String, dynamic>.from(map['training'] as Map)
            : <String, dynamic>{};
        final startsAt = parseApiDateTime(map['startsAt']);
        if (startsAt == null) continue;
        if (!_isSameCalendarDay(startsAt, today)) continue;
        final trainingCategoryId = training['trainingCategoryId'] == null
            ? null
            : (training['trainingCategoryId'] as num).toInt();
        out.add(
          ExploreClassItem(
            sessionId: (map['id'] ?? '').toString(),
            studioId: studio.id,
            studioName: studio.name,
            studioAddress: studio.address,
            startsAt: startsAt,
            durationMin: (training['duration'] as num?)?.toInt(),
            trainerName: map['trainer'] is Map
                ? (map['trainer']['name'] ?? '').toString()
                : '',
            className: (training['name'] ?? 'Class').toString(),
            price: (training['price'] as num?)?.toDouble(),
            capacity: (map['capacity'] as num?)?.toInt(),
            bookedCount: (map['bookedCount'] as num?)?.toInt() ?? 0,
            displayColorHex: training['displayColor']?.toString(),
            rating: studio.rating,
            reviewCount: studio.reviewCount,
            trainingCategoryId: trainingCategoryId,
            trainingId: (training['id'] ?? '').toString(),
            endsAt: parseApiDateTime(map['endsAt']),
            locationName: map['locationName']?.toString(),
            distanceKm: studio.distanceKm,
          ),
        );
      }
      out.sort((a, b) => a.startsAt.compareTo(b.startsAt));
      return out;
    } catch (_) {
      return const [];
    }
  }

  bool _isSameCalendarDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  bool _isStudioInMapViewport(int index) {
    final studios = _filteredStudios;
    if (index < 0 || index >= studios.length) return false;
    final s = studios[index];
    if (s.lat == null || s.lng == null) return false;
    return _mapController.camera.visibleBounds.contains(
      LatLng(s.lat!, s.lng!),
    );
  }

  // Only hides the card when the selected pin leaves the viewport.
  // Showing is intentional only: pin tap or carousel swipe.
  void _hideCarouselIfPinOffscreen() {
    if (!mounted || !_showCarouselCard) return;
    if (!_isStudioInMapViewport(_selectedStudioIndex)) {
      setState(() => _showCarouselCard = false);
    }
  }

  /// Pan-only: ignore pinch-zoom and programmatic [MapController] moves.
  void _onMapEvent(MapEvent event) {
    if (event is MapEventMoveStart &&
        event.source == MapEventSource.multiFingerGestureStart) {
      _pinchGestureStartZoom = event.camera.zoom;
      return;
    }
    final isPanEnd = switch (event) {
      MapEventMoveEnd(source: MapEventSource.dragEnd) => true,
      MapEventFlingAnimationEnd() => true,
      MapEventMoveEnd(source: MapEventSource.multiFingerEnd) =>
        _wasPinchPanNotZoom(event.camera.zoom),
      _ => false,
    };
    if (!isPanEnd) return;
    _updateSearchThisAreaButton(event.camera);
    _hideCarouselIfPinOffscreen();
  }

  bool _wasPinchPanNotZoom(double endZoom) {
    final startZoom = _pinchGestureStartZoom;
    _pinchGestureStartZoom = null;
    if (startZoom == null) return false;
    return (endZoom - startZoom).abs() < 0.05;
  }

  void _updateSearchThisAreaButton(MapCamera camera) {
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
    await _loadStudios(searchLat: lat, searchLon: lon);
  }

  void _focusStudioOnMap(int index) {
    final studios = _filteredStudios;
    if (index < 0 || index >= studios.length) return;
    final s = studios[index];
    if (s.lat == null || s.lng == null) return;
    _mapController.move(LatLng(s.lat!, s.lng!), 15);
  }

  void _onCarouselPageChanged(int index) {
    setState(() {
      _selectedStudioIndex = index;
      _showCarouselCard = _isStudioInMapViewport(index);
    });
    _focusStudioOnMap(index);
    if (index < _studios.length) {
      unawaited(_ensureStudioClassesLoaded(_studios[index]));
    }
  }

  String? _distanceLabel(ExploreStudioItem studio) {
    final loc = context.read<ClientLocationStore>();
    final km = resolveStudioDistanceKm(
      apiDistanceKm: studio.distanceKm,
      clientLat: loc.lat,
      clientLon: loc.lon,
      studioLat: studio.lat,
      studioLng: studio.lng,
    );
    final label = formatBrowseStudioDistanceLabel(km);
    return label.isEmpty ? null : label;
  }

  Future<void> _openFilters() async {
    if (_trainingCategories.isEmpty) return;
    final locale = context.read<LocaleProvider>();
    var tempSelected = Set<int>.from(_selectedCategoryIds);

    final result = await showHenzoModalBottomSheet<Set<int>>(
      context: context,
      showDragHandle: true,
      backgroundColor: AppColors.backgroundPrimary,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (_, setModalState) {
            return SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Filter by type',
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        if (tempSelected.isNotEmpty)
                          TextButton(
                            onPressed: () =>
                                setModalState(() => tempSelected = {}),
                            child: Text(
                              locale.t('common.reset'),
                              style: const TextStyle(
                                color: AppColors.textSecondary,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        TrainingCategoryColorChip(
                          label: 'All types',
                          selected: tempSelected.isEmpty,
                          onTap: () => setModalState(() => tempSelected = {}),
                        ),
                        ..._trainingCategories.map(
                          (cat) => TrainingCategoryColorChip(
                            category: cat,
                            label: cat.label(locale.localeCode),
                            selected: tempSelected.contains(cat.id),
                            onTap: () => setModalState(() {
                              if (tempSelected.contains(cat.id)) {
                                tempSelected = {...tempSelected}..remove(cat.id);
                              } else {
                                tempSelected = {...tempSelected, cat.id};
                              }
                            }),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: () => Navigator.of(ctx).pop(tempSelected),
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.primary500,
                        ),
                        child: const Text('Apply'),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );

    if (result != null && mounted) {
      setState(() {
        _selectedCategoryIds = result;
        _selectedStudioIndex = -1;
        _showCarouselCard = false;
      });
      if (_filteredStudios.isNotEmpty) {
        _carouselController.jumpToPage(0);
      }
    }
  }

  void _openStudioDetail(ExploreStudioItem studio) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PublicStudioDetailScreen(studioId: studio.id),
      ),
    );
  }

  void _openClassDetail(ExploreClassItem item) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PublicClassDetailScreen(
          studioId: item.studioId,
          sessionId: item.sessionId,
          sessionStartsAtHint: item.startsAt,
          distanceKm: item.distanceKm,
        ),
      ),
    );
  }

  Future<void> _toggleFavorite(ExploreStudioItem studio) async {
    final token = context.read<AuthService>().accessToken;
    final favStore = context.read<ClientFavoritesStore>();
    if (token == null ||
        token.isEmpty ||
        _favoriteLoadingIds.contains(studio.id)) {
      return;
    }
    final wasFavorite = favStore.isFavorite(studio.id);
    setState(() => _favoriteLoadingIds.add(studio.id));
    final ok = wasFavorite
        ? await ClientFavoritesMutations.removeStudio(
            favStore: favStore,
            token: token,
            studioId: studio.id,
          )
        : await ClientFavoritesMutations.addStudio(
            favStore: favStore,
            token: token,
            studioId: studio.id,
            optimisticStudioPayload: {
              'id': studio.id,
              'name': studio.name,
              'address': studio.address,
              if (studio.photoUrl != null && studio.photoUrl!.isNotEmpty)
                'photos': [studio.photoUrl],
              'avgRating': studio.rating,
              if (studio.categoryNames.isNotEmpty) ...{
                'categories': studio.categoryNames,
                'categoryNames': studio.categoryNames,
              },
            },
          );
    if (mounted) {
      setState(() => _favoriteLoadingIds.remove(studio.id));
    }
    if (!mounted || !ok) return;
  }

  Widget _buildFilterButton() {
    final isActive = _selectedCategoryIds.isNotEmpty;
    return Material(
      color: isActive ? AppColors.primary500 : Colors.white,
      elevation: 3,
      shadowColor: Colors.black.withValues(alpha: 0.18),
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: _openFilters,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Icon(
            Icons.tune_rounded,
            size: 22,
            color: isActive ? Colors.white : AppColors.textSecondary,
          ),
        ),
      ),
    );
  }

  Widget _buildZoomButtons() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        _MapZoomButton(
          icon: Icons.add,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
          onTap: () => _mapController.move(
            _mapController.camera.center,
            (_mapController.camera.zoom + 1).clamp(1, 20),
          ),
        ),
        Container(height: 1, color: AppColors.borderPrimary),
        _MapZoomButton(
          icon: Icons.remove,
          borderRadius: const BorderRadius.vertical(bottom: Radius.circular(12)),
          onTap: () => _mapController.move(
            _mapController.camera.center,
            (_mapController.camera.zoom - 1).clamp(1, 20),
          ),
        ),
      ],
    );
  }

  Widget _buildMapCloseButton() {
    return Material(
      color: Colors.white,
      elevation: 3,
      shadowColor: Colors.black.withValues(alpha: 0.18),
      shape: const CircleBorder(),
      child: InkWell(
        onTap: widget.onBack,
        customBorder: const CircleBorder(),
        child: const Padding(
          padding: EdgeInsets.all(10),
          child: Icon(
            Icons.close_rounded,
            size: 22,
            color: AppColors.primary500,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final loc = context.watch<ClientLocationStore>();
    context.watch<LocaleProvider>();
    final center = (loc.lat != null && loc.lon != null)
        ? LatLng(loc.lat!, loc.lon!)
        : const LatLng(21.0285, 105.8542);
    final hasCoords = loc.lat != null && loc.lon != null;
    final bottomInset = MediaQuery.paddingOf(context).bottom;

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
                interactionOptions: HenzoMapLayers.interactionOptions(),
              ),
              children: [
                HenzoMapLayers.cartoLightTileLayer(),
                MarkerLayer(
                  markers: [
                    for (var i = 0; i < _filteredStudios.length; i++)
                      if (_filteredStudios[i].lat != null &&
                          _filteredStudios[i].lng != null)
                        Marker(
                          point: LatLng(
                            _filteredStudios[i].lat!,
                            _filteredStudios[i].lng!,
                          ),
                          width: i == _selectedStudioIndex ? 40 : 32,
                          height: i == _selectedStudioIndex ? 40 : 32,
                          child: GestureDetector(
                            onTap: () {
                              setState(() {
                                _selectedStudioIndex = i;
                                _showCarouselCard = _isStudioInMapViewport(i);
                              });
                              _carouselController.animateToPage(
                                i,
                                duration: const Duration(milliseconds: 300),
                                curve: Curves.easeOut,
                              );
                            },
                            child: Icon(
                              Icons.location_on,
                              size: i == _selectedStudioIndex ? 40 : 32,
                              color: i == _selectedStudioIndex
                                  ? _mapPinActive
                                  : _mapPinInactive,
                            ),
                          ),
                        ),
                  ],
                ),
                if (hasCoords)
                  MarkerLayer(
                    markers: [
                      Marker(
                        point: LatLng(loc.lat!, loc.lon!),
                        width: _userMarkerWidth,
                        height: _userMarkerHeight,
                        child: Container(
                          width: _userMarkerWidth,
                          height: _userMarkerHeight,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppColors.primary500,
                            border: Border.all(color: Colors.white, width: 2),
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.primary500.withValues(
                                  alpha: 0.35,
                                ),
                                blurRadius: 8,
                                spreadRadius: 1,
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
              child: ColoredBox(
                color: const Color(0x1FE1D7C8),
              ),
            ),
          ),
          Positioned(
            top: 4,
            left: 12,
            right: 12,
            child: SafeArea(
              bottom: false,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildFilterButton(),
                  _buildMapCloseButton(),
                ],
              ),
            ),
          ),
          if (_showSearchThisArea)
            Positioned(
              top: 65,
              left: 0,
              right: 0,
              child: SafeArea(
                bottom: false,
                child: Center(
                  child: ElevatedButton.icon(
                    onPressed: _isLoadingStudios ? null : _searchThisArea,
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
          AnimatedPositioned(
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeOut,
            left: 16,
            bottom: (_isLoadingStudios || _showCarouselCard ||
                    _studios.isEmpty || _studiosLoadError != null)
                ? bottomInset + _carouselBottomPadding + _carouselHeight + 12
                : bottomInset + _carouselBottomPadding + 12,
            child: _buildZoomButtons(),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: bottomInset + _carouselBottomPadding,
            child: _StudioCarousel(
              isLoading: _isLoadingStudios,
              loadError: _studiosLoadError,
              studios: _filteredStudios,
              showCard: _showCarouselCard,
              classesByStudio: _classesByStudio,
              trainingCategories: _trainingCategories,
              pageController: _carouselController,
              distanceLabelOf: _distanceLabel,
              noStudiosLabel: context.read<LocaleProvider>().t('clientMap.noStudiosNearby'),
              onPageChanged: _onCarouselPageChanged,
              onStudioTap: _openStudioDetail,
              onToggleFavorite: _toggleFavorite,
              onClassTap: _openClassDetail,
              onRetry: () => _loadStudios(
                searchLat: _lastSearchLat,
                searchLon: _lastSearchLon,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StudioCarousel extends StatelessWidget {
  const _StudioCarousel({
    required this.isLoading,
    required this.loadError,
    required this.studios,
    required this.showCard,
    required this.classesByStudio,
    required this.trainingCategories,
    required this.pageController,
    required this.distanceLabelOf,
    required this.noStudiosLabel,
    required this.onPageChanged,
    required this.onStudioTap,
    required this.onToggleFavorite,
    required this.onClassTap,
    required this.onRetry,
  });

  static const _height = 158.0;
  static const _sideInset = 8.0;

  final bool isLoading;
  final String? loadError;
  final List<ExploreStudioItem> studios;
  final bool showCard;
  final Map<String, List<ExploreClassItem>> classesByStudio;
  final List<TrainingCategoryOption> trainingCategories;
  final PageController pageController;
  final String? Function(ExploreStudioItem) distanceLabelOf;
  final String noStudiosLabel;
  final void Function(int) onPageChanged;
  final void Function(ExploreStudioItem) onStudioTap;
  final void Function(ExploreStudioItem) onToggleFavorite;
  final void Function(ExploreClassItem) onClassTap;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const SizedBox(
        height: _height,
        child: Center(
          child: SizedBox(
            width: 28,
            height: 28,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        ),
      );
    }

    if (loadError != null) {
      return SizedBox(
        height: _height,
        child: LoadErrorView(compact: true, message: loadError!, onRetry: onRetry),
      );
    }

    if (studios.isEmpty) {
      return SizedBox(
        height: _height,
        child: Center(
          child: Text(
            noStudiosLabel,
            style: const TextStyle(color: AppColors.textSecondary),
          ),
        ),
      );
    }

    if (!showCard) return const SizedBox.shrink();

    // Watch favorites here — isolated from the parent map widget
    final favStore = context.watch<ClientFavoritesStore>();

    return SizedBox(
      height: _height,
      child: PageView.builder(
        controller: pageController,
        itemCount: studios.length,
        onPageChanged: onPageChanged,
        itemBuilder: (context, index) {
          final studio = studios[index];
          return Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: _sideInset),
              child: DecoratedBox(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.1),
                      blurRadius: 14,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: BrowseStudioListCard(
                  studio: studio,
                  todayClasses: classesByStudio[studio.id] ?? const [],
                  trainingCategories: trainingCategories,
                  distanceLabel: distanceLabelOf(studio),
                  isFavorite: favStore.isFavorite(studio.id),
                  onTap: () => onStudioTap(studio),
                  onToggleFavorite: () => onToggleFavorite(studio),
                  onClassTap: onClassTap,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _MapZoomButton extends StatelessWidget {
  const _MapZoomButton({
    required this.icon,
    required this.borderRadius,
    required this.onTap,
  });

  final IconData icon;
  final BorderRadius borderRadius;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      elevation: 3,
      shadowColor: Colors.black.withValues(alpha: 0.18),
      borderRadius: borderRadius,
      child: InkWell(
        onTap: onTap,
        borderRadius: borderRadius,
        child: SizedBox(
          width: 42,
          height: 42,
          child: Icon(icon, size: 20, color: AppColors.textPrimary),
        ),
      ),
    );
  }
}
