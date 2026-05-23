import 'dart:async';

import 'package:flutter/material.dart';
import '../widgets/common/henzo_modal.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../constants/brand_typography.dart';
import '../constants/colors.dart';
import '../constants/layout.dart';
import '../l10n/locale_provider.dart';
import '../models/public_studio_preview.dart';
import '../models/training_category_option.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../services/notifications_store.dart';
import '../services/cache/client_nearby_cache.dart';
import '../services/client_favorites_store.dart';
import '../services/client_location_store.dart';
import '../services/client_schedule_store.dart';
import '../services/mapbox_api_service.dart';
import '../utils/formatters.dart';
import '../utils/nearby_payload.dart';
import '../services/client_favorites_mutations.dart';
import '../widgets/app_search_prefix_icon.dart';
import '../widgets/client/home/client_home_category_chip.dart';
import '../services/dashboard_api_service.dart';
import '../widgets/client/home/client_home_upcoming_card.dart';
import '../utils/owner_session_card_subtitle.dart';
import '../widgets/dashboard/owner_daily_schedule_session_card.dart';
import '../widgets/public/top_studio_card.dart';
import 'client/client_shell_scope.dart';
import 'location_picker_screen.dart';
import 'notifications_screen.dart';
import 'public_class_detail_screen.dart';
import 'public_studio_detail_screen.dart';

class PublicHomeScreen extends StatefulWidget {
  const PublicHomeScreen({
    super.key,
    this.onOpenMap,
    this.onOpenBrowseStudios,
    this.onOpenBrowseClasses,
    this.onCategorySelected,
    this.onOpenBookings,
  });

  final VoidCallback? onOpenMap;
  final VoidCallback? onOpenBrowseStudios;
  final VoidCallback? onOpenBrowseClasses;
  final void Function(int categoryId)? onCategorySelected;
  final VoidCallback? onOpenBookings;

  @override
  State<PublicHomeScreen> createState() => _PublicHomeScreenState();
}

class _PublicHomeScreenState extends State<PublicHomeScreen> {
  static const _clientHomeLocationBlue = Color(0xFF4D39A8);

  final TextEditingController _searchController = TextEditingController();
  List<PublicStudioPreview> _allStudios = const [];
  bool _isLoadingStudios = true;
  bool _locationModalShown = false;
  ClientLocationStore? _locationStore;
  final Set<String> _favoriteLoadingIds = <String>{};
  Map<String, dynamic>? _nextBooking;
  List<Map<String, dynamic>> _todayClasses = const [];
  bool _loadingTodayClasses = false;
  List<TrainingCategoryOption> _trainingCategories = const [];
  bool _loadingCategories = true;

  @override
  void initState() {
    super.initState();
    _loadTrainingCategories();
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrapHomeData());
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
    _searchController.dispose();
    super.dispose();
  }

  void _onSharedLocationChanged() {
    if (!mounted) return;
    unawaited(_loadTopStudiosNearby());
  }

  Future<void> _bootstrapHomeData() async {
    if (!mounted) return;
    final loc = context.read<ClientLocationStore>();
    await _loadTopStudiosNearby();
    if (!loc.hasCity && !_locationModalShown) {
      _locationModalShown = true;
      _showLocationRequestModal();
    }
  }

  Future<void> _loadTopStudiosNearby() async {
    if (!mounted) return;
    final loc = context.read<ClientLocationStore>();
    setState(() => _isLoadingStudios = true);
    try {
      final query = StringBuffer('/studios/nearby?limit=50');
      if (loc.lat != null && loc.lon != null) {
        query
          ..write('&lat=')
          ..write(loc.lat!.toStringAsFixed(6))
          ..write('&lng=')
          ..write(loc.lon!.toStringAsFixed(6))
          ..write('&radius=50');
      }
      final path = query.toString();
      var raw = ClientNearbyCache.get(path);
      if (raw == null) {
        raw = await ApiClient.get(path, null);
        ClientNearbyCache.put(path, raw);
      }
      final list = extractStudiosListFromNearby(raw);
      final mapped = <PublicStudioPreview>[];
      for (final item in list) {
        if (item is! Map) continue;
        final data = Map<String, dynamic>.from(item);
        final preview = parsePublicStudioPreviewFromNearby(data);
        final distanceKm = _distanceKmForStudio(data, preview.distanceKm, loc);
        mapped.add(
          preview.distanceKm == distanceKm
              ? preview
              : PublicStudioPreview(
                  id: preview.id,
                  studioName: preview.studioName,
                  categories: preview.categories,
                  rating: preview.rating,
                  address: preview.address,
                  distanceKm: distanceKm,
                  photoUrl: preview.photoUrl,
                  reviewCount: preview.reviewCount,
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
      unawaited(_loadClientSchedule(token));
      unawaited(_loadTodayClasses());
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _allStudios = const [];
        _isLoadingStudios = false;
      });
    }
  }

  /// Same idea as Explore: use API `distance` when present; otherwise Haversine
  /// from saved client position + studio coordinates (e.g. featured fallback).
  double? _distanceKmForStudio(
    Map<String, dynamic> data,
    double? apiDistance,
    ClientLocationStore loc,
  ) {
    if (apiDistance != null) return apiDistance;
    if (loc.lat == null || loc.lon == null) return null;
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
      LatLng(loc.lat!, loc.lon!),
      LatLng(slat, slng),
    );
    return meters / 1000.0;
  }

  Future<void> _persistLocation({
    required String city,
    double? lat,
    double? lon,
  }) async {
    await context.read<ClientLocationStore>().apply(
      city: city,
      lat: lat,
      lon: lon,
    );
  }

  Future<void> _showLocationRequestModal() async {
    await showHenzoModalBottomSheet<void>(
      context: context,
      isDismissible: true,
      showDragHandle: true,
      backgroundColor: AppColors.backgroundPrimary,
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: screenPaddingH(top: 10, bottom: 20),
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
        builder: (_) => LocationPickerScreen(
          initialCity: context.read<ClientLocationStore>().city ?? '',
        ),
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

  Future<void> _loadClientSchedule(String? token) async {
    if (token == null || token.isEmpty) return;
    try {
      final all = await ClientScheduleStore.loadFullSchedule(token);
      final upcoming = ClientScheduleStore.upcomingItems(all);
      if (!mounted) return;
      setState(() {
        _nextBooking = upcoming.isNotEmpty ? upcoming.first : null;
      });
    } catch (_) {}
  }

  static const int _kPopularTodayMaxCards = 6;
  static const int _kPopularTodayStudioScan = 20;

  bool _isUpcomingToday(DateTime startsAt) {
    final now = DateTime.now();
    return startsAt.year == now.year &&
        startsAt.month == now.month &&
        startsAt.day == now.day &&
        !startsAt.isBefore(now);
  }

  bool _sessionHasAvailableSpots(Map<String, dynamic> map) {
    final capacity = (map['capacity'] as num?)?.toInt();
    final booked = (map['bookedCount'] as num?)?.toInt() ?? 0;
    if (capacity == null || capacity <= 0) return true;
    return booked < capacity;
  }

  List<PublicStudioPreview> _studiosNearestFirst() {
    final copy = List<PublicStudioPreview>.from(_allStudios);
    copy.sort((a, b) {
      final ad = a.distanceKm ?? double.infinity;
      final bd = b.distanceKm ?? double.infinity;
      return ad.compareTo(bd);
    });
    return copy;
  }

  Future<List<Map<String, dynamic>>> _fetchPopularTodaySessionsForStudio(
    PublicStudioPreview studio,
    String fromQuery,
    String toQuery,
  ) async {
    try {
      final raw = await ApiClient.get(
        '/studios/${studio.id}/schedule?from=$fromQuery&to=$toQuery&limit=24',
        null,
      );
      if (raw is! List) return const [];
      final out = <Map<String, dynamic>>[];
      for (final row in raw) {
        if (row is! Map) continue;
        final map = Map<String, dynamic>.from(row);
        final status = (map['status'] ?? 'ACTIVE').toString().toUpperCase();
        if (status != 'ACTIVE') continue;

        final startsAt = parseApiDateTime(map['startsAt']);
        if (startsAt == null || !_isUpcomingToday(startsAt)) continue;
        if (!_sessionHasAvailableSpots(map)) continue;

        final apiStudio = map['studio'] is Map
            ? Map<String, dynamic>.from(map['studio'] as Map)
            : <String, dynamic>{};
        map['studio'] = {
          'id': studio.id,
          'name': studio.studioName,
          'locationCount': apiStudio['locationCount'] ?? 1,
        };
        map['_reviewCount'] = studio.reviewCount;
        map['_distanceKm'] = studio.distanceKm;
        out.add(map);
      }
      return out;
    } catch (_) {
      return const [];
    }
  }

  Future<void> _loadTodayClasses() async {
    if (_allStudios.isEmpty) {
      if (mounted) {
        setState(() {
          _todayClasses = const [];
          _loadingTodayClasses = false;
        });
      }
      return;
    }
    if (!mounted) return;
    setState(() => _loadingTodayClasses = true);

    final now = DateTime.now();
    final dayStart = DateTime(now.year, now.month, now.day);
    final dayEnd = dayStart.add(const Duration(days: 1));
    final fromQuery = Uri.encodeComponent(dayStart.toUtc().toIso8601String());
    final toQuery = Uri.encodeComponent(dayEnd.toUtc().toIso8601String());

    final studios = _studiosNearestFirst().take(_kPopularTodayStudioScan);
    final merged = <Map<String, dynamic>>[];
    const concurrency = 4;
    final studioList = studios.toList();
    for (var i = 0; i < studioList.length; i += concurrency) {
      final end = i + concurrency > studioList.length
          ? studioList.length
          : i + concurrency;
      final batch = studioList.sublist(i, end);
      final batchResults = await Future.wait(
        batch.map(
          (s) => _fetchPopularTodaySessionsForStudio(s, fromQuery, toQuery),
        ),
      );
      for (final list in batchResults) {
        merged.addAll(list);
      }
    }

    merged.sort((a, b) {
      final aReviews = (a['_reviewCount'] as num?)?.toInt() ?? 0;
      final bReviews = (b['_reviewCount'] as num?)?.toInt() ?? 0;
      final byReviews = bReviews.compareTo(aReviews);
      if (byReviews != 0) return byReviews;

      final ad = (a['_distanceKm'] as num?)?.toDouble() ?? double.infinity;
      final bd = (b['_distanceKm'] as num?)?.toDouble() ?? double.infinity;
      final byDistance = ad.compareTo(bd);
      if (byDistance != 0) return byDistance;

      final aa =
          parseApiDateTime(a['startsAt']) ??
          DateTime.fromMillisecondsSinceEpoch(0);
      final bb =
          parseApiDateTime(b['startsAt']) ??
          DateTime.fromMillisecondsSinceEpoch(0);
      return aa.compareTo(bb);
    });

    if (!mounted) return;
    setState(() {
      _todayClasses = merged.take(_kPopularTodayMaxCards).toList();
      _loadingTodayClasses = false;
    });
  }

  Future<void> _loadTrainingCategories() async {
    try {
      final raw = await ApiClient.get('/trainings/categories', null);
      if (raw is! List) return;
      final list = <TrainingCategoryOption>[];
      for (final row in raw) {
        if (row is! Map) continue;
        list.add(
          TrainingCategoryOption.fromJson(Map<String, dynamic>.from(row)),
        );
      }
      if (!mounted) return;
      setState(() {
        _trainingCategories = TrainingCategoryOption.withOtherLast(list);
        _loadingCategories = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loadingCategories = false);
    }
  }

  void _openBrowseStudios() {
    widget.onOpenBrowseStudios?.call();
    ClientShellScope.maybeOf(context)?.goToExplore(showClasses: false);
  }

  void _openBrowseClasses() {
    widget.onOpenBrowseClasses?.call();
    ClientShellScope.maybeOf(context)?.goToExplore(showClasses: true);
  }

  void _openCategory(TrainingCategoryOption category) {
    if (widget.onCategorySelected != null) {
      widget.onCategorySelected!(category.id);
      return;
    }
    _openBrowseClasses();
  }

  Widget _notificationBell() {
    return Consumer<NotificationsStore>(
      builder: (context, store, _) {
        final count = store.items
            .where(isClientRelevantNotification)
            .where((n) => !n.read)
            .length;
        final hasUnread = count > 0;
        return GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => const NotificationsScreen(
                audience: NotificationsScreenAudience.client,
              ),
            ),
          ),
          child: Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: AppColors.backgroundPrimary,
              shape: BoxShape.circle,
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                SvgPicture.asset(
                  'assets/icons/icon-bell.svg',
                  width: 18,
                  height: 22,
                  colorFilter: const ColorFilter.mode(
                    AppColors.primary500,
                    BlendMode.srcIn,
                  ),
                ),
                if (hasUnread)
                  Positioned(
                    right: 10,
                    top: 9,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 4,
                        vertical: 1,
                      ),
                      constraints: const BoxConstraints(minWidth: 16),
                      decoration: const BoxDecoration(
                        color: AppColors.primary500,
                        shape: BoxShape.circle,
                      ),
                      child: Text(
                        count > 9 ? '9+' : '$count',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                          height: 1.2,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
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
            },
          );
    if (!mounted) return;
    if (ok) {
      if (wasFavorite) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            const SnackBar(content: Text('Removed from favorites')),
          );
      } else {
        HapticFeedback.lightImpact();
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(const SnackBar(content: Text('Added to favorites')));
      }
    } else {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(content: Text('Failed to update favorites')),
        );
    }
    setState(() => _favoriteLoadingIds.remove(studio.id));
  }

  Widget _sectionHeader({
    required String title,
    String? subtitle,
    String? actionLabel,
    VoidCallback? onAction,
  }) {
    return Padding(
      padding: screenPaddingH(top: 20, bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    letterSpacing: 0.2,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              if (actionLabel != null && onAction != null)
                GestureDetector(
                  onTap: onAction,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        actionLabel,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary500,
                        ),
                      ),
                      const Icon(
                        Icons.chevron_right_rounded,
                        size: 20,
                        color: AppColors.primary500,
                      ),
                    ],
                  ),
                ),
            ],
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 2),
            Text(subtitle, style: BrandTypography.sectionSubtitle(context)),
          ],
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final favStore = context.watch<ClientFavoritesStore>();
    final auth = context.watch<AuthService>();
    final user = auth.user;
    final firstName = user?.name?.trim().split(RegExp(r'\s+')).first ?? 'there';
    final locationStore = context.watch<ClientLocationStore>();
    final locationLabel = locationStore
        .displayLabel(locale.t('clientHome.setLocation'))
        .toUpperCase();
    final studios = _filteredStudios;

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            await _loadTopStudiosNearby();
            if (!mounted) return;
            final token = context.read<AuthService>().accessToken;
            await _loadClientSchedule(token);
          },
          color: AppColors.primary500,
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 18, 16, 0),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      InkWell(
                        borderRadius: BorderRadius.circular(10),
                        onTap: _openManualLocationInput,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            SvgPicture.asset(
                              'assets/icons/icon-pin.svg',
                              width: 12,
                              height: 16,
                            ),
                            const SizedBox(width: 6),
                            ConstrainedBox(
                              constraints: BoxConstraints(
                                maxWidth:
                                    MediaQuery.sizeOf(context).width - 120,
                              ),
                              child: Text(
                                locationLabel,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 14,
                                  letterSpacing: 0.4,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                            ),
                            const Icon(
                              Icons.keyboard_arrow_down_rounded,
                              size: 18,
                              color: _clientHomeLocationBlue,
                            ),
                          ],
                        ),
                      ),
                      const Spacer(),
                      _notificationBell(),
                    ],
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: screenPaddingH(top: 0, bottom: 12),
                  child: RichText(
                    text: TextSpan(
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w500,
                        height: 1.1,
                        color: AppColors.textPrimary,
                      ),
                      children: [
                        TextSpan(text: locale.t('clientHome.greetingHello')),
                        TextSpan(
                          text: firstName,
                          style: const TextStyle(fontWeight: FontWeight.w400),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: screenPaddingH(),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _searchController,
                          onTap: _openBrowseClasses,
                          readOnly: true,
                          decoration: InputDecoration(
                            hintText: locale.t('clientHome.searchHint'),
                            hintStyle: const TextStyle(
                              color: AppColors.textTertiary,
                              fontSize: 14,
                            ),
                            isDense: true,
                            prefixIcon: const AppSearchPrefixIcon(
                              leftMargin: 12,
                            ),
                            prefixIconConstraints:
                                AppSearchPrefixIcon.prefixConstraints(
                              leftMargin: 12,
                              trailingGap: 4,
                            ),
                            filled: true,
                            fillColor: AppColors.backgroundPrimary,
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(
                                color: AppColors.primary500.withValues(
                                  alpha: 0.45,
                                ),
                              ),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(
                                color: AppColors.primary500,
                                width: 1.5,
                              ),
                            ),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(
                                color: AppColors.primary500.withValues(
                                  alpha: 0.45,
                                ),
                              ),
                            ),
                            contentPadding: const EdgeInsets.symmetric(
                              vertical: 12,
                              horizontal: 12,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: SizedBox(
                  height: 50,
                  child: _loadingCategories
                      ? const Center(
                          child: SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        )
                      : _trainingCategories.isEmpty
                      ? const SizedBox.shrink()
                      : ListView.separated(
                          scrollDirection: Axis.horizontal,
                          padding: screenPaddingH(top: 12),
                          itemCount: _trainingCategories.length,
                          separatorBuilder: (_, _) => const SizedBox(width: 8),
                          itemBuilder: (_, index) {
                            final cat = _trainingCategories[index];
                            return ClientHomeCategoryChip(
                              category: cat,
                              label: cat.label(locale.localeCode),
                              onTap: () => _openCategory(cat),
                            );
                          },
                        ),
                ),
              ),
              if (_nextBooking != null)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 16),
                    child: _buildUpcomingCard(_nextBooking!),
                  ),
                ),
              SliverToBoxAdapter(
                child: _sectionHeader(
                  title: locale.t('clientHome.topPicksTitle'),
                  actionLabel: locale.t('clientHome.seeAll'),
                  onAction: _openBrowseStudios,
                ),
              ),
              SliverToBoxAdapter(
                child: SizedBox(
                  height: 186,
                  child: _isLoadingStudios
                      ? const Center(child: CircularProgressIndicator())
                      : studios.isEmpty
                      ? Padding(
                          padding: screenPaddingH(),
                          child: Center(
                            child: Text(
                              locale.t('publicHome.noStudios'),
                              style: BrandTypography.sectionSubtitle(context),
                            ),
                          ),
                        )
                      : ListView.builder(
                          cacheExtent: 400,
                          padding: screenPaddingH(),
                          scrollDirection: Axis.horizontal,
                          itemCount: studios.length,
                          itemBuilder: (_, index) {
                            final studio = studios[index];
                            return TopStudioCard(
                              homeLayout: true,
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
                child: _sectionHeader(
                  title: locale.t('clientHome.popularTodayTitle'),
                  actionLabel: locale.t('clientHome.seeAll'),
                  onAction: _openBrowseClasses,
                ),
              ),
              if (_loadingTodayClasses)
                const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Center(child: CircularProgressIndicator()),
                  ),
                )
              else if (_todayClasses.isEmpty)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: screenPaddingH(),
                    child: Text(
                      locale.t('clientHome.noClassesToday'),
                      style: BrandTypography.sectionSubtitle(context),
                    ),
                  ),
                )
              else
                SliverToBoxAdapter(
                  child: Padding(
                    padding: screenPaddingH(bottom: 24),
                    child: Column(
                      children: [
                        for (final item in _todayClasses)
                          _buildPopularSessionCard(item),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildUpcomingCard(Map<String, dynamic> item) {
    final training = item['training'] is Map
        ? Map<String, dynamic>.from(item['training'] as Map)
        : <String, dynamic>{};
    final studio = item['studio'] is Map
        ? Map<String, dynamic>.from(item['studio'] as Map)
        : <String, dynamic>{};
    final trainer = item['trainer'] is Map
        ? (item['trainer']['name'] ?? '').toString()
        : '';
    final startsAt = parseApiDateTime(item['startsAt']);
    if (startsAt == null) return const SizedBox.shrink();

    return ClientHomeUpcomingCard(
      startsAt: startsAt,
      className: (training['name'] ?? 'Class').toString(),
      studioName: (studio['name'] ?? 'Studio').toString(),
      trainerName: trainer.isEmpty ? null : trainer,
      onTap: widget.onOpenBookings,
    );
  }

  OwnerTrainingSession? _mapToOwnerSession(Map<String, dynamic> item) {
    final training = item['training'] is Map
        ? Map<String, dynamic>.from(item['training'] as Map)
        : <String, dynamic>{};
    final startsAt = parseApiDateTime(item['startsAt']);
    if (startsAt == null) return null;

    final durationMin = (training['duration'] as num?)?.toInt() ?? 60;
    final endsAt =
        parseApiDateTime(item['endsAt']) ??
        startsAt.add(Duration(minutes: durationMin));

    final capacity = (item['capacity'] as num?)?.toInt() ?? 0;
    final enrolled =
        (item['enrolledCount'] as num?)?.toInt() ??
        (item['bookedCount'] as num?)?.toInt() ??
        0;

    final trainer = item['trainer'] is Map
        ? Map<String, dynamic>.from(item['trainer'] as Map)
        : <String, dynamic>{};

    return OwnerTrainingSession(
      sessionId: (item['id'] ?? item['sessionId'] ?? '').toString(),
      trainingId: (training['id'] ?? '').toString(),
      startsAt: startsAt,
      endsAt: endsAt,
      status: (item['status'] ?? 'ACTIVE').toString(),
      capacity: capacity,
      enrolledCount: enrolled,
      attendedCount: enrolled,
      trainingName: (training['name'] ?? 'Class').toString(),
      trainingDurationMinutes: durationMin,
      trainingDisplayColorHex: training['displayColor']?.toString(),
      trainerName: (trainer['name'] ?? '—').toString(),
      trainerId: trainer['id']?.toString(),
      locationId: item['locationId']?.toString(),
      locationName: item['locationName']?.toString(),
    );
  }

  Widget _buildPopularSessionCard(Map<String, dynamic> item) {
    final session = _mapToOwnerSession(item);
    if (session == null) return const SizedBox.shrink();

    final studio = item['studio'] is Map
        ? Map<String, dynamic>.from(item['studio'] as Map)
        : <String, dynamic>{};
    final studioId = (studio['id'] ?? '').toString();
    final sessionId = (item['id'] ?? item['sessionId'] ?? '').toString();
    final startsHint = parseApiDateTime(item['startsAt']);
    final locationCount = (studio['locationCount'] as num?)?.toInt() ?? 1;
    final sub = resolveOwnerSessionCardSubtitleForPublic(
      session: session,
      studioLocationCount: locationCount,
    );
    final rows = layoutOwnerSessionCardRows(
      session: session,
      subtitleLabel: sub.label,
      showLocationPin: sub.showLocationPin,
    );

    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: OwnerDailyScheduleSessionCard(
        session: session,
        subtitleLabel: rows.subtitleLabel,
        showLocationPin: rows.showLocationPin,
        showSubtitleLeadingIcon: rows.showSubtitleLeadingIcon,
        trainerLine: rows.trainerLine,
        onTap: () {
          if (studioId.isEmpty || sessionId.isEmpty || startsHint == null) {
            return;
          }
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => PublicClassDetailScreen(
                studioId: studioId,
                sessionId: sessionId,
                sessionStartsAtHint: startsHint,
              ),
            ),
          );
        },
      ),
    );
  }
}
