import '../widgets/analytics/analytics_dashboard_widgets.dart';
import 'dashboard_api_service.dart';

class AnalyticsDashboardSnapshot {
  const AnalyticsDashboardSnapshot({
    required this.current,
    this.previous,
    this.trend = const [],
    this.isTrendLoaded = false,
  });

  final StudioAnalytics current;
  final StudioAnalytics? previous;
  final List<AnalyticsTrendPoint> trend;
  final bool isTrendLoaded;

  AnalyticsDashboardSnapshot copyWith({
    StudioAnalytics? current,
    StudioAnalytics? previous,
    List<AnalyticsTrendPoint>? trend,
    bool? isTrendLoaded,
  }) {
    return AnalyticsDashboardSnapshot(
      current: current ?? this.current,
      previous: previous ?? this.previous,
      trend: trend ?? this.trend,
      isTrendLoaded: isTrendLoaded ?? this.isTrendLoaded,
    );
  }
}

class _CacheEntry {
  const _CacheEntry({
    required this.snapshot,
    required this.fetchedAt,
  });

  final AnalyticsDashboardSnapshot snapshot;
  final DateTime fetchedAt;
}

/// In-memory analytics cache with TTL and phased loading (metrics → trend).
class AnalyticsRepository {
  AnalyticsRepository._();

  static final AnalyticsRepository instance = AnalyticsRepository._();

  static const int trendBuckets = 7;
  static const Duration cacheTtl = Duration(minutes: 5);

  final Map<String, _CacheEntry> _cache = {};

  void clear() => _cache.clear();

  String cacheKey({
    required int selectedDays,
    required String rangeStartIso,
  }) =>
      '$selectedDays|$rangeStartIso';

  AnalyticsDashboardSnapshot? snapshotFor(String key) => _cache[key]?.snapshot;

  bool isFresh(String key) {
    final entry = _cache[key];
    if (entry == null) return false;
    return DateTime.now().difference(entry.fetchedAt) < cacheTtl;
  }

  void put(String key, AnalyticsDashboardSnapshot snapshot) {
    _cache[key] = _CacheEntry(
      snapshot: snapshot,
      fetchedAt: DateTime.now(),
    );
  }

  Future<AnalyticsDashboardSnapshot> fetchMetrics({
    required String token,
    required int selectedDays,
    required DateTime rangeStart,
    required DateTime rangeEnd,
  }) async {
    final previousEnd = rangeStart.subtract(const Duration(days: 1));
    final previousStart = previousEnd.subtract(
      Duration(days: selectedDays - 1),
    );

    final results = await Future.wait([
      DashboardApiService.getCurrentStudioAnalytics(
        token,
        fromIso: _isoStart(rangeStart),
        toIso: _isoEnd(rangeEnd),
      ),
      DashboardApiService.getCurrentStudioAnalytics(
        token,
        fromIso: _isoStart(previousStart),
        toIso: _isoEnd(previousEnd),
      ),
    ]);

    final current = results[0];
    if (current == null) {
      throw Exception('analytics empty');
    }

    return AnalyticsDashboardSnapshot(
      current: current,
      previous: results[1],
      isTrendLoaded: false,
    );
  }

  Future<List<AnalyticsTrendPoint>> fetchTrend({
    required String token,
    required DateTime rangeStart,
    required DateTime rangeEnd,
  }) async {
    if (rangeEnd.isBefore(rangeStart)) return const [];

    final totalMs = rangeEnd.difference(rangeStart).inMilliseconds;
    if (totalMs <= 0) return const [];

    final bucketMs = totalMs ~/ trendBuckets;
    final futures = <Future<AnalyticsTrendPoint>>[];

    for (var i = 0; i < trendBuckets; i++) {
      final bucketStart = rangeStart.add(Duration(milliseconds: bucketMs * i));
      final bucketEnd = i == trendBuckets - 1
          ? rangeEnd
          : rangeStart.add(Duration(milliseconds: bucketMs * (i + 1) - 1));
      futures.add(_fetchTrendBucket(token, bucketStart, bucketEnd));
    }

    return Future.wait(futures);
  }

  Future<AnalyticsTrendPoint> _fetchTrendBucket(
    String token,
    DateTime start,
    DateTime end,
  ) async {
    final data = await DashboardApiService.getCurrentStudioAnalytics(
      token,
      fromIso: _isoStart(start),
      toIso: _isoEnd(end),
    );
    return AnalyticsTrendPoint(
      date: start,
      value: data?.revenueTotal ?? 0,
    );
  }

  String _isoStart(DateTime day) =>
      DateTime(day.year, day.month, day.day).toUtc().toIso8601String();

  String _isoEnd(DateTime day) => DateTime(
        day.year,
        day.month,
        day.day,
        23,
        59,
        59,
      ).toUtc().toIso8601String();
}
