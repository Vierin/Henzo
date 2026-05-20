import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../widgets/common/henzo_modal.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../models/training_category_option.dart';
import '../../services/api_client.dart';
import '../../services/cache/client_nearby_cache.dart';
import '../../services/dashboard_api_service.dart';
import '../../utils/formatters.dart';
import '../../utils/nearby_payload.dart';
import '../../widgets/dashboard/owner_daily_schedule_session_card.dart';
import '../../widgets/public/cached_salon_network_image.dart';
import '../../widgets/schedule/calendar_day_pill.dart';
import '../location_picker_screen.dart';
import '../public_class_detail_screen.dart';
import '../public_studio_detail_screen.dart';
import 'client_explore_models.dart';
import '../../widgets/client/client_explore_filter_chip.dart';
import '../../widgets/training/training_category_color_chip.dart';

const int _kExploreHorizonDays = 31;
const Duration _kExploreStripDebounce = Duration(milliseconds: 1400);

/// Default ?Activities by start time? on Browse: 05:00?22:00.
const RangeValues _kExploreDefaultTimeRange = RangeValues(300, 1320);
const int _kExploreDefaultTimeStartMin = 300;
const int _kExploreDefaultTimeEndMin = 1320;

class ClientSearchScreen extends StatefulWidget {
  const ClientSearchScreen({super.key});

  @override
  State<ClientSearchScreen> createState() => ClientSearchScreenState();
}

class ClientSearchScreenState extends State<ClientSearchScreen> {
  static const _cityKey = 'client_city';
  static const _latKey = 'client_lat';
  static const _lonKey = 'client_lon';
  bool _loading = true;
  bool _showClasses = true;
  late DateTime _selectedDay;
  late final ValueNotifier<DateTime> _stripDayNotifier;
  late final PageController _dayPagerController;
  final ValueNotifier<DateTime> _stripPagerDayNotifier = ValueNotifier(
    DateTime.now(),
  );
  Timer? _stripScheduleDebounce;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  String _locationLabel = 'Set location';
  double? _selectedLat;
  double? _selectedLon;
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
  Map<String, ExploreClassItem?> _derivedFirstClassByStudio = const {};
  int _derivedDayClassesCount = 0;
  int _derivedVisibleStudiosCount = 0;
  final Map<String, double?> _distanceKmMemo = {};
  String _distanceMemoLocationKey = '';

  @override
  void initState() {
    super.initState();
    final today = _calendarDateOnly(DateTime.now());
    _selectedDay = today;
    _stripDayNotifier = ValueNotifier<DateTime>(today);
    _stripPagerDayNotifier.value = today;
    _dayPagerController = PageController(
      initialPage: 0,
      viewportFraction: 1 / 7,
    );
    _searchController.addListener(_onSearchChanged);
    _loadSavedLocationOnly();
  }

  @override
  void dispose() {
    _clearStripScheduleDebounceTimer();
    _searchController.removeListener(_onSearchChanged);
    _searchController.dispose();
    _stripDayNotifier.dispose();
    _stripPagerDayNotifier.dispose();
    _dayPagerController.dispose();
    super.dispose();
  }

  void _clearStripScheduleDebounceTimer() {
    _stripScheduleDebounce?.cancel();
    _stripScheduleDebounce = null;
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

  void _debounceExploreDay(DateTime day) {
    _clearStripScheduleDebounceTimer();
    _stripScheduleDebounce = Timer(_kExploreStripDebounce, () {
      if (!mounted) return;
      _applyExploreDay(day);
      _stripScheduleDebounce = null;
    });
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

  int _sessionsCountForDay(DateTime day) {
    return _classes.where((c) {
      if (!CalendarDayPill.isSameDay(c.startsAt, day)) return false;
      return _classMatchesCategory(c);
    }).length;
  }

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
    final picked = await Navigator.of(context).push<LocationPickerResult>(
      MaterialPageRoute(
        builder: (_) => LocationPickerScreen(
          initialCity: _locationLabel == 'Set location' ? '' : _locationLabel,
        ),
      ),
    );
    if (picked == null || picked.city.trim().isEmpty || !mounted) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_cityKey, picked.city.trim());
    if (picked.lat != null && picked.lon != null) {
      await prefs.setDouble(_latKey, picked.lat!);
      await prefs.setDouble(_lonKey, picked.lon!);
    }
    ClientNearbyCache.clear();
    setState(() {
      _locationLabel = picked.city.trim();
      _selectedLat = picked.lat;
      _selectedLon = picked.lon;
      _derivedInputsHash = 0;
      _distanceKmMemo.clear();
    });
    await _loadExplore();
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
      _distanceKmMemo.clear();
      _derivedInputsHash = 0;
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

        studios.add(
          ExploreStudioItem(
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
        _derivedInputsHash = 0;
        _distanceKmMemo.clear();
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
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

  String _distanceLabel(double? km) {
    if (km == null) return '';
    final text = km.toStringAsFixed(2).replaceAll('.', ',');
    return '$text km';
  }

  double? _resolvedDistanceKm(ExploreStudioItem studio) {
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

  void _syncDistanceMemoLocation() {
    final k =
        '${_selectedLat?.toStringAsFixed(5)}_${_selectedLon?.toStringAsFixed(5)}';
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

    final firstBy = <String, ExploreClassItem?>{};
    for (final s in _derivedVisibleStudios) {
      ExploreClassItem? first;
      for (final c in _classes) {
        if (c.studioId != s.id) continue;
        final d = c.startsAt;
        if (!CalendarDayPill.isSameDay(d, selectedDate)) continue;
        if (!_isClassInSelectedPeriods(c.startsAt)) continue;
        if (!_isClassInTimeRange(c.startsAt)) continue;
        if (!_classMatchesCategory(c)) continue;
        if (first == null || c.startsAt.isBefore(first.startsAt)) {
          first = c;
        }
      }
      firstBy[s.id] = first;
    }
    _derivedFirstClassByStudio = firstBy;
  }

  double? _resolvedDistanceKmMemo(ExploreStudioItem studio) {
    _syncDistanceMemoLocation();
    if (_distanceKmMemo.containsKey(studio.id)) {
      return _distanceKmMemo[studio.id];
    }
    final v = _resolvedDistanceKm(studio);
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
                                  onTap: () => setModalState(
                                    () => tempSelection = -1,
                                  ),
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
    return SizedBox(
      height: 86,
      child: NotificationListener<ScrollNotification>(
        onNotification: (ScrollNotification n) {
          if (n.metrics.axis != Axis.horizontal) return false;
          if (!_dayPagerController.hasClients) return false;
          final page = _dayPagerController.page;
          if (page == null) return false;
          final index = page.round().clamp(0, _kExploreHorizonDays - 1);
          final day = _exploreDayAt(index);
          final normalized = _calendarDateOnly(day);
          if (_stripPagerDayNotifier.value == normalized) return false;
          _stripPagerDayNotifier.value = normalized;
          return false;
        },
        child: PageView.builder(
          controller: _dayPagerController,
          physics: const SmoothDayPageScrollPhysics(),
          padEnds: false,
          itemCount: _kExploreHorizonDays,
          onPageChanged: (index) {
            final day = _exploreDayAt(index);
            final normalized = _calendarDateOnly(day);
            if (_stripPagerDayNotifier.value != normalized) {
              _stripPagerDayNotifier.value = normalized;
            }
            if (CalendarDayPill.isSameDay(day, _stripDayNotifier.value) &&
                CalendarDayPill.isSameDay(day, _selectedDay)) {
              return;
            }
            _debounceExploreDay(normalized);
          },
          itemBuilder: (_, index) {
            final day = _exploreDayAt(index);
            final isToday = CalendarDayPill.isSameDay(day, DateTime.now());
            return ValueListenableBuilder<DateTime>(
              valueListenable: _stripDayNotifier,
              builder: (context, stripDay, _) {
                final selected = CalendarDayPill.isSameDay(day, stripDay);
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 3),
                  child: CalendarDayPill(
                    day: day,
                    selected: selected,
                    sessionsCount: _sessionsCountForDay(day),
                    isToday: isToday,
                    showBorder: false,
                    highlightTodayWhenUnselected: false,
                    onTap: () {
                      _clearStripScheduleDebounceTimer();
                      _applyExploreDay(day);
                    },
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }

  Widget _browseModeTab({
    required String label,
    required String iconAsset,
    required int count,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          margin: const EdgeInsets.all(3),
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
          decoration: BoxDecoration(
            color: selected ? AppColors.primary50 : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              SvgPicture.asset(
                iconAsset,
                width: 18,
                height: 18,
                colorFilter: ColorFilter.mode(
                  selected ? AppColors.primary500 : AppColors.textSecondary,
                  BlendMode.srcIn,
                ),
              ),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  '$label $count',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                    color: selected
                        ? AppColors.primary500
                        : AppColors.textSecondary,
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
    final localeCode = context.watch<LocaleProvider>().localeCode;
    _ensureDerivedLists();

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 12, 4),
                    child: Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'Browse',
                            style: TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textPrimary,
                              letterSpacing: -0.5,
                            ),
                          ),
                        ),
                        Material(
                          color: Colors.transparent,
                          child: InkWell(
                            borderRadius: BorderRadius.circular(12),
                            onTap: _openLocationPicker,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 6,
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  SvgPicture.asset(
                                    'assets/icons/icon-pin.svg',
                                    width: 16,
                                    height: 16,
                                    colorFilter: const ColorFilter.mode(
                                      AppColors.primary500,
                                      BlendMode.srcIn,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  ConstrainedBox(
                                    constraints: const BoxConstraints(
                                      maxWidth: 140,
                                    ),
                                    child: Text(
                                      _locationLabel,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                  ),
                                  const Icon(
                                    Icons.keyboard_arrow_down,
                                    size: 18,
                                    color: AppColors.textSecondary,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: _buildDayStrip(),
                  ),
                  const SizedBox(height: 10),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Container(
                      decoration: BoxDecoration(
                        color: AppColors.backgroundPrimary,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          const SizedBox(width: 12),
                          SvgPicture.asset(
                            'assets/icons/icon-search.svg',
                            width: 18,
                            height: 18,
                            colorFilter: const ColorFilter.mode(
                              AppColors.textSecondary,
                              BlendMode.srcIn,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextField(
                              controller: _searchController,
                              style: const TextStyle(
                                color: AppColors.textPrimary,
                              ),
                              decoration: const InputDecoration(
                                hintText: 'Search classes or studios...',
                                hintStyle: TextStyle(
                                  color: AppColors.textSecondary,
                                ),
                                filled: true,
                                fillColor: Colors.transparent,
                                border: InputBorder.none,
                                enabledBorder: InputBorder.none,
                                focusedBorder: InputBorder.none,
                                disabledBorder: InputBorder.none,
                                errorBorder: InputBorder.none,
                                focusedErrorBorder: InputBorder.none,
                                isDense: true,
                                contentPadding: EdgeInsets.symmetric(
                                  vertical: 12,
                                ),
                              ),
                            ),
                          ),
                          IconButton(
                            onPressed: _openAllFiltersSheet,
                            icon: const Icon(
                              Icons.tune,
                              color: AppColors.primary500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Container(
                      decoration: BoxDecoration(
                        color: AppColors.backgroundPrimary,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          _browseModeTab(
                            label: 'Classes',
                            iconAsset: 'assets/icons/icon-schedule.svg',
                            count: _derivedDayClassesCount,
                            selected: _showClasses,
                            onTap: () => setState(() => _showClasses = true),
                          ),
                          _browseModeTab(
                            label: 'Studios',
                            iconAsset: 'assets/icons/icon-clients.svg',
                            count: _derivedVisibleStudiosCount,
                            selected: !_showClasses,
                            onTap: () => setState(() => _showClasses = false),
                          ),
                        ],
                      ),
                    ),
                  ),
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
                    child: _showClasses
                        ? ListView.separated(
                            padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
                            itemCount: _derivedDayClasses.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 8),
                            itemBuilder: (_, index) {
                              final c = _derivedDayClasses[index];
                              final session = _ownerSessionFromExplore(c);
                              final multi = c.studioLocationCount > 1;
                              final loc = (c.locationName ?? '').trim();
                              final showPin = multi && loc.isNotEmpty;
                              final subtitle = showPin ? loc : c.studioName;
                              final trainerLine = scheduleTrainerLineOrNull(
                                session,
                                null,
                              );
                              return OwnerDailyScheduleSessionCard(
                                session: session,
                                subtitleLabel: subtitle,
                                showLocationPin: showPin,
                                trainerLine: trainerLine,
                                showSubtitleLeadingIcon: showPin,
                                dimPastSessions: false,
                                trailingPriceLabel: c.price != null
                                    ? formatVnd(c.price!)
                                    : null,
                                bookActionLabel: 'Book',
                                onBookAgain: () => _openExploreClassDetail(c),
                                onTap: () => _openExploreClassDetail(c),
                              );
                            },
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 6,
                            ),
                            itemCount: _derivedVisibleStudios.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 8),
                            itemBuilder: (_, index) {
                              final s = _derivedVisibleStudios[index];
                              final firstToday =
                                  _derivedFirstClassByStudio[s.id];
                              final distanceText = _distanceLabel(
                                _resolvedDistanceKmMemo(s),
                              );
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
                                                  if (s.address
                                                      .trim()
                                                      .isNotEmpty)
                                                    Text(
                                                      s.address.trim(),
                                                      maxLines: 1,
                                                      overflow:
                                                          TextOverflow.ellipsis,
                                                      style: const TextStyle(
                                                        color: AppColors
                                                            .textSecondary,
                                                      ),
                                                    ),
                                                  const SizedBox(height: 6),
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
                                                          distanceText
                                                                  .isNotEmpty
                                                              ? '$distanceText  ?  ${s.rating.toStringAsFixed(1)}  ${s.reviewCount} reviews'
                                                              : '${s.rating.toStringAsFixed(1)}  ${s.reviewCount} reviews',
                                                          style: const TextStyle(
                                                            color: AppColors
                                                                .textSecondary,
                                                          ),
                                                        ),
                                                      ],
                                                    ),
                                                  if (s.rating <= 0 &&
                                                      distanceText.isNotEmpty)
                                                    Text(
                                                      distanceText,
                                                      style: const TextStyle(
                                                        color: AppColors
                                                            .textSecondary,
                                                      ),
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
                                                        formatTime24(
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
                                                  formatVnd(firstToday.price!),
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
}
