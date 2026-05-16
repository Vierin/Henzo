import 'dart:async';

import 'package:flutter/material.dart';
import '../widgets/common/henzo_modal.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

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
import '../services/client_schedule_store.dart';
import '../services/mapbox_api_service.dart';
import '../utils/formatters.dart';
import '../utils/nearby_payload.dart';
import '../services/client_favorites_mutations.dart';
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
    this.onOpenBrowse,
    this.onCategorySelected,
    this.onOpenBookings,
  });

  final VoidCallback? onOpenMap;
  final VoidCallback? onOpenBrowse;
  final void Function(int categoryId)? onCategorySelected;
  final VoidCallback? onOpenBookings;

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
  Map<String, dynamic>? _nextBooking;
  List<Map<String, dynamic>> _todayClasses = const [];
  bool _loadingTodayClasses = false;
  List<TrainingCategoryOption> _trainingCategories = const [];
  bool _loadingCategories = true;

  @override
  void initState() {
    super.initState();
    _loadSavedLocation();
    _loadTrainingCategories();
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
      final list = extractStudiosListFromNearby(raw);
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
            reviewCount: (data['reviewCount'] as num?)?.toInt() ?? 0,
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

  Future<void> _loadTodayClasses() async {
    if (_allStudios.isEmpty) {
      if (mounted) setState(() => _todayClasses = const []);
      return;
    }
    if (!mounted) return;
    setState(() => _loadingTodayClasses = true);
    final now = DateTime.now();
    final dayStart = DateTime(now.year, now.month, now.day);
    final dayEnd = dayStart.add(const Duration(days: 1));
    final fromQuery = Uri.encodeComponent(dayStart.toUtc().toIso8601String());
    final toQuery = Uri.encodeComponent(dayEnd.toUtc().toIso8601String());
    final merged = <Map<String, dynamic>>[];

    for (final studio in _allStudios.take(4)) {
      try {
        final raw = await ApiClient.get(
          '/studios/${studio.id}/schedule?from=$fromQuery&to=$toQuery&limit=12',
          null,
        );
        if (raw is! List) continue;
        for (final row in raw) {
          if (row is! Map) continue;
          final map = Map<String, dynamic>.from(row);
          final apiStudio = map['studio'] is Map
              ? Map<String, dynamic>.from(map['studio'] as Map)
              : <String, dynamic>{};
          map['studio'] = {
            'id': studio.id,
            'name': studio.name,
            'locationCount': apiStudio['locationCount'] ?? 1,
          };
          merged.add(map);
        }
      } catch (_) {}
    }

    merged.sort((a, b) {
      final aa = parseApiDateTime(a['startsAt']) ??
          DateTime.fromMillisecondsSinceEpoch(0);
      final bb = parseApiDateTime(b['startsAt']) ??
          DateTime.fromMillisecondsSinceEpoch(0);
      return aa.compareTo(bb);
    });

    if (!mounted) return;
    setState(() {
      _todayClasses = merged.take(6).toList();
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

  void _openBrowse() {
    widget.onOpenBrowse?.call();
    ClientShellScope.maybeOf(context)?.goToExplore();
  }

  void _openCategory(TrainingCategoryOption category) {
    if (widget.onCategorySelected != null) {
      widget.onCategorySelected!(category.id);
      return;
    }
    _openBrowse();
  }

  Widget _notificationBell() {
    return Consumer<NotificationsStore>(
      builder: (context, store, _) {
        final count = store.unreadCount;
        final hasUnread = count > 0;
        return GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const NotificationsScreen()),
          ),
          child: Container(
            padding: EdgeInsets.symmetric(
              horizontal: hasUnread ? 14 : 10,
              vertical: 8,
            ),
            decoration: BoxDecoration(
              color: hasUnread
                  ? AppColors.primary500
                  : AppColors.backgroundPrimary,
              borderRadius: BorderRadius.circular(999),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                SvgPicture.asset(
                  'assets/icons/icon-bell.svg',
                  width: 18,
                  height: 22,
                  colorFilter: ColorFilter.mode(
                    hasUnread ? Colors.white : AppColors.textPrimary,
                    BlendMode.srcIn,
                  ),
                ),
                if (hasUnread) ...[
                  const SizedBox(width: 6),
                  Text(
                    count > 99 ? '99+' : '$count',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ],
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
                  title,
                  style: BrandTypography.sectionTitle(context),
                ),
              ),
              if (actionLabel != null && onAction != null)
                TextButton(
                  onPressed: onAction,
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.primary500,
                    padding: EdgeInsets.zero,
                    minimumSize: const Size(0, 32),
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: Text(
                    actionLabel,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
            ],
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: BrandTypography.sectionSubtitle(context),
            ),
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
    final locationLabel = _selectedCity ?? locale.t('clientHome.setLocation');
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
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  child: Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          borderRadius: BorderRadius.circular(10),
                          onTap: _openManualLocationInput,
                          child: Row(
                            children: [
                              const Icon(
                                Icons.location_on_outlined,
                                size: 18,
                                color: AppColors.primary500,
                              ),
                              const SizedBox(width: 4),
                              Expanded(
                                child: RichText(
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  text: TextSpan(
                                    style: const TextStyle(
                                      fontSize: 13,
                                      color: AppColors.textSecondary,
                                      height: 1.25,
                                    ),
                                    children: [
                                      TextSpan(
                                        text:
                                            '${locale.t('clientHome.nowIn')} ',
                                      ),
                                      TextSpan(
                                        text: locationLabel,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.textPrimary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const Icon(
                                Icons.keyboard_arrow_down_rounded,
                                size: 20,
                                color: AppColors.textSecondary,
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      _notificationBell(),
                    ],
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: screenPaddingH(top: 16, bottom: 12),
                  child: RichText(
                    text: TextSpan(
                      style: BrandTypography.greeting(context),
                      children: [
                        TextSpan(text: locale.t('clientHome.greetingPrefix')),
                        TextSpan(
                          text: locale.t('clientHome.greetingEmphasis'),
                          style: BrandTypography.greetingEmphasis(context),
                        ),
                        TextSpan(text: ', $firstName.'),
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
                          onTap: _openBrowse,
                          readOnly: true,
                          decoration: InputDecoration(
                            hintText: locale.t('clientHome.searchHint'),
                            prefixIcon: const Icon(
                              Icons.search,
                              size: 20,
                              color: AppColors.textSecondary,
                            ),
                            filled: true,
                            fillColor: AppColors.backgroundPrimary,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(14),
                              borderSide: BorderSide.none,
                            ),
                            contentPadding: const EdgeInsets.symmetric(
                              vertical: 12,
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
                  subtitle: locale.t('clientHome.topPicksSubtitle'),
                  actionLabel: locale.t('clientHome.seeAll'),
                  onAction: _openBrowse,
                ),
              ),
              SliverToBoxAdapter(
                child: SizedBox(
                  height: 212,
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
                  onAction: _openBrowse,
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
    final sessionId =
        (item['id'] ?? item['sessionId'] ?? '').toString();
    final startsHint = parseApiDateTime(item['startsAt']);
    final locationCount = (studio['locationCount'] as num?)?.toInt() ?? 1;
    final sub = resolveOwnerSessionCardSubtitleForPublic(
      session: session,
      studioLocationCount: locationCount,
    );
    final trainerLine = sub.showLocationPin
        ? ownerDailyScheduleTrainerLabel(session, null)
        : null;

    return OwnerDailyScheduleSessionCard(
      session: session,
      subtitleLabel: sub.label,
      showLocationPin: sub.showLocationPin,
      trainerLine: trainerLine,
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
    );
  }
}
