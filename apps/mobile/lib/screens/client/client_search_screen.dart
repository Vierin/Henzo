import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../widgets/common/henzo_modal.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import '../../models/training_category_option.dart';
import '../../services/api_client.dart';
import '../../services/auth_service.dart';
import '../../services/cache/client_nearby_cache.dart';
import '../../services/client_location_store.dart';
import '../../services/client_favorites_mutations.dart';
import '../../services/client_favorites_store.dart';
import '../../services/dashboard_api_service.dart';
import '../../utils/formatters.dart';
import '../../utils/load_error_message.dart';
import '../../utils/nearby_payload.dart';
import '../../widgets/common/load_error_view.dart';
import '../../widgets/dashboard/owner_daily_schedule_session_card.dart';
import '../../widgets/schedule/calendar_day_pill.dart';
import '../location_picker_screen.dart';
import '../public_class_detail_screen.dart';
import '../public_studio_detail_screen.dart';
import 'client_explore_models.dart';
import '../../widgets/app_search_prefix_icon.dart';
import '../../widgets/client/browse_day_pill.dart';
import '../../widgets/client/browse_studio_list_card.dart';
import '../../widgets/client/client_explore_filter_chip.dart';
import '../../widgets/training/training_category_color_chip.dart';

const int _kExploreHorizonDays = 31;

/// Default ?Activities by start time? on Browse: 05:00?22:00.
const RangeValues _kExploreDefaultTimeRange = RangeValues(300, 1320);
const int _kExploreDefaultTimeStartMin = 300;
const int _kExploreDefaultTimeEndMin = 1320;

class ClientSearchScreen extends StatefulWidget {
  const ClientSearchScreen({super.key});

  @override
  State<ClientSearchScreen> createState() => ClientSearchScreenState();
}

class ClientSearchScreenState extends State<ClientSearchScreen>
    with SingleTickerProviderStateMixin {
  static const _browseLocationBlue = Color(0xFF4D39A8);

  static const double _browseModeOuterRadius = 14;
  static const double _browseModeInnerRadius = 12;
  static const double _browseModeInset = 3;
  static const double _browseModeInnerHeight = 38;
  static const Duration _browseModeAnimDuration = Duration(milliseconds: 280);

  bool _loading = true;
  String? _loadError;
  final ValueNotifier<bool> _browseShowClasses = ValueNotifier<bool>(true);
  late final AnimationController _browseModeController;
  bool _isMonthExpanded = false;
  late DateTime _selectedDay;
  late final ValueNotifier<DateTime> _stripDayNotifier;
  late final ScrollController _dayStripScrollController;
  double? _browseStripViewportWidth;
  final ValueNotifier<DateTime> _stripPagerDayNotifier = ValueNotifier(
    DateTime.now(),
  );
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  ClientLocationStore? _locationStore;
  String _distanceFilter = 'auto';
  String _sortBy = 'recommended';
  final Set<String> _timePeriods = <String>{};

  /// Minutes from midnight; timeline starts at 05:00, max 24:00.
  /// Default active start-time window: 09:00 - 20:00.
  RangeValues _timeRange = _kExploreDefaultTimeRange;
  List<ExploreStudioItem> _studios = const [];
  List<ExploreClassItem> _classes = const [];
  List<TrainingCategoryOption> _trainingCategories = const [];
  int? _selectedCategoryId;

  /// Invalidated when filters / day / class data change; avoids recomputing in every build.
  int _derivedInputsHash = 0;
  List<ExploreClassItem> _derivedDayClasses = const [];
  List<ExploreStudioItem> _derivedVisibleStudios = const [];
  Map<String, List<ExploreClassItem>> _derivedTodayClassesByStudio = const {};
  int _derivedDayClassesCount = 0;
  int _derivedVisibleStudiosCount = 0;
  final Map<String, double?> _distanceKmMemo = {};
  String _distanceMemoLocationKey = '';
  final Set<String> _favoriteLoadingIds = <String>{};

  @override
  void initState() {
    super.initState();
    final today = _calendarDateOnly(DateTime.now());
    _selectedDay = today;
    _stripDayNotifier = ValueNotifier<DateTime>(today);
    _stripPagerDayNotifier.value = today;
    _dayStripScrollController = ScrollController();
    _searchController.addListener(_onSearchChanged);
    _browseModeController = AnimationController(
      vsync: this,
      value: 0,
      duration: _browseModeAnimDuration,
    );
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

  void _onSharedLocationChanged() {
    if (!mounted) return;
    setState(() {
      _derivedInputsHash = 0;
      _distanceKmMemo.clear();
    });
    if (_exploreLoadRequested) {
      unawaited(_loadExplore());
    }
  }

  @override
  void dispose() {
    _locationStore?.removeListener(_onSharedLocationChanged);
    _searchController.removeListener(_onSearchChanged);
    _searchController.dispose();
    _stripDayNotifier.dispose();
    _stripPagerDayNotifier.dispose();
    _dayStripScrollController.dispose();
    _browseShowClasses.dispose();
    _browseModeController.dispose();
    super.dispose();
  }

  void _setBrowseShowClasses(bool showClasses) {
    if (_browseShowClasses.value == showClasses &&
        !_browseModeController.isAnimating) {
      return;
    }
    _browseShowClasses.value = showClasses;
    _browseModeController.stop();
    _browseModeController.animateTo(
      showClasses ? 0 : 1,
      duration: _browseModeAnimDuration,
      curve: Curves.easeOutCubic,
    );
  }

  void _applyExploreDay(DateTime day) {
    final normalized = _calendarDateOnly(day);
    _stripDayNotifier.value = normalized;
    _stripPagerDayNotifier.value = normalized;
    if (CalendarDayPill.isSameDay(normalized, _selectedDay)) return;
    setState(() {
      _selectedDay = normalized;
      _derivedInputsHash = 0;
    });
  }

  static const double _kBrowseDayPillGap = 7;

  double _browsePillWidth(double viewportWidth) =>
      viewportWidth / 7 - _kBrowseDayPillGap;

  double _browseDayStride(double viewportWidth) => viewportWidth / 7;

  void _scrollBrowseStripToIndex(
    int index, {
    bool animate = false,
  }) {
    final w = _browseStripViewportWidth;
    if (w == null || !_dayStripScrollController.hasClients) return;
    final offset = index * _browseDayStride(w);
    if (animate) {
      _dayStripScrollController.animateTo(
        offset,
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOutCubic,
      );
    } else {
      _dayStripScrollController.jumpTo(offset);
    }
  }

  void _goToToday() {
    final today = _calendarDateOnly(DateTime.now());
    _scrollBrowseStripToIndex(0, animate: true);
    _applyExploreDay(today);
  }

  bool _isDayInExploreHorizon(DateTime day) {
    final normalized = _calendarDateOnly(day);
    final today = _calendarDateOnly(DateTime.now());
    final diff = normalized.difference(today).inDays;
    return diff >= 0 && diff < _kExploreHorizonDays;
  }

  void _jumpBrowseToDay(DateTime day) {
    final normalized = _calendarDateOnly(day);
    if (!_isDayInExploreHorizon(normalized)) return;
    final index = normalized
        .difference(_calendarDateOnly(DateTime.now()))
        .inDays;
    _scrollBrowseStripToIndex(index, animate: true);
    _applyExploreDay(normalized);
  }

  void _syncBrowseStripPagerToSelectedDay() {
    final today = _calendarDateOnly(DateTime.now());
    final index = _selectedDay
        .difference(today)
        .inDays
        .clamp(0, _kExploreHorizonDays - 1);
    _scrollBrowseStripToIndex(index);
    _stripPagerDayNotifier.value = _selectedDay;
  }

  void _onBrowseDayStripScrolled() {
    final w = _browseStripViewportWidth;
    if (w == null || !_dayStripScrollController.hasClients) return;
    final stride = _browseDayStride(w);
    if (stride <= 0) return;
    final index = (_dayStripScrollController.offset / stride)
        .round()
        .clamp(0, _kExploreHorizonDays - 1);
    final day = _exploreDayAt(index);
    final normalized = _calendarDateOnly(day);
    if (_stripPagerDayNotifier.value == normalized) return;
    _stripPagerDayNotifier.value = normalized;
  }

  List<DateTime?> _browseMonthCells(DateTime monthDate) {
    final firstDay = DateTime(monthDate.year, monthDate.month, 1);
    final daysInMonth = DateUtils.getDaysInMonth(
      monthDate.year,
      monthDate.month,
    );
    final startOffset = firstDay.weekday - 1;
    final totalCells = ((startOffset + daysInMonth + 6) ~/ 7) * 7;
    return List.generate(totalCells, (index) {
      final dayNum = index - startOffset + 1;
      if (dayNum < 1 || dayNum > daysInMonth) return null;
      return DateTime(monthDate.year, monthDate.month, dayNum);
    });
  }

  Widget _buildBrowseMonthExpanded(DateTime monthAnchor) {
    final monthStart = DateTime(monthAnchor.year, monthAnchor.month, 1);
    final cells = _browseMonthCells(monthStart);
    const dow = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(12, 16, 12, 16),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        children: [
          Row(
            children: List.generate(
              7,
              (i) => Expanded(
                child: Center(
                  child: Text(
                    dow[i],
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w400,
                      letterSpacing: -0.3,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          ValueListenableBuilder<DateTime>(
            valueListenable: _stripDayNotifier,
            builder: (context, selectedDay, _) {
              return GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: cells.length,
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 7,
                  mainAxisSpacing: 8,
                  crossAxisSpacing: 4,
                  childAspectRatio: 1,
                ),
                itemBuilder: (_, index) {
                  final day = cells[index];
                  if (day == null) return const SizedBox.shrink();
                  final inHorizon = _isDayInExploreHorizon(day);
                  final selected = CalendarDayPill.isSameDay(day, selectedDay);
                  return Center(
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        customBorder: const CircleBorder(),
                        onTap: inHorizon
                            ? () {
                                setState(() => _isMonthExpanded = false);
                                _jumpBrowseToDay(day);
                              }
                            : null,
                        child: Opacity(
                          opacity: inHorizon ? 1 : 0.28,
                          child: Container(
                            width: 36,
                            height: 36,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: selected
                                  ? AppColors.primary500
                                  : AppColors.backgroundTertiary,
                              border: Border.all(
                                color: selected
                                    ? AppColors.primary500
                                    : AppColors.borderPrimary.withValues(
                                        alpha: 0.5,
                                      ),
                              ),
                            ),
                            child: Text(
                              '${day.day}',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                                color: selected
                                    ? Colors.white
                                    : AppColors.textPrimary,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                },
              );
            },
          ),
        ],
      ),
    );
  }

  void _onSearchChanged() {
    final q = _searchController.text;
    if (q == _searchQuery) return;
    setState(() {
      _searchQuery = q;
      _derivedInputsHash = 0;
    });
  }

  static DateTime _calendarDateOnly(DateTime d) =>
      DateTime(d.year, d.month, d.day);

  DateTime _exploreDayAt(int index) =>
      _calendarDateOnly(DateTime.now()).add(Duration(days: index));

  bool _matchesSearchClass(ExploreClassItem c) {
    final q = _searchQuery.trim().toLowerCase();
    if (q.isEmpty) return true;
    return c.className.toLowerCase().contains(q) ||
        c.studioName.toLowerCase().contains(q) ||
        c.trainerName.toLowerCase().contains(q);
  }

  bool _matchesSearchStudio(ExploreStudioItem s) {
    final q = _searchQuery.trim().toLowerCase();
    if (q.isEmpty) return true;
    return s.name.toLowerCase().contains(q) ||
        s.address.toLowerCase().contains(q);
  }

  String _typesChipLabel(String localeCode) {
    final id = _selectedCategoryId;
    if (id == null) return 'Types';
    return _categoryOptionById(id)?.label(localeCode) ?? 'Types';
  }

  String get _timeFilterChipLabel {
    if (_timePeriods.length == 1 && _timePeriods.contains('morning')) {
      return 'Morning';
    }
    if (_timePeriods.length == 1 && _timePeriods.contains('afternoon')) {
      return 'Afternoon';
    }
    if (_timePeriods.length == 1 && _timePeriods.contains('evening')) {
      return 'Evening';
    }
    if (_hasActiveTimeFilter) return _timeChipLabel;
    return 'Time';
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

  String get _sortChipLabel {
    switch (_sortBy) {
      case 'distance':
        return 'Nearest';
      case 'ratings':
        return 'Ratings';
      case 'recommended':
      default:
        return 'Sort';
    }
  }

  Future<void> _openLocationPicker() async {
    final loc = context.read<ClientLocationStore>();
    final picked = await Navigator.of(context).push<LocationPickerResult>(
      MaterialPageRoute(
        builder: (_) => LocationPickerScreen(
          initialCity: loc.displayLabel(''),
        ),
      ),
    );
    if (picked == null || picked.city.trim().isEmpty || !mounted) return;
    await context.read<ClientLocationStore>().applyFromPicker(picked);
    setState(() {
      _derivedInputsHash = 0;
      _distanceKmMemo.clear();
    });
    if (_exploreLoadRequested) {
      await _loadExplore();
    }
  }

  /// First call is deferred until user opens the Explore tab (see [ensureExploreLoaded]).
  bool _exploreLoadRequested = false;

  void ensureExploreLoaded() {
    if (_exploreLoadRequested) return;
    _exploreLoadRequested = true;
    _ensureTrainingCategoriesLoaded();
    _loadExplore();
  }

  /// Home category chips ? open Explore with filter applied.
  void selectCategory(int? categoryId) {
    setState(() {
      _selectedCategoryId = categoryId;
      _derivedInputsHash = 0;
    });
    _ensureTrainingCategoriesLoaded();
    _ensureDerivedLists();
  }

  /// Home «See all» / shell: Classes vs Studios tab on Browse.
  void applyBrowseListMode({required bool showClasses}) {
    if (!mounted) return;
    _setBrowseShowClasses(showClasses);
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

  Future<List<ExploreClassItem>> _fetchExploreClassesForStudio(
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
      for (final row in raw) {
        if (row is! Map) continue;
        final map = Map<String, dynamic>.from(row);
        final training = map['training'] is Map
            ? Map<String, dynamic>.from(map['training'] as Map)
            : <String, dynamic>{};
        final studioBlock = map['studio'] is Map
            ? Map<String, dynamic>.from(map['studio'] as Map)
            : <String, dynamic>{};
        final studioLocationCount =
            (studioBlock['locationCount'] as num?)?.toInt() ?? 1;
        final endsAt = parseApiDateTime(map['endsAt']);
        final locationName = map['locationName']?.toString();
        final startsAt = parseApiDateTime(map['startsAt']);
        if (startsAt == null) continue;
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
            endsAt: endsAt,
            locationName: locationName,
            studioLocationCount: studioLocationCount,
            distanceKm: studio.distanceKm,
          ),
        );
      }
      return out;
    } catch (_) {
      return const [];
    }
  }

  void _openExploreClassDetail(ExploreClassItem c) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PublicClassDetailScreen(
          studioId: c.studioId,
          sessionId: c.sessionId,
          sessionStartsAtHint: c.startsAt,
          distanceKm: c.distanceKm,
        ),
      ),
    );
  }

  Future<void> _toggleBrowseStudioFavorite(ExploreStudioItem studio) async {
    final token = context.read<AuthService>().accessToken;
    final favStore = context.read<ClientFavoritesStore>();
    if (token == null ||
        token.isEmpty ||
        _favoriteLoadingIds.contains(studio.id)) {
      return;
    }
    final wasFavorite = favStore.isFavorite(studio.id);
    setState(() => _favoriteLoadingIds.add(studio.id));
    final imageUrl = studio.photoUrl ?? studio.logoUrl;
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
              if (imageUrl != null && imageUrl.isNotEmpty) 'photos': [imageUrl],
              'avgRating': studio.rating,
            },
          );
    if (!mounted) return;
    setState(() => _favoriteLoadingIds.remove(studio.id));
    if (!ok) {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(content: Text('Failed to update favorites')),
        );
    }
  }

  OwnerTrainingSession _ownerSessionFromExplore(ExploreClassItem c) {
    final ends =
        c.endsAt ?? c.startsAt.add(Duration(minutes: c.durationMin ?? 60));
    return OwnerTrainingSession(
      sessionId: c.sessionId,
      trainingId: c.trainingId,
      startsAt: c.startsAt,
      endsAt: ends,
      status: 'ACTIVE',
      capacity: c.capacity ?? 0,
      enrolledCount: c.bookedCount,
      attendedCount: c.bookedCount,
      trainingName: c.className,
      trainingDurationMinutes: c.durationMin,
      trainingDisplayColorHex: c.displayColorHex,
      trainingPrice: c.price,
      trainerName: c.trainerName.trim(),
      trainerId: null,
      locationId: null,
      locationName: (c.locationName ?? '').trim().isEmpty
          ? null
          : c.locationName!.trim(),
    );
  }

  Future<void> _loadExplore() async {
    if (!mounted) return;
    final loc = context.read<ClientLocationStore>();
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      final radiusKm = _currentRadiusKm();
      final nearbyQuery = StringBuffer(
        '/studios/nearby?limit=20&radius=$radiusKm',
      );
      if (loc.lat != null && loc.lon != null) {
        nearbyQuery
          ..write('&lat=')
          ..write(loc.lat!.toStringAsFixed(6))
          ..write('&lng=')
          ..write(loc.lon!.toStringAsFixed(6));
      }
      final nearbyPath = nearbyQuery.toString();
      var nearbyRaw = ClientNearbyCache.get(nearbyPath);
      if (nearbyRaw == null) {
        nearbyRaw = await ApiClient.get(nearbyPath, null);
        ClientNearbyCache.put(nearbyPath, nearbyRaw);
      }
      final nearbyList = extractStudiosListFromNearby(nearbyRaw);

      final studios = <ExploreStudioItem>[];
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
        final photos = map['photos'];
        final photoUrl = photos is List && photos.isNotEmpty
            ? photos.first?.toString()
            : null;

        studios.add(
          ExploreStudioItem(
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

      final classes = <ExploreClassItem>[];
      final from = DateTime.now();
      final to = from.add(const Duration(days: 30));
      final toQuery = Uri.encodeComponent(to.toIso8601String());
      final fromQuery = Uri.encodeComponent(from.toIso8601String());
      final slice = studios.take(8).toList();
      const concurrency = 4;
      for (var i = 0; i < slice.length; i += concurrency) {
        final end = i + concurrency > slice.length
            ? slice.length
            : i + concurrency;
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
        _loadError = null;
        _derivedInputsHash = 0;
        _distanceKmMemo.clear();
      });
    } catch (e) {
      if (!mounted) return;
      final locale = context.read<LocaleProvider>();
      setState(() {
        _loading = false;
        _loadError = loadErrorMessage(locale, e);
      });
    }
  }

  /// Snap to 30-minute steps for [RangeSlider] (min 05:00, max 24:00).
  RangeValues _alignTimeRangeToSlider(RangeValues r) {
    int step30(int v) => ((v / 30.0).round() * 30).clamp(300, 1440);
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

  bool get _hasActiveTimeFilter {
    if (_timePeriods.isNotEmpty) return true;
    final startMin = _timeRange.start.round();
    final endMin = _timeRange.end.round();
    if (startMin != _kExploreDefaultTimeStartMin) return true;
    if (endMin != _kExploreDefaultTimeEndMin) return true;
    return false;
  }

  String get _timeChipLabel {
    if (!_hasActiveTimeFilter) return 'Time';
    return '${formatMinutesSliderLabel(_timeRange.start)} - ${formatMinutesSliderLabel(_timeRange.end)}';
  }

  String _distanceLabel(double? km) => formatBrowseStudioDistanceLabel(km);

  double? _resolvedDistanceKm(
    ExploreStudioItem studio,
    ClientLocationStore loc,
  ) {
    return resolveStudioDistanceKm(
      apiDistanceKm: studio.distanceKm,
      clientLat: loc.lat,
      clientLon: loc.lon,
      studioLat: studio.lat,
      studioLng: studio.lng,
    );
  }

  int _computeDerivedInputsHash() {
    return Object.hash(
      _dayKey(_selectedDay),
      _classes.length,
      _studios.length,
      _sortBy,
      _distanceFilter,
      _selectedCategoryId,
      _searchQuery,
      Object.hashAll(_timePeriods),
      _timeRange.start.round(),
      _timeRange.end.round(),
    );
  }

  int _dayKey(DateTime d) => d.year * 10000 + d.month * 100 + d.day;

  void _syncDistanceMemoLocation(ClientLocationStore loc) {
    final k = '${loc.lat?.toStringAsFixed(5)}_${loc.lon?.toStringAsFixed(5)}';
    if (k != _distanceMemoLocationKey) {
      _distanceMemoLocationKey = k;
      _distanceKmMemo.clear();
    }
  }

  void _ensureDerivedLists() {
    final h = _computeDerivedInputsHash();
    if (h == _derivedInputsHash) return;
    _derivedInputsHash = h;
    final selectedDate = _selectedDay;
    final dayClasses = _classes.where((c) {
      if (!CalendarDayPill.isSameDay(c.startsAt, selectedDate)) return false;
      if (!_isClassInSelectedPeriods(c.startsAt)) return false;
      if (!_isClassInTimeRange(c.startsAt)) return false;
      if (!_classMatchesCategory(c)) return false;
      return true;
    }).toList();
    _derivedDayClassesCount = dayClasses.length;
    _derivedDayClasses = dayClasses
        .where(_matchesSearchClass)
        .toList(growable: false);

    final visibleStudios = _studios
        .where(_studioMatchesCategory)
        .toList(growable: false);
    _derivedVisibleStudiosCount = visibleStudios.length;
    _derivedVisibleStudios = visibleStudios
        .where(_matchesSearchStudio)
        .toList(growable: false);

    final classesByStudio = <String, List<ExploreClassItem>>{};
    for (final s in _derivedVisibleStudios) {
      final list = <ExploreClassItem>[];
      for (final c in _classes) {
        if (c.studioId != s.id) continue;
        if (!CalendarDayPill.isSameDay(c.startsAt, selectedDate)) continue;
        if (!_isClassInSelectedPeriods(c.startsAt)) continue;
        if (!_isClassInTimeRange(c.startsAt)) continue;
        if (!_classMatchesCategory(c)) continue;
        list.add(c);
      }
      list.sort((a, b) => a.startsAt.compareTo(b.startsAt));
      classesByStudio[s.id] = list;
    }
    _derivedTodayClassesByStudio = classesByStudio;
  }

  double? _resolvedDistanceKmMemo(
    ExploreStudioItem studio,
    ClientLocationStore loc,
  ) {
    _syncDistanceMemoLocation(loc);
    if (_distanceKmMemo.containsKey(studio.id)) {
      return _distanceKmMemo[studio.id];
    }
    final v = _resolvedDistanceKm(studio, loc);
    _distanceKmMemo[studio.id] = v;
    return v;
  }

  bool _isClassInSelectedPeriods(DateTime startsAt) {
    if (_timePeriods.isEmpty) return true;
    final hour = startsAt.hour;
    final isMorning = hour >= 5 && hour < 12;
    final isAfternoon = hour >= 12 && hour < 16;
    final isEvening = hour >= 16 && hour < 20;
    if (_timePeriods.contains('morning') && isMorning) return true;
    if (_timePeriods.contains('afternoon') && isAfternoon) return true;
    if (_timePeriods.contains('evening') && isEvening) return true;
    return false;
  }

  bool _isClassInTimeRange(DateTime startsAt) {
    final startMin = (startsAt.hour * 60) + startsAt.minute;
    final from = _timeRange.start.round();
    final to = _timeRange.end.round();
    return startMin >= from && startMin <= to;
  }

  bool _classMatchesCategory(ExploreClassItem c) {
    if (_selectedCategoryId == null) return true;
    return c.trainingCategoryId == _selectedCategoryId;
  }

  TrainingCategoryOption? _categoryOptionById(int id) {
    for (final o in _trainingCategories) {
      if (o.id == id) return o;
    }
    return null;
  }

  bool _studioMatchesCategory(ExploreStudioItem s) {
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
    final labels = {
      opt.nameEn,
      opt.nameRu,
      opt.nameVn,
    }.map((e) => e.trim().toLowerCase()).where((e) => e.isNotEmpty).toSet();
    return s.categoryNames.any((n) => labels.contains(n.trim().toLowerCase()));
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
          TrainingCategoryOption.fromJson(Map<String, dynamic>.from(row)),
        );
      }
      setState(
        () => _trainingCategories = TrainingCategoryOption.withOtherLast(list),
      );
    } catch (_) {}
  }

  Future<void> _openCategorySheet() async {
    await _ensureTrainingCategoriesLoaded();
    if (!mounted) return;
    final localeCode = context.read<LocaleProvider>().localeCode;
    var tempSelection = _selectedCategoryId ?? -1;

    final result = await showHenzoModalBottomSheet<int>(
      context: context,
      showDragHandle: false,
      isScrollControlled: true,
      backgroundColor: AppColors.backgroundPrimary,
      builder: (ctx) {
        final maxH = MediaQuery.of(context).size.height * 0.72;

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
                        _filterSheetTitleRow(ctx, 'Types'),
                        const SizedBox(height: 12),
                        Expanded(
                          child: SingleChildScrollView(
                            child: Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                TrainingCategoryColorChip(
                                  label: 'All types',
                                  selected: tempSelection < 0,
                                  onTap: () =>
                                      setModalState(() => tempSelection = -1),
                                ),
                                ..._trainingCategories.map(
                                  (cat) => TrainingCategoryColorChip(
                                    category: cat,
                                    label: cat.label(localeCode),
                                    selected: tempSelection == cat.id,
                                    onTap: () => setModalState(
                                      () => tempSelection = cat.id,
                                    ),
                                  ),
                                ),
                              ],
                            ),
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
    final result = await showHenzoModalBottomSheet<Map<String, dynamic>>(
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
                    tempPeriods.clear();
                    tempRange = _kExploreDefaultTimeRange;
                    return;
                  }
                  tempPeriods
                    ..clear()
                    ..add(id);
                  if (id == 'morning') {
                    tempRange = const RangeValues(300, 720);
                  } else if (id == 'afternoon') {
                    tempRange = const RangeValues(720, 960);
                  } else if (id == 'evening') {
                    tempRange = const RangeValues(960, 1320);
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
                            id: 'morning',
                            label: 'Morning',
                            icon: Icons.wb_twilight_outlined,
                            setModalState: setModalState,
                          ),
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
                          '${formatMinutesSliderLabel(tempRange.start)} - ${formatMinutesSliderLabel(tempRange.end)}',
                          style: const TextStyle(
                            color: AppColors.primary500,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      RangeSlider(
                        values: tempRange,
                        min: 300,
                        max: 1440,
                        divisions: 38,
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
                              tempRange = _kExploreDefaultTimeRange;
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

  void _applyStudioSortInPlace(List<ExploreStudioItem> studios) {
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
    final result = await showHenzoModalBottomSheet<String>(
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
                      _filterSheetTitleRow(ctx, 'Sort'),
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
                        subtitle: 'Highest to lowest',
                        setModalState: setModalState,
                      ),
                      option(
                        value: 'distance',
                        title: 'Distance',
                        subtitle: 'Nearest to farthest',
                        setModalState: setModalState,
                      ),
                      const SizedBox(height: 4),
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
      final sorted = List<ExploreStudioItem>.from(_studios);
      _applyStudioSortInPlace(sorted);
      _studios = sorted;
      _derivedInputsHash = 0;
    });
  }

  Future<void> _openDistanceSheet() async {
    String tempDistance = _distanceFilter;
    final result = await showHenzoModalBottomSheet<String>(
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
          final selected = tempDistance == value;
          return InkWell(
            splashColor: Colors.transparent,
            highlightColor: Colors.transparent,
            hoverColor: Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            onTap: () => setModalState(() => tempDistance = value),
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
                      _filterSheetTitleRow(ctx, 'Distance'),
                      const SizedBox(height: 12),
                      option(
                        value: 'auto',
                        title: 'Auto (20 km)',
                        setModalState: setModalState,
                      ),
                      option(
                        value: '5',
                        title: '5 km',
                        setModalState: setModalState,
                      ),
                      option(
                        value: '10',
                        title: '10 km',
                        setModalState: setModalState,
                      ),
                      option(
                        value: '15',
                        title: '15 km',
                        setModalState: setModalState,
                      ),
                      option(
                        value: '30+',
                        title: '30+ km',
                        setModalState: setModalState,
                      ),
                      const SizedBox(height: 4),
                      SizedBox(
                        width: double.infinity,
                        child: TextButton(
                          onPressed: () =>
                              setModalState(() => tempDistance = 'auto'),
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
                          onPressed: () => Navigator.of(ctx).pop(tempDistance),
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
    final distanceChanged = result != _distanceFilter;
    setState(() => _distanceFilter = result);
    if (distanceChanged) {
      await _loadExplore();
    }
  }

  Future<void> _openAllFiltersSheet() async {
    String tempSort = _sortBy;
    String tempDistance = _distanceFilter;
    final tempPeriods = Set<String>.from(_timePeriods);
    RangeValues tempRange = _alignTimeRangeToSlider(_timeRange);

    final result = await showHenzoModalBottomSheet<Map<String, dynamic>>(
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
                              id: 'morning',
                              label: 'Morning',
                              icon: Icons.wb_twilight_outlined,
                              selected: tempPeriods.contains('morning'),
                              onTap: () {
                                setModalState(() {
                                  if (tempPeriods.contains('morning')) {
                                    tempPeriods.clear();
                                    tempRange = _kExploreDefaultTimeRange;
                                    return;
                                  }
                                  tempPeriods
                                    ..clear()
                                    ..add('morning');
                                  tempRange = const RangeValues(300, 720);
                                });
                              },
                            ),
                            periodTile(
                              id: 'afternoon',
                              label: 'Afternoon',
                              icon: Icons.wb_sunny_outlined,
                              selected: tempPeriods.contains('afternoon'),
                              onTap: () {
                                setModalState(() {
                                  if (tempPeriods.contains('afternoon')) {
                                    tempPeriods.clear();
                                    tempRange = _kExploreDefaultTimeRange;
                                    return;
                                  }
                                  tempPeriods
                                    ..clear()
                                    ..add('afternoon');
                                  tempRange = const RangeValues(720, 960);
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
                                    tempPeriods.clear();
                                    tempRange = _kExploreDefaultTimeRange;
                                    return;
                                  }
                                  tempPeriods
                                    ..clear()
                                    ..add('evening');
                                  tempRange = const RangeValues(960, 1320);
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
                            '${formatMinutesSliderLabel(tempRange.start)} - ${formatMinutesSliderLabel(tempRange.end)}',
                            style: const TextStyle(
                              color: AppColors.primary500,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        RangeSlider(
                          values: tempRange,
                          min: 300,
                          max: 1440,
                          divisions: 38,
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
                                tempRange = _kExploreDefaultTimeRange;
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
        final sorted = List<ExploreStudioItem>.from(_studios);
        _applyStudioSortInPlace(sorted);
        _studios = sorted;
      }
    });
    if (distanceChanged) {
      await _loadExplore();
    }
  }

  Widget _buildDayStrip() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final viewportWidth = constraints.maxWidth;
        _browseStripViewportWidth = viewportWidth;
        final pillWidth = _browsePillWidth(viewportWidth);
        final stripHeight = pillWidth * 3 / 2;
        return SizedBox(
          height: stripHeight,
          child: NotificationListener<ScrollNotification>(
            onNotification: (ScrollNotification n) {
              if (n.metrics.axis != Axis.horizontal) return false;
              _onBrowseDayStripScrolled();
              if (n is ScrollEndNotification) {
                final w = _browseStripViewportWidth;
                if (w == null || !_dayStripScrollController.hasClients) {
                  return false;
                }
                final stride = _browseDayStride(w);
                final index = (_dayStripScrollController.offset / stride)
                    .round()
                    .clamp(0, _kExploreHorizonDays - 1);
                final target = index * stride;
                if ((_dayStripScrollController.offset - target).abs() > 0.5) {
                  _dayStripScrollController.animateTo(
                    target,
                    duration: const Duration(milliseconds: 200),
                    curve: Curves.easeOutCubic,
                  );
                }
              }
              return false;
            },
            child: ListView.separated(
              controller: _dayStripScrollController,
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(
                parent: AlwaysScrollableScrollPhysics(),
              ),
              clipBehavior: Clip.none,
              itemCount: _kExploreHorizonDays,
              separatorBuilder: (context, index) => const SizedBox(
                width: _kBrowseDayPillGap,
              ),
              itemBuilder: (_, index) {
                final day = _exploreDayAt(index);
                return SizedBox(
                  width: pillWidth,
                  child: ValueListenableBuilder<DateTime>(
                    valueListenable: _stripDayNotifier,
                    builder: (context, stripDay, _) {
                      final selected = CalendarDayPill.isSameDay(day, stripDay);
                      return BrowseDayPill(
                        day: day,
                        selected: selected,
                        onTap: () => _applyExploreDay(day),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        );
      },
    );
  }

  Widget _browseTodayButton() {
    return Material(
      color: AppColors.primary500,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: _goToToday,
        borderRadius: BorderRadius.circular(999),
        child: const Padding(
          padding: EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          child: Text(
            'Today',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Colors.white,
              height: 1.1,
            ),
          ),
        ),
      ),
    );
  }

  Widget _browseExpandButton() {
    return Material(
      color: AppColors.backgroundPrimary,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: () {
          final wasExpanded = _isMonthExpanded;
          setState(() => _isMonthExpanded = !_isMonthExpanded);
          if (wasExpanded) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (!mounted) return;
              _syncBrowseStripPagerToSelectedDay();
            });
          }
        },
        borderRadius: BorderRadius.circular(999),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              SvgPicture.asset(
                'assets/icons/icon-calendar.svg',
                width: 13,
                height: 12,
                fit: BoxFit.contain,
                excludeFromSemantics: true,
                colorFilter: const ColorFilter.mode(
                  AppColors.textPrimary,
                  BlendMode.srcIn,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                _isMonthExpanded ? 'Collapse' : 'Expand',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                  height: 1.1,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBrowseClassesList(ClientLocationStore locationStore) {
    return ListView.separated(
      key: const PageStorageKey<String>('browse-classes'),
      padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
      itemCount: _derivedDayClasses.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, index) {
        final c = _derivedDayClasses[index];
        final session = _ownerSessionFromExplore(c);
        final loc = (c.locationName ?? '').trim();
        final subtitle = loc.isNotEmpty ? loc : c.studioName;
        final trainerLine = scheduleTrainerLineOrNull(session, null);
        return OwnerDailyScheduleSessionCard(
          session: session,
          subtitleLabel: subtitle,
          showLocationPin: loc.isNotEmpty,
          trainerLine: trainerLine,
          showSubtitleLeadingIcon: subtitle.isNotEmpty,
          dimPastSessions: false,
          trailingPriceLabel:
              c.price != null ? formatVnd(c.price!) : null,
          trailingPriceColor: AppColors.textPrimary,
          bookActionLabel: 'Book',
          onBookAgain: () => _openExploreClassDetail(c),
          onTap: () => _openExploreClassDetail(c),
        );
      },
    );
  }

  Widget _buildBrowseStudiosList(
    ClientLocationStore locationStore,
    ClientFavoritesStore favStore,
  ) {
    return ListView.separated(
      key: const PageStorageKey<String>('browse-studios'),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      itemCount: _derivedVisibleStudios.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, index) {
        final s = _derivedVisibleStudios[index];
        final todayClasses =
            _derivedTodayClassesByStudio[s.id] ?? const [];
        return BrowseStudioListCard(
          studio: s,
          todayClasses: todayClasses,
          trainingCategories: _trainingCategories,
          distanceLabel: _distanceLabel(
            _resolvedDistanceKmMemo(s, locationStore),
          ),
          isFavorite: favStore.isFavorite(s.id),
          onTap: () {
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => PublicStudioDetailScreen(studioId: s.id),
              ),
            );
          },
          onToggleFavorite: () => _toggleBrowseStudioFavorite(s),
          onClassTap: _openExploreClassDetail,
        );
      },
    );
  }

  Widget _buildBrowseModeToggler() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: AppColors.backgroundPrimary,
          borderRadius: BorderRadius.circular(_browseModeOuterRadius),
        ),
        child: Padding(
          padding: const EdgeInsets.all(_browseModeInset),
          child: AnimatedBuilder(
            animation: _browseModeController,
            builder: (context, _) {
              final fraction = _browseModeController.value.clamp(0.0, 1.0);
              final classesBlend = (1 - fraction).clamp(0.0, 1.0);
              final studiosBlend = fraction;
              return LayoutBuilder(
                builder: (context, constraints) {
                  final tabWidth = constraints.maxWidth / 2;
                  return SizedBox(
                    height: _browseModeInnerHeight,
                    child: Stack(
                      clipBehavior: Clip.none,
                      children: [
                        Transform.translate(
                          offset: Offset(fraction * tabWidth, 0),
                          child: Container(
                            width: tabWidth,
                            height: _browseModeInnerHeight,
                            decoration: BoxDecoration(
                              color: AppColors.primary500,
                              borderRadius: BorderRadius.circular(
                                _browseModeInnerRadius,
                              ),
                            ),
                          ),
                        ),
                        Row(
                          children: [
                            _browseModeTab(
                              label: 'Classes',
                              iconAsset: 'assets/icons/icon-clients.svg',
                              count: _derivedDayClassesCount,
                              emphasis: classesBlend,
                              onTap: () => _setBrowseShowClasses(true),
                            ),
                            _browseModeTab(
                              label: 'Studios',
                              iconAsset: 'assets/icons/icon-studio.svg',
                              count: _derivedVisibleStudiosCount,
                              emphasis: studiosBlend,
                              onTap: () => _setBrowseShowClasses(false),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _browseModeTab({
    required String label,
    required String iconAsset,
    required int count,
    required double emphasis,
    required VoidCallback onTap,
  }) {
    final fg = Color.lerp(AppColors.textPrimary, Colors.white, emphasis)!;
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              SvgPicture.asset(
                iconAsset,
                width: 16,
                height: 16,
                colorFilter: ColorFilter.mode(fg, BlendMode.srcIn),
              ),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  '$label · $count',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                    height: 1.1,
                    color: fg,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final localeCode = locale.localeCode;
    final locationStore = context.watch<ClientLocationStore>();
    final locationLabel = locationStore.displayLabel(
      locale.t('clientHome.setLocation'),
    );
    final favStore = context.watch<ClientFavoritesStore>();
    _ensureDerivedLists();

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _loadError != null
            ? LoadErrorView(
                message: _loadError!,
                onRetry: _loadExplore,
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 18, 16, 0),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(10),
                      onTap: _openLocationPicker,
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
                            color: _browseLocationBlue,
                          ),
                        ],
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        const Expanded(
                          child: Text(
                            'Browse',
                            style: TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                              letterSpacing: -0.5,
                              height: 1.1,
                            ),
                          ),
                        ),
                        _browseTodayButton(),
                        const SizedBox(width: 8),
                        _browseExpandButton(),
                      ],
                    ),
                  ),
                  if (!_isMonthExpanded)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: _buildDayStrip(),
                    )
                  else
                    Padding(
                      padding: const EdgeInsets.fromLTRB(12, 0, 12, 0),
                      child: ValueListenableBuilder<DateTime>(
                        valueListenable: _stripDayNotifier,
                        builder: (context, stripDay, _) =>
                            _buildBrowseMonthExpanded(stripDay),
                      ),
                    ),
                  const SizedBox(height: 28),
                  Padding(
                    padding: screenPaddingH(),
                    child: TextField(
                      controller: _searchController,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 14,
                      ),
                      decoration: InputDecoration(
                        hintText: locale.t('clientHome.searchHint'),
                        hintStyle: const TextStyle(
                          color: AppColors.textTertiary,
                          fontSize: 14,
                        ),
                        isDense: true,
                        prefixIcon: const AppSearchPrefixIcon(leftMargin: 12),
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
                            color: AppColors.primary500.withValues(alpha: 0.45),
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
                            color: AppColors.primary500.withValues(alpha: 0.45),
                          ),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          vertical: 12,
                          horizontal: 12,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  _buildBrowseModeToggler(),
                  const SizedBox(height: 10),
                  SizedBox(
                    height: 40,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      children: [
                        ClientExploreFilterChip(
                          label: _typesChipLabel(localeCode),
                          isActive: _selectedCategoryId != null,
                          onTap: _openCategorySheet,
                        ),
                        ClientExploreFilterChip(
                          label: _timeFilterChipLabel,
                          isActive:
                              _hasActiveTimeFilter || _timePeriods.isNotEmpty,
                          onTap: _openTimeFilterSheet,
                        ),
                        ClientExploreFilterChip(
                          label: _distanceChipLabel,
                          isActive: _distanceFilter != 'auto',
                          onTap: _openDistanceSheet,
                        ),
                        ClientExploreFilterChip(
                          label: _sortChipLabel,
                          isActive: _sortBy != 'recommended',
                          onTap: _openSortSheet,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  Expanded(
                    child: ValueListenableBuilder<bool>(
                      valueListenable: _browseShowClasses,
                      builder: (context, showClasses, _) {
                        return IndexedStack(
                          index: showClasses ? 0 : 1,
                          sizing: StackFit.expand,
                          children: [
                            _buildBrowseClassesList(locationStore),
                            _buildBrowseStudiosList(locationStore, favStore),
                          ],
                        );
                      },
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
