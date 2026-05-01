import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config/app_config.dart';
import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import '../models/training_category_option.dart';
import '../services/api_client.dart';
import '../services/cache/client_nearby_cache.dart';
import '../services/client_favorites_store.dart';
import '../utils/color_hex.dart';
import '../widgets/public/cached_salon_network_image.dart';
import 'client_map_screen.dart';
import 'public_home_screen.dart';
import 'public_studio_detail_screen.dart';
import 'public_studio_schedule_screen.dart';
import '../services/auth_service.dart';
import '../widgets/public/class_schedule_card.dart';

class ClientShell extends StatefulWidget {
  const ClientShell({super.key});

  @override
  State<ClientShell> createState() => _ClientShellState();
}

class _ClientShellState extends State<ClientShell> {
  int _currentIndex = 0;
  bool _showMapScreen = false;
  final GlobalKey<_ClientSearchScreenState> _exploreScreenKey =
      GlobalKey<_ClientSearchScreenState>();

  void goToExploreTab() {
    setState(() => _currentIndex = 1);
    _exploreScreenKey.currentState?.ensureExploreLoaded();
  }

  List<Widget> get _screens => [
    PublicHomeScreen(
      onOpenMap: () => setState(() {
        _showMapScreen = true;
      }),
    ),
    _ClientSearchScreen(key: _exploreScreenKey),
    const _ClientFavoritesScreen(),
    const _ClientProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          IndexedStack(index: _currentIndex, children: _screens),
          if (_showMapScreen)
            Positioned.fill(
              child: ClientMapScreen(
                onBack: () => setState(() => _showMapScreen = false),
              ),
            ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.backgroundPrimary,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.08),
                blurRadius: 8,
                offset: const Offset(0, -2),
              ),
            ],
          ),
          constraints: const BoxConstraints(minHeight: 42, maxHeight: 56),
          padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 6),
          child: Row(
            children: [
              Expanded(
                child: _ClientNavItem(
                  icon: Icons.home_outlined,
                  activeIcon: Icons.home,
                  label: 'Home',
                  isSelected: _currentIndex == 0,
                  onTap: () => setState(() => _currentIndex = 0),
                ),
              ),
              Expanded(
                child: _ClientNavItem(
                  icon: Icons.search_outlined,
                  activeIcon: Icons.search,
                  label: 'Explore',
                  isSelected: _currentIndex == 1,
                  onTap: () {
                    setState(() => _currentIndex = 1);
                    _exploreScreenKey.currentState?.ensureExploreLoaded();
                  },
                ),
              ),
              Expanded(
                child: _ClientNavItem(
                  icon: Icons.favorite_border,
                  activeIcon: Icons.favorite,
                  label: 'Favorites',
                  isSelected: _currentIndex == 2,
                  onTap: () {
                    setState(() => _currentIndex = 2);
                    final t = context.read<AuthService>().accessToken;
                    context.read<ClientFavoritesStore>().sync(t, force: false);
                  },
                ),
              ),
              Expanded(
                child: _ClientNavItem(
                  icon: Icons.person_outline,
                  activeIcon: Icons.person,
                  label: 'Profile',
                  isSelected: _currentIndex == 3,
                  onTap: () => setState(() => _currentIndex = 3),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ClientSearchScreen extends StatefulWidget {
  const _ClientSearchScreen({super.key});

  @override
  State<_ClientSearchScreen> createState() => _ClientSearchScreenState();
}

class _ClientSearchScreenState extends State<_ClientSearchScreen> {
  static const _cityKey = 'client_city';
  static const _latKey = 'client_lat';
  static const _lonKey = 'client_lon';
  bool _loading = true;
  bool _showClasses = false;
  int _selectedDayOffset = 0;
  String _locationLabel = 'Set location';
  double? _selectedLat;
  double? _selectedLon;
  String _distanceFilter = 'auto';
  String _sortBy = 'recommended';
  final Set<String> _timePeriods = <String>{};
  /// Minutes from midnight; max 1440 = 24:00. Slider uses 30-minute steps.
  RangeValues _timeRange = const RangeValues(0, 1440);
  List<_ExploreStudioItem> _studios = const [];
  List<_ExploreClassItem> _classes = const [];
  List<TrainingCategoryOption> _trainingCategories = const [];
  int? _selectedCategoryId;

  @override
  void initState() {
    super.initState();
    _loadSavedLocationOnly();
  }

  /// First call is deferred until user opens the Explore tab (see [ensureExploreLoaded]).
  bool _exploreLoadRequested = false;

  void ensureExploreLoaded() {
    if (_exploreLoadRequested) return;
    _exploreLoadRequested = true;
    _loadExplore();
  }

  Future<void> _loadSavedLocationOnly() async {
    final prefs = await SharedPreferences.getInstance();
    final city = prefs.getString(_cityKey)?.trim();
    final lat = prefs.getDouble(_latKey);
    final lon = prefs.getDouble(_lonKey);
    if (!mounted) return;
    setState(() {
      _locationLabel = (city != null && city.isNotEmpty)
          ? city
          : 'Set location';
      _selectedLat = lat;
      _selectedLon = lon;
    });
  }

  int _currentRadiusKm() {
    switch (_distanceFilter) {
      case '5':
        return 5;
      case '10':
        return 10;
      case '15':
        return 15;
      case '30+':
        return 50;
      case 'auto':
      default:
        return 20;
    }
  }

  Future<List<_ExploreClassItem>> _fetchExploreClassesForStudio(
    _ExploreStudioItem studio,
    String fromQuery,
    String toQuery,
  ) async {
    try {
      final raw = await ApiClient.get(
        '/studios/${studio.id}/schedule?from=$fromQuery&to=$toQuery&limit=20',
        null,
      );
      if (raw is! List) return const [];
      final out = <_ExploreClassItem>[];
      for (final row in raw) {
        if (row is! Map) continue;
        final map = Map<String, dynamic>.from(row);
        final training = map['training'] is Map
            ? Map<String, dynamic>.from(map['training'] as Map)
            : <String, dynamic>{};
        final startsAt = DateTime.tryParse(
          (map['startsAt'] ?? '').toString(),
        )?.toLocal();
        if (startsAt == null) continue;
        final trainingCategoryId = training['trainingCategoryId'] == null
            ? null
            : (training['trainingCategoryId'] as num).toInt();
        out.add(
          _ExploreClassItem(
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
          ),
        );
      }
      return out;
    } catch (_) {
      return const [];
    }
  }

  Future<void> _loadExplore() async {
    if (!mounted) return;
    setState(() => _loading = true);
    try {
      final radiusKm = _currentRadiusKm();
      final nearbyQuery = StringBuffer(
        '/studios/nearby?limit=20&radius=$radiusKm',
      );
      if (_selectedLat != null && _selectedLon != null) {
        nearbyQuery
          ..write('&lat=')
          ..write(_selectedLat!.toStringAsFixed(6))
          ..write('&lng=')
          ..write(_selectedLon!.toStringAsFixed(6));
      }
      final nearbyPath = nearbyQuery.toString();
      var nearbyRaw = ClientNearbyCache.get(nearbyPath);
      if (nearbyRaw == null) {
        nearbyRaw = await ApiClient.get(nearbyPath, null);
        ClientNearbyCache.put(nearbyPath, nearbyRaw);
      }
      final nearbyList = nearbyRaw is List
          ? nearbyRaw
          : (nearbyRaw is Map<String, dynamic> && nearbyRaw['data'] is List
                ? nearbyRaw['data'] as List
                : <dynamic>[]);

      final studios = <_ExploreStudioItem>[];
      for (final item in nearbyList) {
        if (item is! Map) continue;
        final map = Map<String, dynamic>.from(item);
        final id = (map['id'] ?? '').toString();
        if (id.isEmpty) continue;
        final reviews = map['Review'] is List
            ? map['Review'] as List
            : const [];
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
        final categoryNames = <String>[];
        final rawCats = map['categories'];
        if (rawCats is List) {
          for (final e in rawCats) {
            final s = e.toString().trim();
            if (s.isNotEmpty) categoryNames.add(s);
          }
        }

        studios.add(
          _ExploreStudioItem(
            id: id,
            name: (map['name'] ?? 'Studio').toString(),
            address: (map['address'] ?? '').toString(),
            distanceKm: (map['distance'] as num?)?.toDouble(),
            rating: avgRating,
            reviewCount: reviewCount,
            logoUrl:
                (map['logoUrl'] ??
                        map['logo'] ??
                        map['brandLogoUrl'] ??
                        map['avatarUrl'])
                    ?.toString(),
            lat:
                (map['lat'] as num?)?.toDouble() ??
                (map['latitude'] as num?)?.toDouble(),
            lng:
                (map['lng'] as num?)?.toDouble() ??
                (map['lon'] as num?)?.toDouble() ??
                (map['longitude'] as num?)?.toDouble(),
            trainingCategoryIds: trainingCategoryIds,
            categoryNames: categoryNames,
          ),
        );
      }

      final classes = <_ExploreClassItem>[];
      final from = DateTime.now();
      final to = from.add(const Duration(days: 6));
      final toQuery = Uri.encodeComponent(to.toIso8601String());
      final fromQuery = Uri.encodeComponent(from.toIso8601String());
      final slice = studios.take(8).toList();
      const concurrency = 4;
      for (var i = 0; i < slice.length; i += concurrency) {
        final end =
            i + concurrency > slice.length ? slice.length : i + concurrency;
        final batch = slice.sublist(i, end);
        final batchResults = await Future.wait(
          batch.map(
            (s) => _fetchExploreClassesForStudio(s, fromQuery, toQuery),
          ),
        );
        for (final list in batchResults) {
          classes.addAll(list);
        }
      }
      classes.sort((a, b) => a.startsAt.compareTo(b.startsAt));

      _applyStudioSortInPlace(studios);
      if (!mounted) return;
      setState(() {
        _studios = studios;
        _classes = classes;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  String _dayLabel(int offset) {
    if (offset == 0) return 'Today';
    final d = DateTime.now().add(Duration(days: offset));
    const wd = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return '${wd[d.weekday - 1]} ${d.day}';
  }

  String _formatVnd(num value) {
    final digits = value.round().toString();
    final out = StringBuffer();
    for (int i = 0; i < digits.length; i++) {
      out.write(digits[i]);
      final left = digits.length - i - 1;
      if (left > 0 && left % 3 == 0) out.write('.');
    }
    return out.toString();
  }

  String _formatTime24(DateTime dt) {
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }

  String _formatMinutesLabel(double minutes) {
    final safe = minutes.round().clamp(0, 1440);
    final h = (safe ~/ 60).toString().padLeft(2, '0');
    final m = (safe % 60).toString().padLeft(2, '0');
    return '$h:$m';
  }

  /// Snap to 30-minute steps for [RangeSlider] (min 0, max 1440, divisions 48).
  RangeValues _alignTimeRangeToSlider(RangeValues r) {
    int step30(int v) => ((v / 30.0).round() * 30).clamp(0, 1440);
    var a = step30(r.start.round());
    var b = step30(r.end.round());
    if (b < a) b = a;
    return RangeValues(a.toDouble(), b.toDouble());
  }

  Widget _filterSheetTitleRow(BuildContext sheetContext, String title) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Text(
            title,
            style: const TextStyle(
              fontSize: 30 / 1.6,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
        ),
        IconButton(
          padding: EdgeInsets.zero,
          visualDensity: VisualDensity.compact,
          onPressed: () => Navigator.of(sheetContext).pop(),
          icon: const Icon(Icons.close, color: AppColors.textSecondary),
        ),
      ],
    );
  }

  String _shortAreaFromAddress(String address) {
    final parts = address
        .split(',')
        .map((e) => e.trim())
        .where((e) => e.isNotEmpty)
        .toList();
    if (parts.isEmpty) return '';
    bool isPostalOnly(String value) =>
        RegExp(r'^[\d\-\s]+$').hasMatch(value.trim());

    final useful = parts.where((p) => !isPostalOnly(p)).toList();
    if (useful.isEmpty) return parts.first;
    if (useful.length >= 2) return '${useful[0]}, ${useful[1]}';
    return useful.first;
  }

  bool get _hasActiveTimeFilter {
    if (_timePeriods.isNotEmpty) return true;
    final startMin = _timeRange.start.round();
    final endMin = _timeRange.end.round();
    if (startMin != 0) return true;
    // Legacy full-day upper bound was 23:59 (1439); new slider uses 24:00 (1440).
    if (endMin < 1439) return true;
    return false;
  }

  String get _sortChipLabel {
    switch (_sortBy) {
      case 'ratings':
        return 'Sort: Ratings';
      case 'distance':
        return 'Sort: Distance';
      case 'recommended':
      default:
        return 'Sort by';
    }
  }

  String get _distanceChipLabel {
    switch (_distanceFilter) {
      case '5':
        return '5 km';
      case '10':
        return '10 km';
      case '15':
        return '15 km';
      case '30+':
        return '30+ km';
      case 'auto':
      default:
        return 'Distance';
    }
  }

  String get _timeChipLabel {
    if (!_hasActiveTimeFilter) return 'Time';
    return '${_formatMinutesLabel(_timeRange.start)} - ${_formatMinutesLabel(_timeRange.end)}';
  }

  String _distanceLabel(double? km) {
    if (km == null) return '';
    final text = km.toStringAsFixed(2).replaceAll('.', ',');
    return '$text km';
  }

  double? _resolvedDistanceKm(_ExploreStudioItem studio) {
    if (studio.distanceKm != null) return studio.distanceKm;
    if (_selectedLat == null || _selectedLon == null) return null;
    if (studio.lat == null || studio.lng == null) return null;
    const d = Distance();
    final meters = d.as(
      LengthUnit.Meter,
      LatLng(_selectedLat!, _selectedLon!),
      LatLng(studio.lat!, studio.lng!),
    );
    return meters / 1000.0;
  }

  bool _isClassInSelectedPeriods(DateTime startsAt) {
    if (_timePeriods.isEmpty) return true;
    final hour = startsAt.hour;
    final isAfternoon = hour >= 12 && hour < 17;
    final isEvening = hour >= 17 && hour < 21;
    final isNight = hour >= 21 || hour < 5;
    if (_timePeriods.contains('afternoon') && isAfternoon) return true;
    if (_timePeriods.contains('evening') && isEvening) return true;
    if (_timePeriods.contains('night') && isNight) return true;
    return false;
  }

  bool _isClassInTimeRange(DateTime startsAt) {
    final startMin = (startsAt.hour * 60) + startsAt.minute;
    final from = _timeRange.start.round();
    final to = _timeRange.end.round();
    return startMin >= from && startMin <= to;
  }

  bool _classMatchesCategory(_ExploreClassItem c) {
    if (_selectedCategoryId == null) return true;
    return c.trainingCategoryId == _selectedCategoryId;
  }

  TrainingCategoryOption? _categoryOptionById(int id) {
    for (final o in _trainingCategories) {
      if (o.id == id) return o;
    }
    return null;
  }

  bool _studioMatchesCategory(_ExploreStudioItem s) {
    final cid = _selectedCategoryId;
    if (cid == null) return true;
    if (s.trainingCategoryIds.contains(cid)) return true;
    final bySessions = _classes.any(
      (c) => c.studioId == s.id && c.trainingCategoryId == cid,
    );
    if (bySessions) return true;
    if (s.trainingCategoryIds.isEmpty && s.categoryNames.isEmpty) {
      return true;
    }
    final opt = _categoryOptionById(cid);
    if (opt == null || s.categoryNames.isEmpty) return true;
    final labels = {opt.nameEn, opt.nameRu, opt.nameVn}
        .map((e) => e.trim().toLowerCase())
        .where((e) => e.isNotEmpty)
        .toSet();
    return s.categoryNames.any(
      (n) => labels.contains(n.trim().toLowerCase()),
    );
  }

  String _categoryChipLabel(String localeCode) {
    final id = _selectedCategoryId;
    if (id == null) return 'Categories';
    final opt = _categoryOptionById(id);
    return opt?.label(localeCode) ?? 'Categories';
  }

  Future<void> _ensureTrainingCategoriesLoaded() async {
    if (_trainingCategories.isNotEmpty) return;
    try {
      final raw = await ApiClient.get('/trainings/categories', null);
      if (raw is! List || !mounted) return;
      final list = <TrainingCategoryOption>[];
      for (final row in raw) {
        if (row is! Map) continue;
        list.add(
          TrainingCategoryOption.fromJson(
            Map<String, dynamic>.from(row),
          ),
        );
      }
      setState(() => _trainingCategories = list);
    } catch (_) {}
  }

  Future<void> _openCategorySheet() async {
    await _ensureTrainingCategoriesLoaded();
    if (!mounted) return;
    final localeCode = context.read<LocaleProvider>().localeCode;
    var tempSelection = _selectedCategoryId ?? -1;

    final result = await showModalBottomSheet<int>(
      context: context,
      showDragHandle: false,
      isScrollControlled: true,
      backgroundColor: AppColors.backgroundPrimary,
      builder: (ctx) {
        final maxH = MediaQuery.of(context).size.height * 0.72;
        Widget rowTile({
          required String title,
          required bool selected,
          required VoidCallback onTap,
        }) {
          return InkWell(
            splashColor: Colors.transparent,
            highlightColor: Colors.transparent,
            hoverColor: Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            onTap: onTap,
            child: Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              decoration: BoxDecoration(
                color: AppColors.backgroundPrimary,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: selected
                      ? AppColors.primary500
                      : AppColors.borderPrimary,
                  width: selected ? 1.5 : 1,
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: TextStyle(
                        color: selected
                            ? AppColors.primary500
                            : AppColors.textPrimary,
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                      ),
                    ),
                  ),
                  if (selected)
                    const Icon(
                      Icons.check,
                      color: AppColors.primary500,
                      size: 22,
                    ),
                ],
              ),
            ),
          );
        }

        return StatefulBuilder(
          builder: (context, setModalState) {
            return Theme(
              data: Theme.of(context).copyWith(
                splashColor: Colors.transparent,
                highlightColor: Colors.transparent,
                bottomSheetTheme: const BottomSheetThemeData(
                  surfaceTintColor: Colors.transparent,
                ),
              ),
              child: SafeArea(
                child: SizedBox(
                  height: maxH,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _filterSheetTitleRow(ctx, 'Category'),
                        const SizedBox(height: 8),
                        Expanded(
                          child: ListView(
                            children: [
                              rowTile(
                                title: 'All categories',
                                selected: tempSelection < 0,
                                onTap: () =>
                                    setModalState(() => tempSelection = -1),
                              ),
                              ..._trainingCategories.map(
                                (cat) => rowTile(
                                  title: cat.label(localeCode),
                                  selected: tempSelection == cat.id,
                                  onTap: () => setModalState(
                                    () => tempSelection = cat.id,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        SizedBox(
                          width: double.infinity,
                          child: TextButton(
                            onPressed: () =>
                                setModalState(() => tempSelection = -1),
                            child: const Text(
                              'Reset',
                              style: TextStyle(
                                color: AppColors.textPrimary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 4),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton(
                            onPressed: () =>
                                Navigator.of(ctx).pop(tempSelection),
                            style: FilledButton.styleFrom(
                              backgroundColor: AppColors.primary500,
                            ),
                            child: const Text('Apply'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        );
      },
    );

    if (!mounted || result == null) return;
    setState(() {
      _selectedCategoryId = result < 0 ? null : result;
    });
  }

  Future<void> _openTimeFilterSheet() async {
    final tempPeriods = Set<String>.from(_timePeriods);
    RangeValues tempRange = _alignTimeRangeToSlider(_timeRange);
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      showDragHandle: false,
      backgroundColor: AppColors.backgroundPrimary,
      isScrollControlled: true,
      builder: (ctx) {
        Widget periodTile({
          required String id,
          required String label,
          required IconData icon,
          required StateSetter setModalState,
        }) {
          final selected = tempPeriods.contains(id);
          return Expanded(
            child: InkWell(
              splashColor: Colors.transparent,
              highlightColor: Colors.transparent,
              hoverColor: Colors.transparent,
              borderRadius: BorderRadius.circular(8),
              onTap: () {
                setModalState(() {
                  if (selected) {
                    tempPeriods.remove(id);
                  } else {
                    tempPeriods.add(id);
                  }
                });
              },
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 4),
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  color: AppColors.backgroundPrimary,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: selected
                        ? AppColors.primary500
                        : AppColors.borderPrimary,
                  ),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      icon,
                      color: selected
                          ? AppColors.primary500
                          : AppColors.textSecondary,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      label,
                      style: TextStyle(
                        color: selected
                            ? AppColors.primary500
                            : AppColors.textPrimary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }

        return StatefulBuilder(
          builder: (context, setModalState) {
            return Theme(
              data: Theme.of(context).copyWith(
                splashColor: Colors.transparent,
                highlightColor: Colors.transparent,
                bottomSheetTheme: const BottomSheetThemeData(
                  surfaceTintColor: Colors.transparent,
                ),
              ),
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _filterSheetTitleRow(ctx, 'Filter by time'),
                      const SizedBox(height: 14),
                      const Text(
                        'Activities by time period',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          periodTile(
                            id: 'afternoon',
                            label: 'Afternoon',
                            icon: Icons.wb_sunny_outlined,
                            setModalState: setModalState,
                          ),
                          periodTile(
                            id: 'evening',
                            label: 'Evening',
                            icon: Icons.nights_stay_outlined,
                            setModalState: setModalState,
                          ),
                          periodTile(
                            id: 'night',
                            label: 'Night',
                            icon: Icons.dark_mode_outlined,
                            setModalState: setModalState,
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      const Text(
                        'Activities by start time',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Align(
                        alignment: Alignment.centerRight,
                        child: Text(
                          '${_formatMinutesLabel(tempRange.start)} - ${_formatMinutesLabel(tempRange.end)}',
                          style: const TextStyle(
                            color: AppColors.primary500,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      RangeSlider(
                        values: tempRange,
                        min: 0,
                        max: 1440,
                        divisions: 48,
                        activeColor: AppColors.primary500,
                        inactiveColor: AppColors.borderPrimary,
                        onChanged: (values) =>
                            setModalState(() => tempRange = values),
                      ),
                      const SizedBox(height: 6),
                      SizedBox(
                        width: double.infinity,
                        child: TextButton(
                          onPressed: () {
                            setModalState(() {
                              tempPeriods.clear();
                              tempRange = const RangeValues(0, 1440);
                            });
                          },
                          child: const Text(
                            'Reset',
                            style: TextStyle(
                              color: AppColors.textPrimary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: () => Navigator.of(ctx).pop({
                            'periods': tempPeriods.toList(),
                            'start': tempRange.start,
                            'end': tempRange.end,
                          }),
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.primary500,
                          ),
                          child: const Text('Apply'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
    if (result == null || !mounted) return;
    final periodsRaw = result['periods'];
    final start = (result['start'] as num?)?.toDouble();
    final end = (result['end'] as num?)?.toDouble();
    if (periodsRaw is! List || start == null || end == null) return;
    setState(() {
      _timePeriods
        ..clear()
        ..addAll(periodsRaw.map((e) => e.toString()));
      _timeRange = RangeValues(start, end);
    });
  }

  void _applyStudioSortInPlace(List<_ExploreStudioItem> studios) {
    switch (_sortBy) {
      case 'ratings':
        studios.sort((a, b) {
          final byRating = b.rating.compareTo(a.rating);
          if (byRating != 0) return byRating;
          return b.reviewCount.compareTo(a.reviewCount);
        });
        break;
      case 'distance':
        studios.sort((a, b) {
          final ad = a.distanceKm ?? double.infinity;
          final bd = b.distanceKm ?? double.infinity;
          return ad.compareTo(bd);
        });
        break;
      case 'recommended':
      default:
        studios.sort((a, b) {
          final aScore = (a.rating * 10) + (a.reviewCount * 0.02);
          final bScore = (b.rating * 10) + (b.reviewCount * 0.02);
          final byScore = bScore.compareTo(aScore);
          if (byScore != 0) return byScore;
          final ad = a.distanceKm ?? double.infinity;
          final bd = b.distanceKm ?? double.infinity;
          return ad.compareTo(bd);
        });
    }
  }

  Future<void> _openSortSheet() async {
    String temp = _sortBy;
    final result = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: false,
      backgroundColor: AppColors.backgroundPrimary,
      builder: (ctx) {
        Widget option({
          required String value,
          required String title,
          String? subtitle,
          required StateSetter setModalState,
        }) {
          final selected = temp == value;
          return InkWell(
            splashColor: Colors.transparent,
            highlightColor: Colors.transparent,
            hoverColor: Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            onTap: () => setModalState(() => temp = value),
            child: Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              decoration: BoxDecoration(
                color: AppColors.backgroundPrimary,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: selected
                      ? AppColors.primary500
                      : AppColors.borderPrimary,
                  width: selected ? 1.5 : 1,
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: TextStyle(
                            color: selected
                                ? AppColors.primary500
                                : AppColors.textPrimary,
                            fontWeight: FontWeight.w700,
                            fontSize: 15,
                          ),
                        ),
                        if (subtitle != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            subtitle,
                            style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  Radio<String>(
                    value: value,
                    groupValue: temp,
                    activeColor: AppColors.primary500,
                    onChanged: (v) {
                      if (v == null) return;
                      setModalState(() => temp = v);
                    },
                  ),
                ],
              ),
            ),
          );
        }

        return StatefulBuilder(
          builder: (context, setModalState) {
            return Theme(
              data: Theme.of(context).copyWith(
                splashColor: Colors.transparent,
                highlightColor: Colors.transparent,
                bottomSheetTheme: const BottomSheetThemeData(
                  surfaceTintColor: Colors.transparent,
                ),
              ),
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _filterSheetTitleRow(ctx, 'Sort by'),
                      const SizedBox(height: 12),
                      option(
                        value: 'recommended',
                        title: 'Recommended for you',
                        subtitle: 'Default',
                        setModalState: setModalState,
                      ),
                      option(
                        value: 'ratings',
                        title: 'Ratings',
                        subtitle: 'highest to lowest',
                        setModalState: setModalState,
                      ),
                      option(
                        value: 'distance',
                        title: 'Distance',
                        subtitle: 'nearest to farthest',
                        setModalState: setModalState,
                      ),
                      const SizedBox(height: 2),
                      SizedBox(
                        width: double.infinity,
                        child: TextButton(
                          onPressed: () =>
                              setModalState(() => temp = 'recommended'),
                          child: const Text(
                            'Reset',
                            style: TextStyle(
                              color: AppColors.textPrimary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: () => Navigator.of(ctx).pop(temp),
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.primary500,
                          ),
                          child: const Text('Apply'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );

    if (result == null || !mounted) return;
    setState(() {
      _sortBy = result;
      final sorted = List<_ExploreStudioItem>.from(_studios);
      _applyStudioSortInPlace(sorted);
      _studios = sorted;
    });
  }

  Future<void> _openAllFiltersSheet() async {
    String tempSort = _sortBy;
    String tempDistance = _distanceFilter;
    final tempPeriods = Set<String>.from(_timePeriods);
    RangeValues tempRange = _alignTimeRangeToSlider(_timeRange);

    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      showDragHandle: false,
      isScrollControlled: true,
      backgroundColor: AppColors.backgroundPrimary,
      builder: (ctx) {
        Widget sectionTitle(String text) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              text,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w700,
              ),
            ),
          );
        }

        Widget radioBox({
          required String title,
          String? subtitle,
          required bool selected,
          required VoidCallback onTap,
        }) {
          return InkWell(
            splashColor: Colors.transparent,
            highlightColor: Colors.transparent,
            hoverColor: Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            onTap: onTap,
            child: Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: selected
                      ? AppColors.primary500
                      : AppColors.borderPrimary,
                  width: selected ? 1.5 : 1,
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: TextStyle(
                            color: selected
                                ? AppColors.primary500
                                : AppColors.textPrimary,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        if (subtitle != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            subtitle,
                            style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  Icon(
                    selected
                        ? Icons.radio_button_checked
                        : Icons.radio_button_off,
                    color: selected
                        ? AppColors.primary500
                        : AppColors.textSecondary,
                  ),
                ],
              ),
            ),
          );
        }

        Widget periodTile({
          required String id,
          required String label,
          required IconData icon,
          required bool selected,
          required VoidCallback onTap,
        }) {
          return Expanded(
            child: InkWell(
              splashColor: Colors.transparent,
              highlightColor: Colors.transparent,
              hoverColor: Colors.transparent,
              borderRadius: BorderRadius.circular(8),
              onTap: onTap,
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 4),
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: selected
                        ? AppColors.primary500
                        : AppColors.borderPrimary,
                  ),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      icon,
                      color: selected
                          ? AppColors.primary500
                          : AppColors.textSecondary,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      label,
                      style: TextStyle(
                        color: selected
                            ? AppColors.primary500
                            : AppColors.textPrimary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }

        return StatefulBuilder(
          builder: (context, setModalState) {
            return Theme(
              data: Theme.of(context).copyWith(
                splashColor: Colors.transparent,
                highlightColor: Colors.transparent,
                bottomSheetTheme: const BottomSheetThemeData(
                  surfaceTintColor: Colors.transparent,
                ),
              ),
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _filterSheetTitleRow(ctx, 'Filters'),
                        const SizedBox(height: 14),
                        sectionTitle('Sort by'),
                        radioBox(
                          title: 'Recommended for you',
                          subtitle: 'Default',
                          selected: tempSort == 'recommended',
                          onTap: () =>
                              setModalState(() => tempSort = 'recommended'),
                        ),
                        radioBox(
                          title: 'Ratings',
                          subtitle: 'highest to lowest',
                          selected: tempSort == 'ratings',
                          onTap: () =>
                              setModalState(() => tempSort = 'ratings'),
                        ),
                        radioBox(
                          title: 'Distance',
                          subtitle: 'nearest to farthest',
                          selected: tempSort == 'distance',
                          onTap: () =>
                              setModalState(() => tempSort = 'distance'),
                        ),
                        const SizedBox(height: 6),
                        sectionTitle('Distance from your location'),
                        radioBox(
                          title: 'Auto (20km)',
                          selected: tempDistance == 'auto',
                          onTap: () =>
                              setModalState(() => tempDistance = 'auto'),
                        ),
                        radioBox(
                          title: '5 km',
                          selected: tempDistance == '5',
                          onTap: () => setModalState(() => tempDistance = '5'),
                        ),
                        radioBox(
                          title: '10 km',
                          selected: tempDistance == '10',
                          onTap: () => setModalState(() => tempDistance = '10'),
                        ),
                        radioBox(
                          title: '15 km',
                          selected: tempDistance == '15',
                          onTap: () => setModalState(() => tempDistance = '15'),
                        ),
                        radioBox(
                          title: '30+ km',
                          selected: tempDistance == '30+',
                          onTap: () =>
                              setModalState(() => tempDistance = '30+'),
                        ),
                        const SizedBox(height: 6),
                        sectionTitle('Activities by time period'),
                        Row(
                          children: [
                            periodTile(
                              id: 'afternoon',
                              label: 'Afternoon',
                              icon: Icons.wb_sunny_outlined,
                              selected: tempPeriods.contains('afternoon'),
                              onTap: () {
                                setModalState(() {
                                  if (tempPeriods.contains('afternoon')) {
                                    tempPeriods.remove('afternoon');
                                  } else {
                                    tempPeriods.add('afternoon');
                                  }
                                });
                              },
                            ),
                            periodTile(
                              id: 'evening',
                              label: 'Evening',
                              icon: Icons.nights_stay_outlined,
                              selected: tempPeriods.contains('evening'),
                              onTap: () {
                                setModalState(() {
                                  if (tempPeriods.contains('evening')) {
                                    tempPeriods.remove('evening');
                                  } else {
                                    tempPeriods.add('evening');
                                  }
                                });
                              },
                            ),
                            periodTile(
                              id: 'night',
                              label: 'Night',
                              icon: Icons.dark_mode_outlined,
                              selected: tempPeriods.contains('night'),
                              onTap: () {
                                setModalState(() {
                                  if (tempPeriods.contains('night')) {
                                    tempPeriods.remove('night');
                                  } else {
                                    tempPeriods.add('night');
                                  }
                                });
                              },
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        sectionTitle('Activities by start time'),
                        Align(
                          alignment: Alignment.centerRight,
                          child: Text(
                            '${_formatMinutesLabel(tempRange.start)} - ${_formatMinutesLabel(tempRange.end)}',
                            style: const TextStyle(
                              color: AppColors.primary500,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        RangeSlider(
                          values: tempRange,
                          min: 0,
                          max: 1440,
                          divisions: 48,
                          activeColor: AppColors.primary500,
                          inactiveColor: AppColors.borderPrimary,
                          onChanged: (values) =>
                              setModalState(() => tempRange = values),
                        ),
                        const SizedBox(height: 6),
                        SizedBox(
                          width: double.infinity,
                          child: TextButton(
                            onPressed: () {
                              setModalState(() {
                                tempSort = 'recommended';
                                tempDistance = 'auto';
                                tempPeriods.clear();
                                tempRange = const RangeValues(0, 1440);
                              });
                            },
                            child: const Text(
                              'Reset',
                              style: TextStyle(
                                color: AppColors.textPrimary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton(
                            onPressed: () => Navigator.of(ctx).pop({
                              'sort': tempSort,
                              'distance': tempDistance,
                              'periods': tempPeriods.toList(),
                              'start': tempRange.start,
                              'end': tempRange.end,
                            }),
                            style: FilledButton.styleFrom(
                              backgroundColor: AppColors.primary500,
                            ),
                            child: const Text('Apply'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        );
      },
    );

    if (result == null || !mounted) return;
    final sort = (result['sort'] ?? '').toString();
    final distance = (result['distance'] ?? '').toString();
    final periods = result['periods'];
    final start = (result['start'] as num?)?.toDouble();
    final end = (result['end'] as num?)?.toDouble();
    if (sort.isEmpty ||
        distance.isEmpty ||
        periods is! List ||
        start == null ||
        end == null) {
      return;
    }

    final distanceChanged = distance != _distanceFilter;
    setState(() {
      _sortBy = sort;
      _distanceFilter = distance;
      _timePeriods
        ..clear()
        ..addAll(periods.map((e) => e.toString()));
      _timeRange = RangeValues(start, end);
      if (!distanceChanged) {
        final sorted = List<_ExploreStudioItem>.from(_studios);
        _applyStudioSortInPlace(sorted);
        _studios = sorted;
      }
    });
    if (distanceChanged) {
      await _loadExplore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final localeCode = context.watch<LocaleProvider>().localeCode;
    final selectedDate = DateTime.now().add(Duration(days: _selectedDayOffset));
    final dayClasses = _classes.where((c) {
      final d = c.startsAt;
      return d.year == selectedDate.year &&
          d.month == selectedDate.month &&
          d.day == selectedDate.day &&
          _isClassInSelectedPeriods(c.startsAt) &&
          _isClassInTimeRange(c.startsAt) &&
          _classMatchesCategory(c);
    }).toList();

    final visibleStudios = _studios.where(_studioMatchesCategory).toList();

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(12, 10, 12, 8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.backgroundPrimary,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.borderPrimary),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.arrow_back,
                            color: AppColors.textPrimary,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _locationLabel,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Row(
                      children: [
                        Expanded(
                          child: Container(
                            decoration: BoxDecoration(
                              color: AppColors.backgroundPrimary,
                              borderRadius: BorderRadius.circular(999),
                              border: Border.all(
                                color: AppColors.borderPrimary,
                              ),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: _segButton(
                                    label: 'Businesses',
                                    selected: !_showClasses,
                                    onTap: () =>
                                        setState(() => _showClasses = false),
                                  ),
                                ),
                                Expanded(
                                  child: _segButton(
                                    label: 'Classes',
                                    selected: _showClasses,
                                    onTap: () =>
                                        setState(() => _showClasses = true),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: AppColors.backgroundPrimary,
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(color: AppColors.borderPrimary),
                          ),
                          child: Material(
                            color: Colors.transparent,
                            child: InkWell(
                              borderRadius: BorderRadius.circular(999),
                              onTap: _openAllFiltersSheet,
                              child: const Icon(
                                Icons.tune,
                                size: 20,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    height: 40,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      children: [
                        _FilterChip(
                          label: _sortChipLabel,
                          onTap: _openSortSheet,
                        ),
                        _FilterChip(
                          label: _categoryChipLabel(localeCode),
                          onTap: _openCategorySheet,
                        ),
                        _FilterChip(
                          label: _distanceChipLabel,
                          onTap: _openAllFiltersSheet,
                        ),
                        _FilterChip(
                          label: _timeChipLabel,
                          onTap: _openTimeFilterSheet,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 40,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      itemCount: 7,
                      itemBuilder: (_, i) {
                        final selected = i == _selectedDayOffset;
                        return GestureDetector(
                          onTap: () => setState(() => _selectedDayOffset = i),
                          child: Container(
                            margin: const EdgeInsets.only(right: 18),
                            padding: const EdgeInsets.only(bottom: 6),
                            decoration: BoxDecoration(
                              border: Border(
                                bottom: BorderSide(
                                  color: selected
                                      ? AppColors.primary500
                                      : Colors.transparent,
                                  width: 3,
                                ),
                              ),
                            ),
                            child: Text(
                              _dayLabel(i),
                              style: TextStyle(
                                fontSize: 28 / 1.6,
                                fontWeight: selected
                                    ? FontWeight.w800
                                    : FontWeight.w500,
                                color: selected
                                    ? AppColors.primary500
                                    : AppColors.textPrimary,
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const Divider(height: 1, color: AppColors.borderPrimary),
                  Expanded(
                    child: _showClasses
                        ? ListView.separated(
                            itemCount: dayClasses.length,
                            separatorBuilder: (_, __) => const Divider(
                              height: 1,
                              color: AppColors.borderPrimary,
                            ),
                            itemBuilder: (_, index) {
                              final c = dayClasses[index];
                              return ClassScheduleCard(
                                timeLabel: _formatTime24(c.startsAt),
                                durationMin: c.durationMin,
                                className: c.className,
                                trainerName: c.trainerName,
                                trainingColor: parseHexColor(c.displayColorHex),
                                priceLabel: c.price != null
                                    ? _formatVnd(c.price!)
                                    : null,
                                bookedCount: c.bookedCount,
                                capacity: c.capacity,
                                onBook: () {},
                              );
                            },
                          )
                        : ListView.separated(
                            itemCount: visibleStudios.length,
                            separatorBuilder: (_, __) => const Divider(
                              height: 1,
                              color: AppColors.borderPrimary,
                            ),
                            itemBuilder: (_, index) {
                              final s = visibleStudios[index];
                              final todayClassForStudio =
                                  _classes
                                      .where(
                                        (c) =>
                                            c.studioId == s.id &&
                                            c.startsAt.year ==
                                                selectedDate.year &&
                                            c.startsAt.month ==
                                                selectedDate.month &&
                                            c.startsAt.day ==
                                                selectedDate.day &&
                                            _isClassInSelectedPeriods(
                                              c.startsAt,
                                            ) &&
                                            _isClassInTimeRange(c.startsAt) &&
                                            _classMatchesCategory(c),
                                      )
                                      .toList()
                                    ..sort(
                                      (a, b) =>
                                          a.startsAt.compareTo(b.startsAt),
                                    );
                              final firstToday = todayClassForStudio.isNotEmpty
                                  ? todayClassForStudio.first
                                  : null;
                              final area = _shortAreaFromAddress(s.address);
                              final distanceText = _distanceLabel(
                                _resolvedDistanceKm(s),
                              );
                              final subtitleText = [
                                if (distanceText.isNotEmpty) distanceText,
                                if (area.isNotEmpty) area,
                              ].join(' - ');
                              return Material(
                                color: AppColors.backgroundPrimary,
                                child: InkWell(
                                  onTap: () {
                                    Navigator.of(context).push(
                                      MaterialPageRoute(
                                        builder: (_) =>
                                            PublicStudioDetailScreen(
                                              studioId: s.id,
                                            ),
                                      ),
                                    );
                                  },
                                  child: Padding(
                                    padding: const EdgeInsets.fromLTRB(
                                      12,
                                      14,
                                      12,
                                      14,
                                    ),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment:
                                                    CrossAxisAlignment.start,
                                                children: [
                                                  Text(
                                                    s.name,
                                                    style: const TextStyle(
                                                      fontWeight:
                                                          FontWeight.w800,
                                                      fontSize: 22 / 1.2,
                                                    ),
                                                  ),
                                                  const SizedBox(height: 3),
                                                  if (subtitleText.isNotEmpty)
                                                    Text(
                                                      subtitleText,
                                                      style: const TextStyle(
                                                        color: AppColors
                                                            .textSecondary,
                                                      ),
                                                    ),
                                                  const SizedBox(height: 8),
                                                  if (s.rating > 0)
                                                    Row(
                                                      children: [
                                                        const Icon(
                                                          Icons.star,
                                                          color: Color(
                                                            0xFFF7C948,
                                                          ),
                                                          size: 16,
                                                        ),
                                                        const SizedBox(
                                                          width: 4,
                                                        ),
                                                        Text(
                                                          '${s.rating.toStringAsFixed(1)}  ${s.reviewCount} reviews',
                                                          style: const TextStyle(
                                                            color: AppColors
                                                                .textSecondary,
                                                          ),
                                                        ),
                                                      ],
                                                    ),
                                                ],
                                              ),
                                            ),
                                            if ((s.logoUrl ?? '')
                                                .isNotEmpty) ...[
                                              const SizedBox(width: 10),
                                              ClipRRect(
                                                borderRadius:
                                                    BorderRadius.circular(8),
                                                child: CachedSalonNetworkImage(
                                                  imageUrl: s.logoUrl!,
                                                  width: 64,
                                                  height: 64,
                                                  fit: BoxFit.contain,
                                                ),
                                              ),
                                            ],
                                          ],
                                        ),
                                        const SizedBox(height: 10),
                                        const Divider(
                                          height: 1,
                                          thickness: 1,
                                          color: AppColors.borderPrimary,
                                        ),
                                        const SizedBox(height: 10),
                                        if (firstToday == null)
                                          const Center(
                                            child: Text(
                                              'No classes today, try adjusting the filters.',
                                              style: TextStyle(
                                                color: AppColors.textSecondary,
                                              ),
                                            ),
                                          )
                                        else
                                          Row(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Expanded(
                                                child: Column(
                                                  crossAxisAlignment:
                                                      CrossAxisAlignment.start,
                                                  children: [
                                                    Text(
                                                      firstToday.className,
                                                      maxLines: 1,
                                                      overflow:
                                                          TextOverflow.ellipsis,
                                                      style: const TextStyle(
                                                        fontSize: 18 / 1.2,
                                                        fontWeight:
                                                            FontWeight.w700,
                                                        color: AppColors
                                                            .textPrimary,
                                                      ),
                                                    ),
                                                    const SizedBox(height: 8),
                                                    Container(
                                                      padding:
                                                          const EdgeInsets.symmetric(
                                                            horizontal: 10,
                                                            vertical: 6,
                                                          ),
                                                      decoration: BoxDecoration(
                                                        color: AppColors
                                                            .backgroundSecondary,
                                                        borderRadius:
                                                            BorderRadius.circular(
                                                              8,
                                                            ),
                                                        border: Border.all(
                                                          color: AppColors
                                                              .borderPrimary,
                                                        ),
                                                      ),
                                                      child: Text(
                                                        _formatTime24(
                                                          firstToday.startsAt,
                                                        ),
                                                        style: const TextStyle(
                                                          fontWeight:
                                                              FontWeight.w600,
                                                          color: AppColors
                                                              .textPrimary,
                                                        ),
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                              if (firstToday.price != null)
                                                Text(
                                                  _formatVnd(firstToday.price!),
                                                  style: const TextStyle(
                                                    fontWeight: FontWeight.w800,
                                                    color: AppColors.primary500,
                                                    fontSize: 26 / 1.6,
                                                  ),
                                                ),
                                            ],
                                          ),
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _segButton({
    required String label,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.all(3),
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary50 : Colors.transparent,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: selected ? AppColors.primary500 : Colors.transparent,
          ),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            color: selected ? AppColors.primary500 : AppColors.textPrimary,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({required this.label, this.onTap});
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      splashColor: Colors.transparent,
      highlightColor: Colors.transparent,
      hoverColor: Colors.transparent,
      borderRadius: BorderRadius.circular(999),
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: AppColors.backgroundPrimary,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: AppColors.borderPrimary),
        ),
        child: Row(
          children: [
            Text(
              label,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(width: 6),
            const Icon(
              Icons.keyboard_arrow_down,
              size: 16,
              color: AppColors.textSecondary,
            ),
          ],
        ),
      ),
    );
  }
}

class _ExploreStudioItem {
  const _ExploreStudioItem({
    required this.id,
    required this.name,
    required this.address,
    required this.distanceKm,
    required this.rating,
    required this.reviewCount,
    required this.logoUrl,
    required this.lat,
    required this.lng,
    this.trainingCategoryIds = const [],
    this.categoryNames = const [],
  });
  final String id;
  final String name;
  final String address;
  final double? distanceKm;
  final double rating;
  final int reviewCount;
  final String? logoUrl;
  final double? lat;
  final double? lng;
  final List<int> trainingCategoryIds;
  final List<String> categoryNames;
}

class _ExploreClassItem {
  const _ExploreClassItem({
    required this.sessionId,
    required this.studioId,
    required this.studioName,
    required this.studioAddress,
    required this.startsAt,
    required this.durationMin,
    required this.trainerName,
    required this.className,
    required this.price,
    required this.capacity,
    required this.bookedCount,
    this.displayColorHex,
    required this.rating,
    required this.reviewCount,
    this.trainingCategoryId,
  });
  final String sessionId;
  final String studioId;
  final String studioName;
  final String studioAddress;
  final DateTime startsAt;
  final int? durationMin;
  final String trainerName;
  final String className;
  final double? price;
  final int? capacity;
  final int bookedCount;
  final String? displayColorHex;
  final double rating;
  final int reviewCount;
  final int? trainingCategoryId;
}

class _ClientFavoritesScreen extends StatefulWidget {
  const _ClientFavoritesScreen();

  @override
  State<_ClientFavoritesScreen> createState() => _ClientFavoritesScreenState();
}

class _ClientFavoritesScreenState extends State<_ClientFavoritesScreen> {
  final Set<String> _removingIds = <String>{};

  static const double _favoriteLogoSize = 60;

  String? _studioLogoUrl(Map<String, dynamic> studio) {
    final raw =
        studio['logoUrl'] ??
        studio['logo'] ??
        studio['brandLogoUrl'] ??
        studio['avatarUrl'];
    if (raw != null) {
      final s = raw.toString().trim();
      if (s.isNotEmpty) return s;
    }
    final photos = studio['photos'];
    if (photos is List && photos.isNotEmpty) {
      final first = photos.first;
      if (first != null) {
        final s = first.toString().trim();
        if (s.isNotEmpty) return s;
      }
    }
    return null;
  }

  Future<void> _removeFavorite(String studioId) async {
    final token = context.read<AuthService>().accessToken;
    final favStore = context.read<ClientFavoritesStore>();
    if (token == null || token.isEmpty || _removingIds.contains(studioId)) {
      return;
    }
    setState(() => _removingIds.add(studioId));
    favStore.removeLocal(studioId);
    try {
      await ApiClient.delete('/auth/favorites/$studioId', token);
      HapticFeedback.lightImpact();
      if (mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            const SnackBar(content: Text('Removed from favorites')),
          );
      }
    } catch (_) {
      if (mounted) {
        await favStore.sync(token, force: true);
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(const SnackBar(content: Text('Could not remove')));
      }
    } finally {
      if (mounted) setState(() => _removingIds.remove(studioId));
    }
  }

  Future<void> _refreshFavorites() async {
    final token = context.read<AuthService>().accessToken;
    await context.read<ClientFavoritesStore>().sync(token, force: true);
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.read<ClientFavoritesStore>().sync(
            context.read<AuthService>().accessToken,
            force: true,
          );
    });
  }

  @override
  Widget build(BuildContext context) {
    final token = context.watch<AuthService>().accessToken;
    final favStore = context.watch<ClientFavoritesStore>();
    final favorites = favStore.favorites;
    final showInitialSpinner = token != null &&
        token.isNotEmpty &&
        (!favStore.hasCompletedSync ||
            (favStore.isLoading && favorites.isEmpty));

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 10, 16, 6),
              child: Text(
                'Favorites',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
            ),
            Expanded(
              child: showInitialSpinner
                  ? const Center(child: CircularProgressIndicator())
                  : favorites.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Text(
                            'Пора найти ваше любимое место',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            'Соберите студии в избранное, чтобы бронировать быстрее.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 14,
                              color: AppColors.textSecondary,
                            ),
                          ),
                          const SizedBox(height: 20),
                          FilledButton(
                            onPressed: () {
                              final shellState = context
                                  .findAncestorStateOfType<_ClientShellState>();
                              shellState?.goToExploreTab();
                            },
                            style: FilledButton.styleFrom(
                              backgroundColor: AppColors.primary500,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                            ),
                            child: const Text('Explore'),
                          ),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _refreshFavorites,
                      child: ListView.separated(
                        padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
                        itemCount: favorites.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (_, index) {
                          final studio = favorites[index];
                          final id = (studio['id'] ?? '').toString();
                          final name = (studio['name'] ?? 'Studio').toString();
                          final address = (studio['address'] ?? '').toString();
                          final logoUrl = _studioLogoUrl(studio);
                          final reviews = studio['Review'];
                          final reviewCount = reviews is List
                              ? reviews.length
                              : 0;
                          final avgRating = reviewCount > 0
                              ? (reviews as List)
                                        .whereType<Map>()
                                        .map(
                                          (r) =>
                                              (r['rating'] as num?)
                                                  ?.toDouble() ??
                                              0,
                                        )
                                        .fold<double>(0, (a, b) => a + b) /
                                    reviewCount
                              : 0.0;
                          final removing = _removingIds.contains(id);
                          return Material(
                            color: AppColors.backgroundPrimary,
                            borderRadius: BorderRadius.circular(12),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(12),
                              onTap: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) =>
                                        PublicStudioDetailScreen(studioId: id),
                                  ),
                                );
                              },
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: AppColors.borderPrimary,
                                  ),
                                ),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    ClipRRect(
                                      borderRadius: BorderRadius.circular(10),
                                      child: logoUrl != null
                                          ? CachedSalonNetworkImage(
                                              imageUrl: logoUrl,
                                              width: _favoriteLogoSize,
                                              height: _favoriteLogoSize,
                                              fit: BoxFit.cover,
                                            )
                                          : Container(
                                              width: _favoriteLogoSize,
                                              height: _favoriteLogoSize,
                                              decoration: BoxDecoration(
                                                color: AppColors.secondary100,
                                                borderRadius:
                                                    BorderRadius.circular(10),
                                              ),
                                              alignment: Alignment.center,
                                              child: const Icon(
                                                Icons.fitness_center,
                                                color: AppColors.primary500,
                                              ),
                                            ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            name,
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w800,
                                              fontSize: 18,
                                              height: 1.2,
                                              color: AppColors.textPrimary,
                                            ),
                                          ),
                                          if (address.isNotEmpty) ...[
                                            const SizedBox(height: 4),
                                            Text(
                                              address,
                                              maxLines: 2,
                                              overflow: TextOverflow.ellipsis,
                                              style: const TextStyle(
                                                color: AppColors.textSecondary,
                                                fontSize: 13,
                                              ),
                                            ),
                                          ],
                                          if (avgRating > 0) ...[
                                            const SizedBox(height: 4),
                                            Text(
                                              '★ ${avgRating.toStringAsFixed(1)}',
                                              style: const TextStyle(
                                                color: AppColors.textSecondary,
                                                fontSize: 12,
                                              ),
                                            ),
                                          ],
                                        ],
                                      ),
                                    ),
                                    Padding(
                                      padding: const EdgeInsets.only(top: 0),
                                      child: removing
                                          ? const SizedBox(
                                              width: 40,
                                              height: 40,
                                              child: Center(
                                                child: SizedBox(
                                                  width: 20,
                                                  height: 20,
                                                  child:
                                                      CircularProgressIndicator(
                                                        strokeWidth: 2,
                                                      ),
                                                ),
                                              ),
                                            )
                                          : IconButton(
                                              padding: EdgeInsets.zero,
                                              visualDensity:
                                                  VisualDensity.compact,
                                              constraints: const BoxConstraints(
                                                minWidth: 40,
                                                minHeight: 40,
                                              ),
                                              onPressed: () =>
                                                  _removeFavorite(id),
                                              icon: const Icon(
                                                Icons.favorite,
                                                color: AppColors.primary500,
                                                size: 26,
                                              ),
                                            ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ClientProfileScreen extends StatefulWidget {
  const _ClientProfileScreen();

  @override
  State<_ClientProfileScreen> createState() => _ClientProfileScreenState();
}

class _ClientProfileScreenState extends State<_ClientProfileScreen>
    with AutomaticKeepAliveClientMixin {
  static const Duration _statsCacheTtl = Duration(minutes: 2);
  static int? _cachedClassesVisited;
  static DateTime? _statsCachedAt;

  int _classesVisited = 0;
  bool _loadingStats = true;

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  @override
  bool get wantKeepAlive => true;

  Future<void> _loadStats({bool force = false}) async {
    if (!force &&
        _cachedClassesVisited != null &&
        _statsCachedAt != null &&
        DateTime.now().difference(_statsCachedAt!) < _statsCacheTtl) {
      if (mounted) {
        setState(() {
          _classesVisited = _cachedClassesVisited!;
          _loadingStats = false;
        });
      }
      return;
    }
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) {
      if (!mounted) return;
      setState(() {
        _classesVisited = 0;
        _loadingStats = false;
      });
      return;
    }
    if (mounted) setState(() => _loadingStats = true);
    try {
      final raw = await ApiClient.get('/fitness/client/profile-stats', token);
      final map = raw is Map<String, dynamic>
          ? raw
          : (raw is Map ? Map<String, dynamic>.from(raw) : <String, dynamic>{});
      if (!mounted) return;
      setState(() {
        _classesVisited = (map['classesVisited'] as num?)?.toInt() ?? 0;
        _loadingStats = false;
      });
      _cachedClassesVisited = _classesVisited;
      _statsCachedAt = DateTime.now();
    } catch (_) {
      if (!mounted) return;
      setState(() => _loadingStats = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final auth = context.watch<AuthService>();
    final user = auth.user;
    final displayName = user?.name?.trim().isNotEmpty == true
        ? user!.name!.trim()
        : 'Client';
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: SafeArea(
        child: DefaultTabController(
          length: 2,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 8, 8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            displayName,
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _loadingStats
                                ? 'Loading classes visited...'
                                : '$_classesVisited classes visited',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      tooltip: 'Profile settings',
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) =>
                                const _ClientProfileSettingsScreen(),
                          ),
                        );
                      },
                      icon: const Icon(
                        Icons.settings_outlined,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 12),
                child: TabBar(
                  labelColor: AppColors.primary500,
                  unselectedLabelColor: AppColors.textSecondary,
                  indicatorColor: AppColors.primary500,
                  indicatorSize: TabBarIndicatorSize.tab,
                  dividerColor: AppColors.borderPrimary,
                  tabs: [
                    Tab(text: 'Schedule'),
                    Tab(text: 'Passes'),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Expanded(
                child: TabBarView(
                  children: [
                    const _ClientScheduleTab(),
                    const _ClientPassesTab(),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ClientScheduleTab extends StatefulWidget {
  const _ClientScheduleTab();

  @override
  State<_ClientScheduleTab> createState() => _ClientScheduleTabState();
}

class _ClientScheduleTabState extends State<_ClientScheduleTab>
    with AutomaticKeepAliveClientMixin {
  static const Duration _cacheTtl = Duration(minutes: 2);
  static List<Map<String, dynamic>>? _cachedItems;
  static DateTime? _cachedAt;

  bool _loading = true;
  List<Map<String, dynamic>> _items = const [];
  String? _error;
  final Set<String> _cancelingBookingIds = <String>{};

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  bool get wantKeepAlive => true;

  Future<void> _load({bool force = false}) async {
    if (!force &&
        _cachedItems != null &&
        _cachedAt != null &&
        DateTime.now().difference(_cachedAt!) < _cacheTtl) {
      if (!mounted) return;
      setState(() {
        _items = List<Map<String, dynamic>>.from(_cachedItems!);
        _loading = false;
        _error = null;
      });
      return;
    }
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) {
      if (!mounted) return;
      setState(() {
        _items = const [];
        _loading = false;
      });
      return;
    }
    if (mounted) setState(() => _loading = true);
    try {
      final now = DateTime.now();
      final from = Uri.encodeComponent(now.toUtc().toIso8601String());
      final to = Uri.encodeComponent(
        now.add(const Duration(days: 120)).toUtc().toIso8601String(),
      );
      final raw = await ApiClient.get(
        '/fitness/client/schedule?from=$from&to=$to',
        token,
      );
      final list = raw is List
          ? raw
          : (raw is Map<String, dynamic> && raw['data'] is List
                ? raw['data'] as List
                : <dynamic>[]);
      final parsed = <Map<String, dynamic>>[];
      for (final item in list) {
        if (item is Map) parsed.add(Map<String, dynamic>.from(item));
      }
      if (!mounted) return;
      setState(() {
        _items = parsed;
        _loading = false;
        _error = null;
      });
      _cachedItems = List<Map<String, dynamic>>.from(parsed);
      _cachedAt = DateTime.now();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _items = const [];
        _loading = false;
        _error = e.toString();
      });
    }
  }

  String _formatVnd(num value) {
    final digits = value.round().toString();
    final out = StringBuffer();
    for (int i = 0; i < digits.length; i++) {
      out.write(digits[i]);
      final left = digits.length - i - 1;
      if (left > 0 && left % 3 == 0) out.write('.');
    }
    return out.toString();
  }

  String _timeLabel(DateTime? dt) {
    if (dt == null) return '--:--';
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }

  String? _bookingId(Map<String, dynamic> item) {
    final bookingId = item['bookingId']?.toString().trim();
    if (bookingId != null && bookingId.isNotEmpty) return bookingId;
    final id = item['id']?.toString().trim();
    if (id != null && id.isNotEmpty) return id;
    return null;
  }

  bool _canCancelBooking(Map<String, dynamic> item) {
    final startsAt = DateTime.tryParse(
      (item['startsAt'] ?? '').toString(),
    )?.toLocal();
    if (startsAt == null || !startsAt.isAfter(DateTime.now())) return false;
    final status = (item['bookingStatus'] ?? item['status'] ?? '')
        .toString()
        .toUpperCase();
    if (status == 'CANCELLED' || status == 'COMPLETED') return false;
    return _bookingId(item) != null;
  }

  Future<void> _cancelBooking(Map<String, dynamic> item) async {
    final token = context.read<AuthService>().accessToken;
    final bookingId = _bookingId(item);
    if (token == null || token.isEmpty || bookingId == null) return;
    if (_cancelingBookingIds.contains(bookingId)) return;
    setState(() => _cancelingBookingIds.add(bookingId));
    try {
      await ApiClient.put('/bookings/$bookingId/cancel', token);
      _cachedItems = null;
      _cachedAt = null;
      if (!mounted) return;
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        const SnackBar(content: Text('Booking cancelled')),
      );
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(content: Text('Failed to cancel booking: $e')),
      );
    } finally {
      if (mounted) setState(() => _cancelingBookingIds.remove(bookingId));
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _ClientPlaceholderCard(
            title: 'Failed to load schedule',
            subtitle: _error!,
          ),
        ],
      );
    }
    if (_items.isEmpty) {
      return ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          _ClientPlaceholderCard(
            title: 'No classes scheduled yet',
            subtitle: 'Your upcoming bookings will appear here.',
          ),
        ],
      );
    }
    return RefreshIndicator(
      onRefresh: () => _load(force: true),
      child: ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: _items.length,
        separatorBuilder: (_, __) =>
            const Divider(height: 1, color: AppColors.borderPrimary),
        itemBuilder: (_, index) {
          final item = _items[index];
          final training = item['training'] is Map
              ? Map<String, dynamic>.from(item['training'] as Map)
              : <String, dynamic>{};
          final trainer = item['trainer'] is Map
              ? (item['trainer']['name'] ?? '').toString()
              : '';
          final studio = item['studio'] is Map
              ? Map<String, dynamic>.from(item['studio'] as Map)
              : <String, dynamic>{};
          final startsAt = DateTime.tryParse(
            (item['startsAt'] ?? '').toString(),
          )?.toLocal();
          final duration = (training['duration'] as num?)?.toInt();
          final price = (training['price'] as num?)?.toDouble();
          final className = (training['name'] ?? 'Class').toString();
          final studioName = (studio['name'] ?? '').toString();
          final canCancel = _canCancelBooking(item);
          final bookingId = _bookingId(item);
          final isCanceling =
              bookingId != null && _cancelingBookingIds.contains(bookingId);

          return Container(
            color: AppColors.backgroundPrimary,
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 82,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _timeLabel(startsAt),
                        style: const TextStyle(
                          fontSize: 28 / 1.6,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      if (duration != null)
                        Text(
                          '(${duration} min)',
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                          ),
                        ),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        className,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 20 / 1.6,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      if (trainer.isNotEmpty)
                        Text(
                          trainer,
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 13,
                          ),
                        ),
                      if (studioName.isNotEmpty)
                        Text(
                          studioName,
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 12,
                          ),
                        ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    if (price != null)
                      Text(
                        _formatVnd(price),
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          color: AppColors.primary500,
                          fontSize: 26 / 1.6,
                        ),
                      ),
                    if (canCancel) ...[
                      const SizedBox(height: 8),
                      SizedBox(
                        height: 30,
                        child: OutlinedButton(
                          onPressed: isCanceling ? null : () => _cancelBooking(item),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            side: const BorderSide(color: AppColors.error500),
                            foregroundColor: AppColors.error500,
                            textStyle: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          child: isCanceling
                              ? const SizedBox(
                                  width: 14,
                                  height: 14,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: AppColors.error500,
                                  ),
                                )
                              : const Text('Cancel'),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ClientPassesTab extends StatelessWidget {
  const _ClientPassesTab();

  @override
  Widget build(BuildContext context) {
    return const _ClientPassesHistoryList();
  }
}

class _ClientPassesHistoryList extends StatefulWidget {
  const _ClientPassesHistoryList();

  @override
  State<_ClientPassesHistoryList> createState() => _ClientPassesHistoryListState();
}

class _ClientPassesHistoryListState extends State<_ClientPassesHistoryList>
    with AutomaticKeepAliveClientMixin {
  static const Duration _cacheTtl = Duration(minutes: 2);
  static List<Map<String, dynamic>>? _cachedItems;
  static DateTime? _cachedAt;

  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _items = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  bool get wantKeepAlive => true;

  Future<void> _load({bool force = false}) async {
    if (!force &&
        _cachedItems != null &&
        _cachedAt != null &&
        DateTime.now().difference(_cachedAt!) < _cacheTtl) {
      if (!mounted) return;
      setState(() {
        _items = List<Map<String, dynamic>>.from(_cachedItems!);
        _loading = false;
        _error = null;
      });
      return;
    }
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) {
      if (!mounted) return;
      setState(() {
        _items = const [];
        _loading = false;
      });
      return;
    }
    if (mounted) setState(() => _loading = true);
    try {
      final now = DateTime.now();
      final from = Uri.encodeComponent(
        now.subtract(const Duration(days: 180)).toUtc().toIso8601String(),
      );
      final to = Uri.encodeComponent(
        now.add(const Duration(days: 120)).toUtc().toIso8601String(),
      );
      final raw = await ApiClient.get(
        '/fitness/client/schedule?from=$from&to=$to',
        token,
      );
      final list = raw is List
          ? raw
          : (raw is Map<String, dynamic> && raw['data'] is List
                ? raw['data'] as List
                : <dynamic>[]);
      final parsed = <Map<String, dynamic>>[];
      for (final item in list) {
        if (item is Map) parsed.add(Map<String, dynamic>.from(item));
      }
      parsed.sort((a, b) {
        final aa = DateTime.tryParse((a['startsAt'] ?? '').toString()) ??
            DateTime.fromMillisecondsSinceEpoch(0);
        final bb = DateTime.tryParse((b['startsAt'] ?? '').toString()) ??
            DateTime.fromMillisecondsSinceEpoch(0);
        return bb.compareTo(aa);
      });
      if (!mounted) return;
      setState(() {
        _items = parsed;
        _loading = false;
        _error = null;
      });
      _cachedItems = List<Map<String, dynamic>>.from(parsed);
      _cachedAt = DateTime.now();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _items = const [];
        _loading = false;
        _error = e.toString();
      });
    }
  }

  String _statusLabel(Map<String, dynamic> item) {
    final status = (item['sessionStatus'] ?? '').toString().toUpperCase();
    final endsAt = DateTime.tryParse((item['endsAt'] ?? '').toString())?.toLocal();
    if (status == 'COMPLETED') return 'Completed';
    if (endsAt != null && endsAt.isBefore(DateTime.now())) return 'Completed';
    return 'Scheduled';
  }

  Color _statusColor(String status) {
    if (status == 'Completed') return const Color(0xFF2E7D32);
    return AppColors.primary500;
  }

  String _dateTimeLabel(DateTime? dt) {
    if (dt == null) return 'Date TBD';
    String two(int v) => v.toString().padLeft(2, '0');
    return '${two(dt.day)}.${two(dt.month)} ${two(dt.hour)}:${two(dt.minute)}';
  }

  void _bookAgain(Map<String, dynamic> item) {
    final studio = item['studio'] is Map
        ? Map<String, dynamic>.from(item['studio'] as Map)
        : <String, dynamic>{};
    final studioId = (studio['id'] ?? item['studioId'] ?? '').toString();
    final studioName = (studio['name'] ?? 'Studio').toString();
    if (studioId.isEmpty) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        const SnackBar(content: Text('Studio is unavailable for rebooking')),
      );
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) =>
            PublicStudioScheduleScreen(studioId: studioId, studioName: studioName),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _ClientPlaceholderCard(
            title: 'Failed to load passes',
            subtitle: _error!,
          ),
        ],
      );
    }
    if (_items.isEmpty) {
      return ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          _ClientPlaceholderCard(
            title: 'No classes yet',
            subtitle: 'Your class cards will appear here.',
          ),
        ],
      );
    }
    return RefreshIndicator(
      onRefresh: () => _load(force: true),
      child: ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: _items.length,
        separatorBuilder: (_, __) =>
            const Divider(height: 1, color: AppColors.borderPrimary),
        itemBuilder: (_, index) {
          final item = _items[index];
          final training = item['training'] is Map
              ? Map<String, dynamic>.from(item['training'] as Map)
              : <String, dynamic>{};
          final studio = item['studio'] is Map
              ? Map<String, dynamic>.from(item['studio'] as Map)
              : <String, dynamic>{};
          final studioName = (studio['name'] ?? '').toString();
          final startsAt =
              DateTime.tryParse((item['startsAt'] ?? '').toString())?.toLocal();
          final status = _statusLabel(item);
          final statusColor = _statusColor(status);
          final canBookAgain = status == 'Completed';

          return Container(
            color: AppColors.backgroundPrimary,
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            (training['name'] ?? 'Class').toString(),
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 14,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _dateTimeLabel(startsAt),
                            style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 12,
                            ),
                          ),
                          if (studioName.isNotEmpty)
                            Text(
                              studioName,
                              style: const TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 12,
                              ),
                            ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(
                          color: statusColor.withValues(alpha: 0.35),
                        ),
                      ),
                      child: Text(
                        status,
                        style: TextStyle(
                          color: statusColor,
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
                if (canBookAgain) ...[
                  const SizedBox(height: 10),
                  Align(
                    alignment: Alignment.centerRight,
                    child: SizedBox(
                      height: 32,
                      child: FilledButton(
                        onPressed: () => _bookAgain(item),
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.primary500,
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          textStyle: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        child: const Text('Book again'),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ClientPlaceholderCard extends StatelessWidget {
  const _ClientPlaceholderCard({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderPrimary),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            style: const TextStyle(
              fontSize: 14,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

class _ClientProfileSettingsScreen extends StatelessWidget {
  const _ClientProfileSettingsScreen();

  Future<void> _logout(BuildContext context) async {
    await context.read<AuthService>().logout();
    if (!context.mounted) return;
    Navigator.of(
      context,
      rootNavigator: true,
    ).popUntil((route) => route.isFirst);
  }

  Future<void> _openWebPage(
    BuildContext context,
    String localeTag,
    String path,
  ) async {
    final uri = Uri.parse('${AppConfig.webUrl}/$localeTag$path');
    final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!opened && context.mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Failed to open link')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: AppBar(
        title: const Text('Profile settings'),
        backgroundColor: AppColors.backgroundPrimary,
        foregroundColor: AppColors.textPrimary,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _SettingsItemTile(
                icon: Icons.person_outline,
                title: 'Edit profile',
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const _ClientEditProfileScreen(),
                    ),
                  );
                },
              ),
              const SizedBox(height: 10),
              _SettingsItemTile(
                icon: Icons.description_outlined,
                title: 'Terms of use',
                onTap: () => _openWebPage(
                  context,
                  context.read<LocaleProvider>().languageTag,
                  '/terms-of-service',
                ),
              ),
              const SizedBox(height: 10),
              _SettingsItemTile(
                icon: Icons.privacy_tip_outlined,
                title: 'Privacy policy',
                onTap: () => _openWebPage(
                  context,
                  context.read<LocaleProvider>().languageTag,
                  '/privacy-policy',
                ),
              ),
              const Spacer(),
              FilledButton.icon(
                onPressed: () => _logout(context),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.error500,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                icon: const Icon(Icons.logout),
                label: const Text('Logout'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SettingsItemTile extends StatelessWidget {
  const _SettingsItemTile({
    required this.icon,
    required this.title,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.backgroundPrimary,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.borderPrimary),
          ),
          child: Row(
            children: [
              Icon(icon, color: AppColors.primary500),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              const Icon(Icons.chevron_right, color: AppColors.textSecondary),
            ],
          ),
        ),
      ),
    );
  }
}

class _ClientEditProfileScreen extends StatefulWidget {
  const _ClientEditProfileScreen();

  @override
  State<_ClientEditProfileScreen> createState() =>
      _ClientEditProfileScreenState();
}

class _ClientEditProfileScreenState extends State<_ClientEditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _saving = false;
  bool _deleting = false;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthService>().user;
    final fullName = (user?.name ?? '').trim();
    final parts = fullName
        .split(RegExp(r'\s+'))
        .where((p) => p.isNotEmpty)
        .toList();
    if (parts.isNotEmpty) {
      _firstNameController.text = parts.first;
      if (parts.length > 1) {
        _lastNameController.text = parts.sublist(1).join(' ');
      }
    }
    _emailController.text = user?.email ?? '';
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final auth = context.read<AuthService>();
    final firstName = _firstNameController.text.trim();
    final lastName = _lastNameController.text.trim();
    final fullName = [firstName, lastName].where((s) => s.isNotEmpty).join(' ');
    final newEmail = _emailController.text.trim();
    final newPassword = _passwordController.text;
    final confirmPassword = _confirmPasswordController.text;

    if (newPassword.isNotEmpty && newPassword != confirmPassword) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Passwords do not match')));
      return;
    }

    setState(() => _saving = true);
    final profileRes = await auth.updateProfile(
      name: fullName,
      phone: auth.user?.phone ?? '',
    );
    if (!mounted) return;

    if (!profileRes.success) {
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(profileRes.errorRaw ?? 'Failed to update profile'),
        ),
      );
      return;
    }

    if (newEmail.isNotEmpty && newEmail != (auth.user?.email ?? '')) {
      final emailRes = await auth.updateEmail(newEmail);
      if (!mounted) return;
      if (!emailRes.success) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(emailRes.errorRaw ?? 'Failed to update email'),
          ),
        );
        return;
      }
    }

    if (newPassword.isNotEmpty) {
      final pwdRes = await auth.updatePassword(newPassword);
      if (!mounted) return;
      if (!pwdRes.success) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(pwdRes.errorRaw ?? 'Failed to update password'),
          ),
        );
        return;
      }
    }

    setState(() => _saving = false);
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Profile updated')));
    Navigator.of(context).pop();
  }

  Future<void> _deleteAccount() async {
    final shouldDelete = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Delete account'),
        content: const Text(
          'This action is permanent. Are you sure you want to delete your account?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.error500),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (shouldDelete != true || !mounted) return;

    setState(() => _deleting = true);
    final result = await context.read<AuthService>().deleteAccount();
    if (!mounted) return;
    setState(() => _deleting = false);

    if (!result.success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result.errorRaw ?? 'Failed to delete account')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: AppBar(
        title: const Text('Edit profile'),
        backgroundColor: AppColors.backgroundPrimary,
        foregroundColor: AppColors.textPrimary,
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Form(
              key: _formKey,
              child: Column(
                children: [
                  TextFormField(
                    controller: _firstNameController,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(
                      labelText: 'First name',
                      border: OutlineInputBorder(),
                    ),
                    validator: (v) => (v == null || v.trim().isEmpty)
                        ? 'First name is required'
                        : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _lastNameController,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(
                      labelText: 'Last name',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _passwordController,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'New password',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _confirmPasswordController,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Confirm password',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _saving ? null : _save,
                      child: Text(_saving ? 'Saving...' : 'Save'),
                    ),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: _deleting ? null : _deleteAccount,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.error500,
                        side: const BorderSide(color: AppColors.error500),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      icon: _deleting
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: AppColors.error500,
                              ),
                            )
                          : const Icon(Icons.delete_forever_outlined),
                      label: Text(_deleting ? 'Deleting...' : 'Delete account'),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ClientNavItem extends StatelessWidget {
  const _ClientNavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = isSelected ? AppColors.primary500 : AppColors.textSecondary;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(isSelected ? activeIcon : icon, size: 20, color: color),
            const SizedBox(height: 1),
            Text(
              label,
              style: TextStyle(
                fontSize: 9,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                color: color,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
