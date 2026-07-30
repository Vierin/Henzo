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
import '../services/cache/training_categories_cache.dart';
import '../services/client_favorites_mutations.dart';
import '../services/client_favorites_store.dart';
import '../services/cache/client_nearby_cache.dart';
import '../services/client_location_store.dart';
import '../services/device_location_service.dart';
import '../services/mapbox_api_service.dart';
import '../utils/lru_map_cache.dart';
import '../utils/client_map_viewport.dart';
import '../utils/formatters.dart';
import '../utils/load_error_message.dart';
import '../utils/nearby_payload.dart';
import '../widgets/client/browse_studio_list_card.dart';
import '../widgets/training/training_category_color_chip.dart';
import '../widgets/common/henzo_modal.dart';
import '../widgets/common/load_error_view.dart';
import '../widgets/map/client_map_markers_layer.dart';
import '../widgets/map/henzo_map_layers.dart';
import 'client/client_explore_models.dart';
import 'location_picker_screen.dart';
import 'public_class_detail_screen.dart';
import 'public_studio_detail_screen.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

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
  static const _carouselBottomPadding = 24.0;
  static const _searchAreaThresholdKm = 2.0;
  static const _clientLocationZoom = 14.0;

  final MapController _mapController = MapController();
  final PageController _carouselController = PageController(viewportFraction: 0.88);
  ClientLocationStore? _locationStore;
  final Distance _distance = const Distance();
  final Set<String> _favoriteLoadingIds = <String>{};

  /// All studios from the last area search (up to [ClientMapViewport.mapFetchLimit]).
  List<ExploreStudioItem> _studios = const [];
  List<ExploreStudioItem> _filteredStudios = const [];
  /// Studios inside the current map viewport — pins layer only.
  List<ExploreStudioItem> _visibleMapStudios = const [];
  /// Frozen carousel list — set when user opens a pin card, unchanged until close/search.
  List<ExploreStudioItem> _carouselStudios = const [];
  List<TrainingCategoryOption> _trainingCategories = const [];
  final LruMapCache<String, List<ExploreClassItem>> _studioClassesCache =
      LruMapCache<String, List<ExploreClassItem>>(
    maxSize: ClientMapViewport.classesCacheMaxSize,
  );
  bool _isLoadingStudios = true;
  String? _studiosLoadError;
  String? _selectedStudioId;
  bool _showCarouselCard = false;
  bool _showSearchThisArea = false;
  double? _lastSearchLat;
  double? _lastSearchLon;
  double? _lastSearchRadiusKm;
  double? _pendingSearchLat;
  double? _pendingSearchLon;
  Set<int> _selectedCategoryIds = const {};
  StreamSubscription<MapEvent>? _mapEventSubscription;

  void _rebuildFilteredStudios() {
    _filteredStudios = _selectedCategoryIds.isEmpty
        ? _studios
        : _studios
            .where((s) => s.trainingCategoryIds.any(_selectedCategoryIds.contains))
            .toList();
  }

  List<ExploreStudioItem> _studiosInView(MapCamera camera) {
    return ClientMapViewport.studiosForMapPins(
      _filteredStudios,
      camera,
      pinPadding: ClientMapViewport.pinFilterPadding(
        bottomSafeInset: MediaQuery.paddingOf(context).bottom,
        showCarouselCard: _showCarouselCard,
      ),
      sortFrom: camera.center,
    );
  }

  bool _sameVisibleStudioIds(
    List<ExploreStudioItem> a,
    List<ExploreStudioItem> b,
  ) {
    if (a.length != b.length) return false;
    final idsA = a.map((s) => s.id).toSet();
    return idsA.length == b.length && idsA.containsAll(b.map((s) => s.id));
  }

  void _syncVisibleMapStudios(MapCamera camera) {
    final visible = _studiosInView(camera);
    if (_sameVisibleStudioIds(_visibleMapStudios, visible)) return;
    if (!mounted) return;
    setState(() => _visibleMapStudios = visible);
  }

  void _closeCarousel() {
    _selectedStudioId = null;
    _showCarouselCard = false;
    _carouselStudios = const [];
    _visibleMapStudios = _studiosInView(_mapController.camera);
  }

  List<ExploreStudioItem> _snapshotCarouselStudios(
    ExploreStudioItem anchor,
  ) {
    final camera = _mapController.camera;
    final inView = ClientMapViewport.studiosForMapPins(
      _filteredStudios,
      camera,
      pinPadding: ClientMapViewport.pinFilterPadding(
        bottomSafeInset: MediaQuery.paddingOf(context).bottom,
        showCarouselCard: _showCarouselCard,
      ),
      sortFrom: camera.center,
    );
    if (inView.any((s) => s.id == anchor.id)) return inView;
    return [...inView, anchor];
  }

  void _preloadClassesAroundIndex(int index) {
    for (final i in [index - 1, index, index + 1]) {
      if (i < 0 || i >= _carouselStudios.length) continue;
      unawaited(_ensureStudioClassesLoaded(_carouselStudios[i]));
    }
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
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        unawaited(_loadStudios());
      });
    } else if (mounted) {
      setState(() {
        _isLoadingStudios = false;
        _studios = const [];
        _filteredStudios = const [];
        _visibleMapStudios = const [];
        _carouselStudios = const [];
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
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        unawaited(_loadStudios());
      });
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
    _syncVisibleMapStudios(_mapController.camera);
  }

  Future<void> _centerMapOnUser() async {
    final loc = context.read<ClientLocationStore>();
    if (_hasClientMapCenter(loc)) {
      _syncMapToClientLocation();
      return;
    }
    await _showLocationRequestModal();
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
                  style: TextStyle(
                    fontSize: 18.sp,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  locale.t('clientMap.locationPromptBody'),
                  style: TextStyle(
                    fontSize: 14.sp,
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
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: Text(locale.t('clientHome.locationPickerUseCity')),
                ),
                const SizedBox(height: 8),
                OutlinedButton(
                  onPressed: () async {
                    Navigator.of(ctx).pop();
                    await _openManualLocationInput();
                  },
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
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
    if (!await Geolocator.isLocationServiceEnabled()) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(locale.t('addressPicker.locationServiceDisabled')),
        ),
      );
      await Geolocator.openLocationSettings();
      return;
    }
    if (!await DeviceLocationService.ensureAccess()) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(locale.t('addressPicker.locationPermissionDenied')),
        ),
      );
      await _openManualLocationInput();
      return;
    }

    final pos = await DeviceLocationService.resolvePosition();
    if (!mounted) return;
    if (pos == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '${locale.t('addressPicker.locationDetectFailed')}\n'
            '${locale.t('addressPicker.locationDetectFailedHint')}',
          ),
        ),
      );
      await _openManualLocationInput();
      return;
    }

    ReverseGeocodeResult? reverse;
    try {
      reverse = await MapboxApiService.reverseGeocode(
        pos.latitude,
        pos.longitude,
      );
    } catch (_) {
      reverse = null;
    }
    if (!mounted) return;

    final city = DeviceLocationService.cityFromAddress(
      reverse?.address,
      locale.t('clientHome.locationPickerUseCity'),
    );
    await context.read<ClientLocationStore>().apply(
      city: city,
      country: reverse?.country,
      lat: pos.latitude,
      lon: pos.longitude,
    );
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
    if (!mounted) return;
    await context.read<ClientLocationStore>().applyFromPicker(picked);
  }

  Future<void> _loadTrainingCategories() async {
    final cats = await context.read<TrainingCategoriesCache>().getCategories();
    if (!mounted) return;
    setState(() => _trainingCategories = cats);
  }

  Future<void> _loadStudios({double? searchLat, double? searchLon}) async {
    final loc = context.read<ClientLocationStore>();
    final camera = _mapController.camera;
    final pinPadding = ClientMapViewport.pinFilterPadding(
      bottomSafeInset: MediaQuery.paddingOf(context).bottom,
      showCarouselCard: _showCarouselCard,
    );
    final effectiveLat = searchLat ?? loc.lat;
    final effectiveLon = searchLon ?? loc.lon;
    if (!mounted) return;
    final radiusKm = effectiveLat != null && effectiveLon != null
        ? ClientMapViewport.searchRadiusKmForMapLoad(
            camera: camera,
            center: LatLng(effectiveLat, effectiveLon),
            pinPadding: pinPadding,
          )
        : ClientMapViewport.searchRadiusKmForZoom(camera.zoom);
    final radiusRound = radiusKm.round().clamp(
      1,
      ClientMapViewport.maxSearchRadiusKm.round(),
    );
    setState(() {
      _isLoadingStudios = true;
      _studiosLoadError = null;
      _showSearchThisArea = false;
      _visibleMapStudios = const [];
      _studioClassesCache.clear();
    });
    try {
      final query = StringBuffer(
        '/studios/nearby/map?limit=${ClientMapViewport.mapFetchLimit}'
        '&strict=true',
      );
      if (effectiveLat != null && effectiveLon != null) {
        query
          ..write('&lat=')
          ..write(effectiveLat.toStringAsFixed(6))
          ..write('&lng=')
          ..write(effectiveLon.toStringAsFixed(6))
          ..write('&radius=')
          ..write(radiusRound);
      }
      final path = query.toString();
      dynamic raw = ClientNearbyCache.get(path);
      if (raw == null && effectiveLat != null && effectiveLon != null) {
        raw = ClientNearbyCache.sliceFromHomeCache(
          effectiveLat,
          effectiveLon,
          take: ClientMapViewport.mapFetchLimit,
          radius: radiusRound,
        );
      }
      raw ??= await ApiClient.get(path, null);
      if (!mounted) return;
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
        _rebuildFilteredStudios();
        _visibleMapStudios = _studiosInView(_mapController.camera);
        _isLoadingStudios = false;
        _closeCarousel();
        _lastSearchLat = effectiveLat;
        _lastSearchLon = effectiveLon;
        _lastSearchRadiusKm = radiusKm;
        _pendingSearchLat = null;
        _pendingSearchLon = null;
      });
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _syncVisibleMapStudios(_mapController.camera);
      });
    } catch (e) {
      if (!mounted) return;
      final locale = context.read<LocaleProvider>();
      setState(() {
        _isLoadingStudios = false;
        _studiosLoadError = loadErrorMessage(locale, e);
        _lastSearchLat = effectiveLat;
        _lastSearchLon = effectiveLon;
        _lastSearchRadiusKm = radiusKm;
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
    final photoUrl = map['photoUrl']?.toString() ??
        (photos is List && photos.isNotEmpty
            ? photos.first?.toString()
            : null);

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
    if (!mounted || _studioClassesCache.containsKey(studio.id)) return;
    final from = startOfLocalDay(DateTime.now());
    final fromQ = Uri.encodeComponent(from.toUtc().toIso8601String());
    final toQ = Uri.encodeComponent(
      endOfLocalDay(from).toUtc().toIso8601String(),
    );
    final classes = await _fetchClassesForStudio(studio, fromQ, toQ);
    if (!mounted) return;
    setState(() => _studioClassesCache.put(studio.id, classes));
  }

  Future<List<ExploreClassItem>> _fetchClassesForStudio(
    ExploreStudioItem studio,
    String fromQuery,
    String toQuery,
  ) async {
    try {
      final raw = await ApiClient.get(
        '/studios/${studio.id}/schedule?from=$fromQuery&to=$toQuery'
        '&limit=${ClientMapViewport.mapScheduleLimit}',
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

  void _onMapEvent(MapEvent event) {
    final camera = event.camera;
    if (event is MapEventWithMove || event is MapEventNonRotatedSizeChange) {
      _syncVisibleMapStudios(camera);
    }
    final isInteractionEnd = switch (event) {
      MapEventMoveEnd(source: MapEventSource.dragEnd) => true,
      MapEventFlingAnimationEnd() => true,
      MapEventMoveEnd(source: MapEventSource.multiFingerEnd) => true,
      _ => false,
    };
    if (!isInteractionEnd) return;
    _syncVisibleMapStudios(camera);
    _updateSearchThisAreaButton(camera);
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
    final searchRadius = _lastSearchRadiusKm ?? ClientMapViewport.maxSearchRadiusKm;
    final coverageKm = ClientMapViewport.maxCornerDistanceKm(
      camera.visibleBounds,
      LatLng(baseLat, baseLon),
    );
    // Pan → new area. Zoom-out → button only when viewport exceeds the loaded
    // radius (not at 85% — that fired while cached pins still filled the screen).
    final needsNewSearch = movedKm >= _searchAreaThresholdKm ||
        coverageKm > searchRadius;

    if (needsNewSearch) {
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

  void _selectStudioFromPin(ExploreStudioItem studio) {
    var carousel = _showCarouselCard
        ? _carouselStudios
        : _snapshotCarouselStudios(studio);
    var index = carousel.indexWhere((s) => s.id == studio.id);
    if (index < 0) {
      carousel = _snapshotCarouselStudios(studio);
      index = carousel.indexWhere((s) => s.id == studio.id);
    }
    if (index < 0) return;

    setState(() {
      _carouselStudios = carousel;
      _selectedStudioId = studio.id;
      _showCarouselCard = true;
      _visibleMapStudios = _studiosInView(_mapController.camera);
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_carouselController.hasClients) return;
      if (_carouselController.page?.round() == index) return;
      _carouselController.jumpToPage(index);
    });
    unawaited(_ensureStudioClassesLoaded(studio));
    _preloadClassesAroundIndex(index);
  }

  void _onCarouselPageChanged(int index) {
    if (index < 0 || index >= _carouselStudios.length) return;
    final studio = _carouselStudios[index];
    if (studio.id == _selectedStudioId) return;
    setState(() {
      _selectedStudioId = studio.id;
      _showCarouselCard = true;
    });
    unawaited(_ensureStudioClassesLoaded(studio));
    _preloadClassesAroundIndex(index);
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
                      children: [
                        Expanded(
                          child: Text(
                            locale.t('clientHome.filterByType'),
                            style: TextStyle(
                              fontSize: 17.sp,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ),
                        Opacity(
                          opacity: tempSelected.isNotEmpty ? 1 : 0,
                          child: IgnorePointer(
                            ignoring: tempSelected.isEmpty,
                            child: TextButton(
                              onPressed: () =>
                                  setModalState(() => tempSelected = {}),
                              child: Text(
                                locale.t('common.reset'),
                                style: TextStyle(
                                  color: AppColors.textSecondary,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
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
                          label: locale.t('clientHome.filterAllTypes'),
                          selected: tempSelected.isEmpty,
                          dimmed: tempSelected.isNotEmpty,
                          staticBorder: true,
                          useSelectionBorder: false,
                          onTap: () => setModalState(() => tempSelected = {}),
                        ),
                        ..._trainingCategories.map(
                          (cat) => TrainingCategoryColorChip(
                            category: cat,
                            label: cat.label(locale.localeCode),
                            selected: tempSelected.contains(cat.id),
                            dimmed: tempSelected.isNotEmpty &&
                                !tempSelected.contains(cat.id),
                            useSelectionBorder: false,
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
                        child: Text(locale.t('common.apply')),
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
        _rebuildFilteredStudios();
        _visibleMapStudios = _studiosInView(_mapController.camera);
        _closeCarousel();
      });
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

  Widget _buildLocateButton() {
    final locale = context.read<LocaleProvider>();
    return Semantics(
      button: true,
      label: locale.t('clientMap.centerOnLocation'),
      child: Material(
        color: Colors.white,
        elevation: 3,
        shadowColor: Colors.black.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: _centerMapOnUser,
          borderRadius: BorderRadius.circular(12),
          child: const Padding(
            padding: EdgeInsets.all(10),
            child: Icon(
              Icons.my_location_rounded,
              size: 22,
              color: AppColors.primary500,
            ),
          ),
        ),
      ),
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

  ExploreStudioItem? _selectedMapStudio() {
    final id = _selectedStudioId;
    if (id == null) return null;
    for (final studio in _filteredStudios) {
      if (studio.id == id) return studio;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final loc = context.read<ClientLocationStore>();
    final locale = context.read<LocaleProvider>();
    final center = (loc.lat != null && loc.lon != null)
        ? LatLng(loc.lat!, loc.lon!)
        : const LatLng(21.0285, 105.8542);
    final hasCoords = loc.lat != null && loc.lon != null;
    final bottomInset = MediaQuery.paddingOf(context).bottom;
    final selectedMapStudio = _selectedMapStudio();

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
                minZoom: ClientMapViewport.clientMapMinZoom,
                maxZoom: ClientMapViewport.clientMapMaxZoom,
                interactionOptions: HenzoMapLayers.interactionOptions(),
              ),
              children: [
                HenzoMapLayers.cartoLightTileLayer(),
                if (hasCoords)
                  ClientMapUserMarkerLayer(
                    lat: loc.lat!,
                    lon: loc.lon!,
                  ),
                ClientMapStudioClusterLayer(
                  mapController: _mapController,
                  mapStudios: _visibleMapStudios,
                  selectedStudioId: _selectedStudioId,
                  onPinTap: _selectStudioFromPin,
                  clusterFitPadding: ClientMapViewport.clusterFitPadding(
                    bottomSafeInset: bottomInset,
                  ),
                ),
                if (selectedMapStudio != null)
                  ClientMapSelectedPinLayer(
                    studio: selectedMapStudio,
                    onPinTap: _selectStudioFromPin,
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
                children: [
                  _buildFilterButton(),
                  const SizedBox(width: 8),
                  _buildLocateButton(),
                  const Spacer(),
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
                      elevation: 0,
                      shadowColor: Colors.transparent,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 10,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                    icon: const Icon(Icons.search, size: 16),
                    label: Text(
                      locale.t('clientMap.searchThisArea'),
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ),
            ),
          Positioned(
            left: 0,
            right: 0,
            bottom: bottomInset +
                (_filteredStudios.isEmpty &&
                        _visibleMapStudios.isEmpty &&
                        !_isLoadingStudios
                    ? 10
                    : _carouselBottomPadding),
            child: _StudioCarousel(
              isLoading: _isLoadingStudios,
              loadError: _studiosLoadError,
              showNoStudiosMessage:
                  _filteredStudios.isEmpty && _visibleMapStudios.isEmpty,
              studios: _carouselStudios,
              showCard: _showCarouselCard,
              classesByStudio: _studioClassesCache.snapshot,
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
    required this.showNoStudiosMessage,
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

  static const _height = ClientMapViewport.carouselCardHeight;
  static const _sideInset = 8.0;

  final bool isLoading;
  final String? loadError;
  final bool showNoStudiosMessage;
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

    if (showNoStudiosMessage) {
      return SizedBox(
        height: _height,
        child: Align(
          alignment: Alignment.bottomCenter,
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 20),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.82),
              borderRadius: BorderRadius.circular(14),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x14000000),
                  blurRadius: 10,
                  offset: Offset(0, 2),
                ),
              ],
            ),
            child: Text(
              noStudiosLabel,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w500,
                height: 1.35,
              ),
            ),
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

