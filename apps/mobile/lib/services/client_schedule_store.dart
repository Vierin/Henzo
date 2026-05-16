import 'package:flutter/foundation.dart';

import 'api_client.dart';

/// Notifies tabs when [ClientScheduleStore] cache changes (upcoming vs passes).
final ValueNotifier<int> clientScheduleCacheTick = ValueNotifier<int>(0);

/// Single in-memory cache + in-flight dedupe for client fitness schedule.
/// Covers the union window needed by Schedule tab and Passes tab.
class ClientScheduleStore {
  ClientScheduleStore._();

  static const Duration cacheTtl = Duration(minutes: 2);

  static List<Map<String, dynamic>>? _cachedItems;
  static DateTime? _cachedAt;
  static Future<List<Map<String, dynamic>>>? _inFlight;

  static void invalidate() {
    _cachedItems = null;
    _cachedAt = null;
    _inFlight = null;
    clientScheduleCacheTick.value++;
  }

  /// Wide range: past passes history + upcoming bookings (same as previous dual-fetch union).
  static Future<List<Map<String, dynamic>>> loadFullSchedule(
    String? token, {
    bool force = false,
  }) async {
    if (token == null || token.isEmpty) return const [];

    if (!force &&
        _cachedItems != null &&
        _cachedAt != null &&
        DateTime.now().difference(_cachedAt!) < cacheTtl) {
      return List<Map<String, dynamic>>.from(_cachedItems!);
    }

    if (!force && _inFlight != null) {
      return _inFlight!;
    }

    final future = _fetch(token);
    _inFlight = future;
    try {
      final items = await future;
      return items;
    } finally {
      _inFlight = null;
    }
  }

  static Future<List<Map<String, dynamic>>> _fetch(String token) async {
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
    _cachedItems = List<Map<String, dynamic>>.from(parsed);
    _cachedAt = DateTime.now();
    clientScheduleCacheTick.value++;
    return List<Map<String, dynamic>>.from(parsed);
  }

  /// Local end time: API `endsAt`, or `startsAt` + training duration, else `startsAt`.
  static DateTime? sessionEndLocal(Map<String, dynamic> item) {
    final endsRaw = item['endsAt'];
    if (endsRaw != null && endsRaw.toString().trim().isNotEmpty) {
      final e = DateTime.tryParse(endsRaw.toString())?.toLocal();
      if (e != null) return e;
    }
    final startsAt =
        DateTime.tryParse((item['startsAt'] ?? '').toString())?.toLocal();
    if (startsAt == null) return null;
    final training = item['training'];
    if (training is Map) {
      final tr = Map<String, dynamic>.from(training);
      final durMin = (tr['duration'] as num?)?.toInt();
      if (durMin != null && durMin > 0) {
        return startsAt.add(Duration(minutes: durMin));
      }
    }
    return startsAt;
  }

  /// True when the session time window is fully in the past.
  static bool sessionHasEnded(Map<String, dynamic> item, DateTime now) {
    final end = sessionEndLocal(item);
    if (end != null) return !end.isAfter(now);
    final startsAt =
        DateTime.tryParse((item['startsAt'] ?? '').toString())?.toLocal();
    if (startsAt == null) return true;
    return startsAt.isBefore(now);
  }

  static String? bookingIdFromItem(Map<String, dynamic> item) {
    final bookingId = item['bookingId']?.toString().trim();
    if (bookingId != null && bookingId.isNotEmpty) return bookingId;
    final enrollmentId = item['enrollmentId']?.toString().trim();
    if (enrollmentId != null && enrollmentId.isNotEmpty) return enrollmentId;
    final id = item['id']?.toString().trim();
    if (id != null && id.isNotEmpty) return id;
    return null;
  }

  /// Cancel allowed while session not finished and booking is active.
  static bool canCancelClientBooking(Map<String, dynamic> item) {
    final now = DateTime.now();
    if (sessionHasEnded(item, now)) return false;
    final status = (item['bookingStatus'] ?? item['status'] ?? '')
        .toString()
        .toUpperCase();
    if (status == 'CANCELLED' || status == 'COMPLETED') return false;
    return bookingIdFromItem(item) != null;
  }

  /// Schedule tab: future + in-progress visits (session not ended), excluding cancelled.
  static List<Map<String, dynamic>> upcomingItems(
    List<Map<String, dynamic>> all,
  ) {
    final now = DateTime.now();
    final upcoming = all.where((item) {
      if (sessionHasEnded(item, now)) return false;
      final status = (item['bookingStatus'] ?? item['status'] ?? '')
          .toString()
          .toUpperCase();
      if (status == 'CANCELLED' || status == 'COMPLETED') return false;
      return true;
    }).toList();
    upcoming.sort((a, b) {
      final aa = DateTime.tryParse((a['startsAt'] ?? '').toString()) ??
          DateTime.fromMillisecondsSinceEpoch(0);
      final bb = DateTime.tryParse((b['startsAt'] ?? '').toString()) ??
          DateTime.fromMillisecondsSinceEpoch(0);
      return aa.compareTo(bb);
    });
    return upcoming;
  }

  /// Passes tab: ended sessions only (history), excluding cancelled, newest first.
  static List<Map<String, dynamic>> passesPastItems(
    List<Map<String, dynamic>> all,
  ) {
    final now = DateTime.now();
    final past = all.where((item) {
      final status = (item['bookingStatus'] ?? item['status'] ?? '')
          .toString()
          .toUpperCase();
      if (status == 'CANCELLED') return false;
      if (status == 'COMPLETED') return true;
      return sessionHasEnded(item, now);
    }).toList();
    past.sort((a, b) {
      final aa = DateTime.tryParse((a['startsAt'] ?? '').toString()) ??
          DateTime.fromMillisecondsSinceEpoch(0);
      final bb = DateTime.tryParse((b['startsAt'] ?? '').toString()) ??
          DateTime.fromMillisecondsSinceEpoch(0);
      return bb.compareTo(aa);
    });
    return past;
  }
}
