import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import '../../models/training_category_option.dart';
import '../../services/auth_service.dart';
import '../../services/cache/training_categories_cache.dart';
import '../../services/client_location_store.dart';
import '../../services/client_favorites_mutations.dart';
import '../../services/client_favorites_store.dart';
import '../../utils/formatters.dart';
import '../../utils/load_error_message.dart';
import '../../widgets/schedule/calendar_day_pill.dart';
import '../location_picker_screen.dart';
import '../public_class_detail_screen.dart';
import '../public_studio_detail_screen.dart';
import 'browse/client_browse_filter_sheets.dart';
import 'browse/client_browse_results_slivers.dart';
import 'browse/client_browse_widgets.dart';
import 'browse/client_explore_dates.dart';
import 'browse/client_explore_derived_lists.dart';
import 'browse/client_explore_studio_utils.dart';
import 'client_explore_models.dart';
import 'client_explore_repository.dart';
import 'client_search_constants.dart';
import '../../widgets/app_search_prefix_icon.dart';
import '../../widgets/client/browse_day_pill.dart';
import '../../widgets/client/browse_collapsing_header.dart';
import '../../widgets/client/client_explore_filter_chip.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

class ClientSearchScreen extends StatefulWidget {
  const ClientSearchScreen({super.key});

  @override
  State<ClientSearchScreen> createState() => ClientSearchScreenState();
}

class ClientSearchScreenState extends State<ClientSearchScreen>
    with SingleTickerProviderStateMixin {

  bool _loading = true;
  String? _loadError;

  bool get _isBrowseResultsLoading => _loading && _studios.isEmpty;
  final ValueNotifier<bool> _browseShowClasses = ValueNotifier<bool>(true);
  late final AnimationController _browseModeController;
  bool _isMonthExpanded = false;
  late DateTime _selectedDay;
  late final ValueNotifier<DateTime> _stripDayNotifier;
  late final ScrollController _dayStripScrollController;
  late final ScrollController _browseScrollController;
  final FocusNode _searchFocusNode = FocusNode();
  double? _browseStripViewportWidth;
  final CalendarDayStripScrollHaptics _dayStripHaptics =
      CalendarDayStripScrollHaptics();
  final ValueNotifier<DateTime> _stripPagerDayNotifier = ValueNotifier(
    DateTime.now(),
  );
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  ClientLocationStore? _locationStore;
  String _distanceFilter = 'auto';
  String _sortBy = 'recommended';
  final Set<String> _timePeriods = <String>{};
  final Set<String> _selectedLanguages = <String>{};

  /// Minutes from midnight; timeline starts at 05:00, max 24:00.
  /// Default active start-time window: 09:00 - 20:00.
  RangeValues _timeRange = kExploreDefaultTimeRange;
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
    final today = calendarDateOnly(DateTime.now());
    _selectedDay = today;
    _stripDayNotifier = ValueNotifier<DateTime>(today);
    _stripPagerDayNotifier.value = today;
    _dayStripScrollController = ScrollController();
    _browseScrollController = ScrollController();
    _searchController.addListener(_onSearchChanged);
    _browseModeController = AnimationController(
      vsync: this,
      value: 0,
      duration: kBrowseModeAnimDuration,
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
    _browseScrollController.dispose();
    _searchFocusNode.dispose();
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
      duration: kBrowseModeAnimDuration,
      curve: Curves.easeOutCubic,
    );
  }

  void _applyExploreDay(DateTime day) {
    final normalized = calendarDateOnly(day);
    _stripDayNotifier.value = normalized;
    _stripPagerDayNotifier.value = normalized;
    if (CalendarDayPill.isSameDay(normalized, _selectedDay)) return;
    setState(() {
      _selectedDay = normalized;
      _derivedInputsHash = 0;
    });
  }

  double _browsePillWidth(double viewportWidth) =>
      browsePillWidth(viewportWidth);

  double _browseDayStride(double viewportWidth) => browseDayStride(viewportWidth);

  void _scrollBrowseStripToIndex(int index, {bool animate = false}) {
    void tryScroll() {
      final w = _browseStripViewportWidth;
      if (w == null || !_dayStripScrollController.hasClients) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) tryScroll();
        });
        return;
      }
      final raw = index * _browseDayStride(w);
      final maxExtent = _dayStripScrollController.position.maxScrollExtent;
      final offset = raw.clamp(0.0, maxExtent);
      final clampedIndex = index.clamp(0, kExploreHorizonDays - 1);
      if (animate) {
        _dayStripHaptics.animateScroll(
          _dayStripScrollController,
          offset: offset,
          index: clampedIndex,
        );
      } else {
        _dayStripHaptics.jumpScroll(
          _dayStripScrollController,
          offset: offset,
          index: clampedIndex,
        );
      }
    }

    tryScroll();
  }

  void _goToToday() {
    final today = calendarDateOnly(DateTime.now());
    _scrollBrowseStripToIndex(
      _browseStripIndexForWeekStart(today),
      animate: true,
    );
    _applyExploreDay(today);
  }

  /// Bottom nav Browse: current week from Monday, today selected.
  void resetToCurrentWeek() {
    if (!mounted) return;
    if (_isMonthExpanded) {
      setState(() => _isMonthExpanded = false);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _goToToday();
      });
      return;
    }
    _goToToday();
  }

  int _browseStripIndexForWeekStart(DateTime day) =>
      browseStripIndexForWeekStart(day);

  void _jumpBrowseToDay(DateTime day, {bool afterBuild = false}) {
    final normalized = calendarDateOnly(day);
    if (!isDayInExploreHorizon(normalized)) return;
    _applyExploreDay(normalized);

    void scroll() => _scrollBrowseStripToIndex(
      _browseStripIndexForWeekStart(normalized),
      animate: true,
    );

    if (afterBuild) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        scroll();
      });
    } else {
      scroll();
    }
  }

  bool _canShiftBrowseMonth(int deltaMonths) =>
      canShiftBrowseMonth(_stripDayNotifier.value, deltaMonths);

  void _shiftBrowseMonth(int deltaMonths) {
    if (!_canShiftBrowseMonth(deltaMonths)) return;

    final strip = _stripDayNotifier.value;
    final targetMonth = DateTime(strip.year, strip.month + deltaMonths, 1);
    final daysInTargetMonth = DateUtils.getDaysInMonth(
      targetMonth.year,
      targetMonth.month,
    );
    final targetDay = strip.day.clamp(1, daysInTargetMonth);
    final next = calendarDateOnly(
      DateTime(targetMonth.year, targetMonth.month, targetDay),
    );
    _stripDayNotifier.value = next;
    _stripPagerDayNotifier.value = next;
    if (!isDayInExploreHorizon(next)) return;
    if (CalendarDayPill.isSameDay(next, _selectedDay)) return;
    setState(() {
      _selectedDay = next;
      _derivedInputsHash = 0;
    });
    _scrollBrowseStripToIndex(_browseStripIndexForWeekStart(next));
  }

  /// Keeps the strip layout as before; only nudges scroll so the pill is tappable.
  void _selectBrowseStripDay(int index, DateTime day) {
    final normalized = calendarDateOnly(day);
    if (!isDayInExploreHorizon(normalized)) return;
    _applyExploreDay(normalized);

    final w = _browseStripViewportWidth;
    if (w == null || !_dayStripScrollController.hasClients) return;

    final stride = _browseDayStride(w);
    final pillWidth = _browsePillWidth(w);
    final itemStart = index * stride;
    final itemEnd = itemStart + pillWidth;
    final offset = _dayStripScrollController.offset;
    final viewportEnd = offset + w;
    final maxExtent = _dayStripScrollController.position.maxScrollExtent;

    double? target;
    if (itemEnd > viewportEnd + 0.5) {
      target = itemEnd - w;
    } else if (itemStart < offset - 0.5) {
      target = itemStart;
    }
    if (target == null) return;

    final clampedTarget = target.clamp(0.0, maxExtent);
    final snapIndex = (clampedTarget / stride).round().clamp(
      0,
      kExploreHorizonDays - 1,
    );
    _dayStripHaptics.animateScroll(
      _dayStripScrollController,
      offset: clampedTarget,
      index: snapIndex,
      duration: const Duration(milliseconds: 200),
    );
  }

  void _syncBrowseStripPagerToSelectedDay() {
    _scrollBrowseStripToIndex(_browseStripIndexForWeekStart(_selectedDay));
    _stripPagerDayNotifier.value = _selectedDay;
  }

  void _onBrowseDayStripScrolled() {
    final w = _browseStripViewportWidth;
    if (w == null || !_dayStripScrollController.hasClients) return;
    final stride = _browseDayStride(w);
    if (stride <= 0) return;
    final index = (_dayStripScrollController.offset / stride).round().clamp(
      0,
      kExploreHorizonDays - 1,
    );
    _dayStripHaptics.onScrollIndex(index);
    final day = exploreDayAt(index);
    final normalized = calendarDateOnly(day);
    if (_stripPagerDayNotifier.value == normalized) return;
    _stripPagerDayNotifier.value = normalized;
  }

  List<DateTime?> _browseMonthCells(DateTime monthDate) =>
      browseMonthCells(monthDate);

  TextStyle get _browseMonthYearStyle => TextStyle(
    fontSize: 14.sp,
    fontWeight: FontWeight.w500,
    letterSpacing: -0.3,
    color: AppColors.textPrimary,
    height: 1.1,
  );

  Widget _browseCollapsedMonthLabel(String localeCode) {
    return ValueListenableBuilder<DateTime>(
      valueListenable: _stripPagerDayNotifier,
      builder: (context, pagerDay, _) {
        return Align(
          alignment: Alignment.centerRight,
          child: Text(
            CalendarDayPill.monthYearUpper(pagerDay, localeCode),
            style: _browseMonthYearStyle,
          ),
        );
      },
    );
  }

  Widget _buildBrowseMonthExpanded(DateTime monthAnchor, String localeCode) {
    final monthStart = DateTime(monthAnchor.year, monthAnchor.month, 1);
    final cells = _browseMonthCells(monthStart);
    final dow = calendarWeekdayHeaders(localeCode);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 16),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Align(
            alignment: Alignment.centerRight,
            child: Text(
              CalendarDayPill.monthYearUpper(monthAnchor, localeCode),
              style: _browseMonthYearStyle,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: List.generate(
              7,
              (i) => Expanded(
                child: Center(
                  child: Text(
                    dow[i],
                    style: TextStyle(
                      fontSize: 11.sp,
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
                  final inHorizon = isDayInExploreHorizon(day);
                  final selected = CalendarDayPill.isSameDay(day, selectedDay);
                  return Center(
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        customBorder: const CircleBorder(),
                        onTap: inHorizon
                            ? () {
                                setState(() => _isMonthExpanded = false);
                                _jumpBrowseToDay(day, afterBuild: true);
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
                            ),
                            child: Text(
                              '${day.day}',
                              style: TextStyle(
                                fontSize: 14.sp,
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

  String _typesChipLabel(String localeCode) {
    final tr = context.read<LocaleProvider>().t;
    final id = _selectedCategoryId;
    if (id == null) return tr('clientHome.filterTypes');
    return ClientExploreDerivedLists.categoryOptionById(
          _trainingCategories,
          id,
        )?.label(localeCode) ??
        tr('clientHome.filterTypes');
  }

  String get _timeFilterChipLabel {
    if (_timePeriods.length == 1 && _timePeriods.contains('morning')) {
      return context.read<LocaleProvider>().t('clientHome.timePeriodMorning');
    }
    if (_timePeriods.length == 1 && _timePeriods.contains('afternoon')) {
      return context.read<LocaleProvider>().t('clientHome.timePeriodAfternoon');
    }
    if (_timePeriods.length == 1 && _timePeriods.contains('evening')) {
      return context.read<LocaleProvider>().t('clientHome.timePeriodEvening');
    }
    if (_hasActiveTimeFilter) return _timeChipLabel;
    return context.read<LocaleProvider>().t('clientHome.filterTime');
  }

  String get _distanceChipLabel {
    final tr = context.read<LocaleProvider>().t;
    switch (_distanceFilter) {
      case '5':
        return tr('clientHome.distance5km');
      case '10':
        return tr('clientHome.distance10km');
      case '15':
        return tr('clientHome.distance15km');
      case '30+':
        return tr('clientHome.distance30plus');
      case 'auto':
      default:
        return tr('clientHome.filterDistance');
    }
  }

  String get _sortChipLabel {
    final tr = context.read<LocaleProvider>().t;
    switch (_sortBy) {
      case 'distance':
        return tr('clientHome.sortNearest');
      case 'ratings':
        return tr('clientHome.sortRatings');
      case 'recommended':
      default:
        return tr('clientHome.filterSort');
    }
  }

  String get _languageChipLabel {
    final tr = context.read<LocaleProvider>().t;
    if (_selectedLanguages.isEmpty) {
      return tr('clientHome.filterLanguage');
    }
    final sorted = kTrainingLanguageCodes
        .where(_selectedLanguages.contains)
        .toList(growable: false);
    if (sorted.isEmpty) return tr('clientHome.filterLanguage');
    final label = browseTrainingLanguageLabel(sorted.first, tr);
    if (sorted.length == 1) return label;
    return '$label +${sorted.length - 1}';
  }

  Future<void> _openLocationPicker() async {
    final loc = context.read<ClientLocationStore>();
    final picked = await Navigator.of(context).push<LocationPickerResult>(
      MaterialPageRoute(
        builder: (_) => LocationPickerScreen(initialCity: loc.displayLabel('')),
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

  Future<List<ExploreClassItem>> _fetchExploreClassesForStudio(
    ExploreStudioItem studio,
    String fromQuery,
    String toQuery,
  ) async {
    final defaultClassName = context.read<LocaleProvider>().t('common.class');
    return ClientExploreRepository.loadStudioClasses(
      studio: studio,
      fromQuery: fromQuery,
      toQuery: toQuery,
      defaultClassName: defaultClassName,
    );
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
              if (studio.categoryNames.isNotEmpty)
                'categoryNames': studio.categoryNames,
            },
          );
    if (!mounted) return;
    setState(() => _favoriteLoadingIds.remove(studio.id));
    if (!ok) {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            content: Text(
              context.read<LocaleProvider>().t(
                'clientHome.failedToUpdateFavorites',
              ),
            ),
          ),
        );
    }
  }

  Future<void> _loadExplore() async {
    if (!mounted) return;
    final loc = context.read<ClientLocationStore>();
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      if (!hasClientCoordinates(loc)) {
        if (!mounted) return;
        setState(() {
          _studios = const [];
          _classes = const [];
          _loading = false;
          _loadError = null;
          _derivedInputsHash = 0;
          _distanceKmMemo.clear();
        });
        return;
      }

      final radiusKm = exploreRadiusKm(_distanceFilter);
      final studios = await ClientExploreRepository.loadStudiosNearby(
        lat: loc.lat!,
        lon: loc.lon!,
        radiusKm: radiusKm,
      );

      studios.removeWhere((s) => !isStudioWithinDistanceFilter(studio: s, loc: loc, distanceFilter: _distanceFilter));

      final classes = <ExploreClassItem>[];
      final from = startOfLocalDay(DateTime.now());
      final to = endOfLocalDay(from.add(const Duration(days: 30)));
      final toQuery = Uri.encodeComponent(to.toUtc().toIso8601String());
      final fromQuery = Uri.encodeComponent(from.toUtc().toIso8601String());
      const concurrency = 4;
      for (var i = 0; i < studios.length; i += concurrency) {
        final end = i + concurrency > studios.length
            ? studios.length
            : i + concurrency;
        final batch = studios.sublist(i, end);
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

      applyStudioSortInPlace(studios, sortBy: _sortBy);
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

  void _scrollBrowseHeaderToTop({bool focusSearch = false}) {
    if (!_browseScrollController.hasClients) return;
    _browseScrollController.animateTo(
      0,
      duration: const Duration(milliseconds: 280),
      curve: Curves.easeOutCubic,
    );
    if (focusSearch) {
      _searchFocusNode.requestFocus();
    }
  }

  bool get _hasActiveTimeFilter => ClientExploreDerivedLists.hasActiveTimeFilter(
        timePeriods: _timePeriods,
        timeRange: _timeRange,
      );

  bool get _hasActiveFilters => ClientExploreDerivedLists.hasActiveFilters(
        selectedCategoryId: _selectedCategoryId,
        selectedLanguages: _selectedLanguages,
        timePeriods: _timePeriods,
        timeRange: _timeRange,
        distanceFilter: _distanceFilter,
        sortBy: _sortBy,
      );

  int get _activeFilterCount => ClientExploreDerivedLists.activeFilterCount(
        selectedCategoryId: _selectedCategoryId,
        selectedLanguages: _selectedLanguages,
        timePeriods: _timePeriods,
        timeRange: _timeRange,
        distanceFilter: _distanceFilter,
        sortBy: _sortBy,
      );

  int get _browseHeaderRebuildToken => Object.hash(
        _activeFilterCount,
        _searchQuery,
        _selectedDay,
        _isMonthExpanded,
        _selectedCategoryId,
        _selectedLanguages.length,
        _distanceFilter,
        _sortBy,
        _hasActiveTimeFilter,
        _derivedDayClassesCount,
        _derivedVisibleStudiosCount,
        _browseShowClasses.value,
      );

  double _snapBrowseHeaderHeight(BuildContext context, double value) {
    final dpr = MediaQuery.devicePixelRatioOf(context);
    return (value * dpr).round() / dpr;
  }

  double _browseHeaderExpandedHeight(BuildContext context) {
    const chrome = 15.0 + 44.0 + 10.0 + 48.0 + 10.0 + 38.0 + 8.0;
    final screenW = MediaQuery.sizeOf(context).width;
    if (_isMonthExpanded) {
      final innerW = screenW - 48;
      final tile = (innerW - 24) / 7;
      final gridH = 6 * tile + 5 * 8;
      return _snapBrowseHeaderHeight(
        context,
        12 + 16 + 12 + 16 + 12 + gridH + 16 + chrome,
      );
    }
    final stripW = screenW - 24;
    final stripH = _browsePillWidth(stripW) * 3 / 2;
    return _snapBrowseHeaderHeight(context, 13 + 8 + 8 + stripH + chrome);
  }

  String _browseCompactDateLabel(LocaleProvider locale) =>
      formatBrowseCompactDateLabel(_selectedDay, locale.localeCode);

  String get _timeChipLabel {
    final tr = context.read<LocaleProvider>().t;
    if (!_hasActiveTimeFilter) return tr('clientHome.filterTime');
    return '${formatMinutesSliderLabel(_timeRange.start)} - ${formatMinutesSliderLabel(_timeRange.end)}';
  }

  void _syncDistanceMemoLocation(ClientLocationStore loc) {
    final k = '${loc.lat?.toStringAsFixed(5)}_${loc.lon?.toStringAsFixed(5)}';
    if (k != _distanceMemoLocationKey) {
      _distanceMemoLocationKey = k;
      _distanceKmMemo.clear();
    }
  }

  double? _resolvedDistanceKmMemo(
    ExploreStudioItem studio,
    ClientLocationStore loc,
  ) {
    _syncDistanceMemoLocation(loc);
    if (_distanceKmMemo.containsKey(studio.id)) {
      return _distanceKmMemo[studio.id];
    }
    final v = resolvedStudioDistanceKm(studio, loc);
    _distanceKmMemo[studio.id] = v;
    return v;
  }

  void _ensureDerivedLists() {
    final loc = context.read<ClientLocationStore>();
    final h = ClientExploreDerivedLists.computeInputsHash(
      selectedDay: _selectedDay,
      classesLength: _classes.length,
      studiosLength: _studios.length,
      sortBy: _sortBy,
      distanceFilter: _distanceFilter,
      selectedCategoryId: _selectedCategoryId,
      selectedLanguages: _selectedLanguages,
      searchQuery: _searchQuery,
      timePeriods: _timePeriods,
      timeRange: _timeRange,
      clientLat: loc.lat,
      clientLon: loc.lon,
    );
    if (h == _derivedInputsHash) return;
    _derivedInputsHash = h;
    final derived = ClientExploreDerivedLists.compute(
      studios: _studios,
      classes: _classes,
      selectedDay: _selectedDay,
      loc: loc,
      distanceFilter: _distanceFilter,
      selectedCategoryId: _selectedCategoryId,
      selectedLanguages: _selectedLanguages,
      timePeriods: _timePeriods,
      timeRange: _timeRange,
      searchQuery: _searchQuery,
      trainingCategories: _trainingCategories,
    );
    _derivedDayClasses = derived.dayClasses;
    _derivedVisibleStudios = derived.visibleStudios;
    _derivedTodayClassesByStudio = derived.todayClassesByStudio;
    _derivedDayClassesCount = derived.dayClassesCount;
    _derivedVisibleStudiosCount = derived.visibleStudiosCount;
  }

  Future<void> _ensureTrainingCategoriesLoaded() async {
    if (_trainingCategories.isNotEmpty) return;
    final cats = await context.read<TrainingCategoriesCache>().getCategories();
    if (!mounted) return;
    setState(() => _trainingCategories = cats);
  }

  Future<void> _openCategorySheet() async {
    await _ensureTrainingCategoriesLoaded();
    if (!mounted) return;
    final result = await ClientBrowseFilterSheets.showCategorySheet(
      context,
      categories: _trainingCategories,
      initialCategoryId: _selectedCategoryId,
    );
    if (!mounted || result == null) return;
    setState(() {
      _selectedCategoryId = result < 0 ? null : result;
    });
  }

  Future<void> _openLanguageFilterSheet() async {
    final result = await ClientBrowseFilterSheets.showLanguageSheet(
      context,
      initialLanguages: _selectedLanguages,
    );
    if (!mounted || result == null) return;
    setState(() {
      _selectedLanguages
        ..clear()
        ..addAll(result.map((e) => e.trim().toLowerCase()));
      _derivedInputsHash = 0;
    });
  }

  Future<void> _openTimeFilterSheet() async {
    final result = await ClientBrowseFilterSheets.showTimeSheet(
      context,
      initialPeriods: _timePeriods,
      initialRange: _timeRange,
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

  Future<void> _openSortSheet() async {
    final result = await ClientBrowseFilterSheets.showSortSheet(
      context,
      initialSort: _sortBy,
    );
    if (result == null || !mounted) return;
    setState(() {
      _sortBy = result;
      final sorted = List<ExploreStudioItem>.from(_studios);
      applyStudioSortInPlace(sorted, sortBy: _sortBy);
      _studios = sorted;
      _derivedInputsHash = 0;
    });
  }

  Future<void> _openDistanceSheet() async {
    final result = await ClientBrowseFilterSheets.showDistanceSheet(
      context,
      initialDistance: _distanceFilter,
    );
    if (result == null || !mounted) return;
    final distanceChanged = result != _distanceFilter;
    setState(() => _distanceFilter = result);
    if (distanceChanged) {
      await _loadExplore();
    }
  }

  Future<void> _openAllFiltersSheet() async {
    final result = await ClientBrowseFilterSheets.showAllFiltersSheet(
      context,
      initialSort: _sortBy,
      initialDistance: _distanceFilter,
      initialPeriods: _timePeriods,
      initialLanguages: _selectedLanguages,
      initialRange: _timeRange,
    );
    if (result == null || !mounted) return;
    final sort = (result['sort'] ?? '').toString();
    final distance = (result['distance'] ?? '').toString();
    final periods = result['periods'];
    final languages = result['languages'];
    final start = (result['start'] as num?)?.toDouble();
    final end = (result['end'] as num?)?.toDouble();
    if (sort.isEmpty ||
        distance.isEmpty ||
        periods is! List ||
        languages is! List ||
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
      _selectedLanguages
        ..clear()
        ..addAll(languages.map((e) => e.toString().trim().toLowerCase()));
      _timeRange = RangeValues(start, end);
      if (!distanceChanged) {
        final sorted = List<ExploreStudioItem>.from(_studios);
        applyStudioSortInPlace(sorted, sortBy: _sortBy);
        _studios = sorted;
      }
    });
    if (distanceChanged) {
      await _loadExplore();
    }
  }

  Widget _buildDayStrip(String localeCode) {
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
                    .clamp(0, kExploreHorizonDays - 1);
                final target = (index * stride).clamp(
                  0.0,
                  _dayStripScrollController.position.maxScrollExtent,
                );
                if ((_dayStripScrollController.offset - target).abs() > 0.5) {
                  _dayStripHaptics.animateScroll(
                    _dayStripScrollController,
                    offset: target,
                    index: index,
                    duration: const Duration(milliseconds: 200),
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
              itemCount: kExploreHorizonDays,
              separatorBuilder: (context, index) =>
                  const SizedBox(width: kBrowseDayPillGap),
              itemBuilder: (_, index) {
                final day = exploreDayAt(index);
                return SizedBox(
                  width: pillWidth,
                  child: ValueListenableBuilder<DateTime>(
                    valueListenable: _stripDayNotifier,
                    builder: (context, stripDay, _) {
                      final selected = CalendarDayPill.isSameDay(day, stripDay);
                      return BrowseDayPill(
                        day: day,
                        selected: selected,
                        localeCode: localeCode,
                        onTap: () => _selectBrowseStripDay(index, day),
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
        child: SizedBox(
          height: 30,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Center(
              child: Text(
                context.read<LocaleProvider>().t('common.today'),
                style: TextStyle(
                  fontSize: 13.sp,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                  height: 1.1,
                ),
              ),
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
        child: SizedBox(
          height: 30,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
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
                  _isMonthExpanded
                      ? context.read<LocaleProvider>().t('common.collapse')
                      : context.read<LocaleProvider>().t('common.expand'),
                  style: TextStyle(
                    fontSize: 13.sp,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                    height: 1.1,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBrowseDateSection(String localeCode) {
    if (!_isMonthExpanded) {
      return Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 13, 20, 8),
            child: _browseCollapsedMonthLabel(localeCode),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: _buildDayStrip(localeCode),
          ),
        ],
      );
    }
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 4, 12, 0),
      child: ValueListenableBuilder<DateTime>(
        valueListenable: _stripDayNotifier,
        builder: (context, stripDay, _) {
          return GestureDetector(
            onHorizontalDragEnd: (details) {
              const threshold = 90.0;
              final velocity = details.primaryVelocity ?? 0;
              if (velocity < -threshold) {
                _shiftBrowseMonth(1);
              } else if (velocity > threshold) {
                _shiftBrowseMonth(-1);
              }
            },
            child: _buildBrowseMonthExpanded(stripDay, localeCode),
          );
        },
      ),
    );
  }

  Widget _buildBrowseSearchField(LocaleProvider locale) {
    return Padding(
      padding: screenPaddingH(),
      child: TextField(
        controller: _searchController,
        focusNode: _searchFocusNode,
        style: TextStyle(color: AppColors.textPrimary, fontSize: 14.sp),
        decoration: InputDecoration(
          hintText: locale.t('clientHome.searchHint'),
          hintStyle: TextStyle(color: AppColors.textTertiary, fontSize: 14.sp),
          isDense: true,
          prefixIcon: const AppSearchPrefixIcon(leftMargin: 12),
          prefixIconConstraints: AppSearchPrefixIcon.prefixConstraints(
            leftMargin: 12,
            trailingGap: 4,
          ),
          suffixIcon: BrowseFilterIconButton(
            isActive: _hasActiveFilters,
            onTap: _openAllFiltersSheet,
          ),
          suffixIconConstraints: const BoxConstraints(
            minWidth: 44,
            minHeight: 44,
          ),
          filled: true,
          fillColor: AppColors.backgroundPrimary,
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          contentPadding: const EdgeInsets.symmetric(
            vertical: 12,
            horizontal: 12,
          ),
        ),
      ),
    );
  }

  Widget _buildBrowseFilterChipsRow(String localeCode) {
    return SizedBox(
      height: 36,
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
            label: _languageChipLabel,
            isActive: _selectedLanguages.isNotEmpty,
            onTap: _openLanguageFilterSheet,
          ),
          ClientExploreFilterChip(
            label: _timeFilterChipLabel,
            isActive: _hasActiveTimeFilter || _timePeriods.isNotEmpty,
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
    );
  }

  Widget _buildBrowseExpandedChrome(
    BuildContext context,
    LocaleProvider locale,
  ) {
    final localeCode = locale.localeCode;
    final expandedHeight = _browseHeaderExpandedHeight(context);
    return SizedBox(
      height: expandedHeight,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildBrowseDateSection(localeCode),
          const SizedBox(height: 15),
          _buildBrowseModeToggler(locale),
          const SizedBox(height: 10),
          _buildBrowseSearchField(locale),
          const SizedBox(height: 10),
          _buildBrowseFilterChipsRow(localeCode),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  Widget _buildBrowseCompactStickyBar(LocaleProvider locale) {
    final query = _searchQuery.trim();
    final hint = locale.t('clientHome.searchHint');
    final filterCount = _activeFilterCount;
    // Solid background fills the compact band so the expanded chrome's date
    // pills don't peek through the gaps between the pill / search / filter.
    return ColoredBox(
      color: AppColors.backgroundSecondary,
      child: Padding(
      padding: EdgeInsets.fromLTRB(
        kScreenPaddingHorizontal,
        0,
        kScreenPaddingHorizontal,
        4,
      ),
      child: Row(
        children: [
          BrowseCompactDatePill(
            label: _browseCompactDateLabel(locale),
            onTap: () => _scrollBrowseHeaderToTop(),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Material(
              color: AppColors.backgroundPrimary,
              borderRadius: BorderRadius.circular(999),
              clipBehavior: Clip.antiAlias,
              child: InkWell(
                onTap: () => _scrollBrowseHeaderToTop(focusSearch: true),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 8,
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.search_rounded,
                        size: 18,
                        color: AppColors.textTertiary,
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          query.isEmpty ? hint : query,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 13.sp,
                            fontWeight: FontWeight.w500,
                            color: query.isEmpty
                                ? AppColors.textTertiary
                                : AppColors.textPrimary,
                            height: 1.1,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          BrowseCompactFilterButton(
            count: filterCount,
            onTap: _openAllFiltersSheet,
          ),
        ],
      ),
      ),
    );
  }

  Widget _buildBrowseCollapsingHeaderContent(
    BuildContext context,
    LocaleProvider locale,
    double t,
  ) {
    return Stack(
      clipBehavior: Clip.hardEdge,
      fit: StackFit.expand,
      children: [
        ClipRect(
          child: Align(
            alignment: Alignment.topCenter,
            heightFactor: (1 - t).clamp(0.0, 1.0),
            child: _buildBrowseExpandedChrome(context, locale),
          ),
        ),
        Align(
          alignment: Alignment.bottomCenter,
          child: Opacity(
            opacity: t.clamp(0.0, 1.0),
            child: SizedBox(
              height: kBrowseCollapsedHeaderHeight,
              child: _buildBrowseCompactStickyBar(locale),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildBrowseModeToggler(LocaleProvider locale) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: AppColors.backgroundPrimary,
          borderRadius: BorderRadius.circular(kBrowseModeOuterRadius),
        ),
        child: Padding(
          padding: const EdgeInsets.all(kBrowseModeInset),
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
                    height: kBrowseModeInnerHeight,
                    child: Stack(
                      clipBehavior: Clip.none,
                      children: [
                        Transform.translate(
                          offset: Offset(fraction * tabWidth, 0),
                          child: Container(
                            width: tabWidth,
                            height: kBrowseModeInnerHeight,
                            decoration: BoxDecoration(
                              color: AppColors.primary500,
                              borderRadius: BorderRadius.circular(
                                kBrowseModeInnerRadius,
                              ),
                            ),
                          ),
                        ),
                        Row(
                          children: [
                            _browseModeTab(
                              label: locale.t('clientHome.classesSectionTitle'),
                              iconAsset: 'assets/icons/icon-people.svg',
                              count: _derivedDayClassesCount,
                              emphasis: classesBlend,
                              onTap: () => _setBrowseShowClasses(true),
                            ),
                            _browseModeTab(
                              label: locale.t('clientHome.studiosTab'),
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
        behavior: HitTestBehavior.opaque,
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
                    fontSize: 14.sp,
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
    final locationStore = context.watch<ClientLocationStore>();
    final locationLabel = locationStore
        .displayLabel(locale.t('clientHome.setLocation'))
        .toUpperCase();
    final favStore = context.watch<ClientFavoritesStore>();
    _ensureDerivedLists();

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: GestureDetector(
        behavior: HitTestBehavior.translucent,
        onTap: () => FocusScope.of(context).unfocus(),
        child: SafeArea(
        child: ValueListenableBuilder<bool>(
          valueListenable: _browseShowClasses,
          builder: (context, showClasses, _) {
            final headerExpandedHeight = _browseHeaderExpandedHeight(context);
            return CustomScrollView(
              controller: _browseScrollController,
              slivers: [
                SliverToBoxAdapter(
                  child: Padding(
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
                              maxWidth: MediaQuery.sizeOf(context).width - 120,
                            ),
                            child: Text(
                              locationLabel,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 14.sp,
                                letterSpacing: 0.4,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ),
                          const Icon(
                            Icons.keyboard_arrow_down_rounded,
                            size: 18,
                            color: kBrowseLocationBlue,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Expanded(
                          child: Text(
                            locale.t('clientShell.browse'),
                            style: TextStyle(
                              fontSize: 28.sp,
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
                ),
                SliverPersistentHeader(
                  pinned: true,
                  delegate: BrowseCollapsingHeaderDelegate(
                    expandedHeight: headerExpandedHeight,
                    collapsedHeight: kBrowseCollapsedHeaderHeight,
                    backgroundColor: AppColors.backgroundSecondary,
                    rebuildToken: _browseHeaderRebuildToken,
                    builder: (context, collapseT) =>
                        _buildBrowseCollapsingHeaderContent(
                          context,
                          locale,
                          collapseT,
                        ),
                  ),
                ),
                ...buildBrowseResultsSlivers(
                  showClasses: showClasses,
                  loadError: _loadError,
                  isLoading: _isBrowseResultsLoading,
                  studiosEmpty: _studios.isEmpty,
                  classesEmpty: _classes.isEmpty,
                  dayClasses: _derivedDayClasses,
                  visibleStudios: _derivedVisibleStudios,
                  todayClassesByStudio: _derivedTodayClassesByStudio,
                  trainingCategories: _trainingCategories,
                  locationStore: locationStore,
                  favStore: favStore,
                  locale: locale,
                  onRetry: _loadExplore,
                  onOpenLocationPicker: _openLocationPicker,
                  onOpenClassDetail: _openExploreClassDetail,
                  onOpenStudio: (s) {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) =>
                            PublicStudioDetailScreen(studioId: s.id),
                      ),
                    );
                  },
                  onToggleFavorite: _toggleBrowseStudioFavorite,
                  resolveDistanceKm: (s) =>
                      _resolvedDistanceKmMemo(s, locationStore),
                ),
              ],
            );
          },
        ),
      ),
      ),
    );
  }
}

