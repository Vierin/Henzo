import 'package:flutter/foundation.dart';

import '../utils/formatters.dart';
import 'api_client.dart';
import '../models/booking.dart';
import '../models/owner_studio_client.dart';
import '../models/salon.dart';
import '../models/subscription.dart';
import '../models/time_block.dart';

double? _parseOptionalDouble(dynamic v) {
  if (v == null) return null;
  if (v is num) return v.toDouble();
  if (v is String) return double.tryParse(v.trim());
  return null;
}

int? _parseOptionalInt(dynamic v) {
  if (v == null) return null;
  if (v is int) return v;
  if (v is num) return v.toInt();
  if (v is String) return int.tryParse(v.trim());
  return null;
}

class OwnerTrainingSession {
  final String sessionId;

  /// Training (service) id — for navigation to edit.
  final String trainingId;
  final DateTime startsAt;
  final DateTime endsAt;
  final String status;
  final int capacity;
  final int enrolledCount;
  final int attendedCount;
  final String trainingName;

  /// Template price from Training (for enrollment-derived bookings / revenue).
  final double? trainingPrice;

  /// Duration from Training template (minutes), when API sends it.
  final int? trainingDurationMinutes;
  final String? trainingDisplayColorHex;

  /// Localized category names from API (Training.trainingCategory).
  final String? trainingCategoryNameEn;
  final String? trainingCategoryNameRu;
  final String? trainingCategoryNameVn;
  final String trainerName;

  /// Null when no trainer row or owner-led slot.
  final String? trainerId;

  final String? locationId;
  final String? locationName;

  const OwnerTrainingSession({
    required this.sessionId,
    required this.trainingId,
    required this.startsAt,
    required this.endsAt,
    required this.status,
    required this.capacity,
    required this.enrolledCount,
    required this.attendedCount,
    required this.trainingName,
    this.trainingPrice,
    this.trainingDurationMinutes,
    this.trainingDisplayColorHex,
    this.trainingCategoryNameEn,
    this.trainingCategoryNameRu,
    this.trainingCategoryNameVn,
    required this.trainerName,
    this.trainerId,
    this.locationId,
    this.locationName,
  });

  factory OwnerTrainingSession.fromJson(Map<String, dynamic> json) {
    final attendance = json['attendanceSummary'];
    final training = json['training'];
    final trainer = json['trainer'];
    final trainerIdRaw = trainer is Map<String, dynamic> ? trainer['id'] : null;
    String? catEn;
    String? catRu;
    String? catVn;
    if (training is Map<String, dynamic>) {
      final tc = training['trainingCategory'];
      if (tc is Map<String, dynamic>) {
        catEn = tc['nameEn']?.toString();
        catRu = tc['nameRu']?.toString();
        catVn = tc['nameVn']?.toString();
      }
    }
    return OwnerTrainingSession(
      sessionId: (json['sessionId'] ?? '').toString(),
      trainingId:
          (json['trainingId'] ??
                  (training is Map<String, dynamic> ? training['id'] : null) ??
                  '')
              .toString(),
      startsAt:
          parseApiDateTime(json['startsAt']) ?? DateTime.now(),
      endsAt: parseApiDateTime(json['endsAt']) ?? DateTime.now(),
      status: (json['status'] ?? 'ACTIVE').toString(),
      capacity: (json['capacity'] as num?)?.toInt() ?? 0,
      enrolledCount: (json['enrolledCount'] as num?)?.toInt() ?? 0,
      attendedCount: attendance is Map<String, dynamic>
          ? (attendance['attended'] as num?)?.toInt() ??
                ((json['enrolledCount'] as num?)?.toInt() ?? 0)
          : ((json['enrolledCount'] as num?)?.toInt() ?? 0),
      trainingName: training is Map<String, dynamic>
          ? (training['name'] ?? 'Training').toString()
          : 'Training',
      trainingPrice: training is Map<String, dynamic>
          ? (_parseOptionalDouble(training['price']) ??
                _parseOptionalDouble(training['amount']))
          : null,
      trainingDurationMinutes: training is Map<String, dynamic>
          ? _parseOptionalInt(training['duration'])
          : null,
      trainingDisplayColorHex: training is Map<String, dynamic>
          ? training['displayColor']?.toString()
          : null,
      trainingCategoryNameEn: catEn,
      trainingCategoryNameRu: catRu,
      trainingCategoryNameVn: catVn,
      trainerName: trainer is Map<String, dynamic>
          ? (trainer['name'] ?? '—').toString()
          : '—',
      trainerId: trainerIdRaw == null
          ? null
          : trainerIdRaw.toString().trim().isEmpty
          ? null
          : trainerIdRaw.toString(),
      locationId: json['locationId']?.toString(),
      locationName: json['locationName']?.toString(),
    );
  }

  /// Args for [Navigator] to [OwnerEditTrainingSessionScreen].
  Map<String, dynamic> toRouteArgs() => {
    'sessionId': sessionId,
    'trainingId': trainingId,
    'startsAt': startsAt.toIso8601String(),
    'endsAt': endsAt.toIso8601String(),
    'status': status,
    'capacity': capacity,
    'enrolledCount': enrolledCount,
    'attendedCount': attendedCount,
    'trainingName': trainingName,
    if (trainingPrice != null) 'trainingPrice': trainingPrice,
    if (trainingDurationMinutes != null)
      'trainingDurationMinutes': trainingDurationMinutes,
    if (trainingDisplayColorHex != null)
      'trainingDisplayColorHex': trainingDisplayColorHex,
    if (trainingCategoryNameEn != null)
      'trainingCategoryNameEn': trainingCategoryNameEn,
    if (trainingCategoryNameRu != null)
      'trainingCategoryNameRu': trainingCategoryNameRu,
    if (trainingCategoryNameVn != null)
      'trainingCategoryNameVn': trainingCategoryNameVn,
    'trainerName': trainerName,
    if (trainerId != null) 'trainerId': trainerId,
    if (locationId != null) 'locationId': locationId,
    if (locationName != null) 'locationName': locationName,
  };

  factory OwnerTrainingSession.fromRouteArgs(Map<String, dynamic> m) {
    final trainerRaw = m['trainerId'];
    return OwnerTrainingSession(
      sessionId: (m['sessionId'] ?? '').toString(),
      trainingId: (m['trainingId'] ?? '').toString(),
      startsAt: parseApiDateTime(m['startsAt']) ?? DateTime.now(),
      endsAt: parseApiDateTime(m['endsAt']) ?? DateTime.now(),
      status: (m['status'] ?? 'ACTIVE').toString(),
      capacity: (m['capacity'] as num?)?.toInt() ?? 0,
      enrolledCount: (m['enrolledCount'] as num?)?.toInt() ?? 0,
      attendedCount: (m['attendedCount'] as num?)?.toInt() ?? 0,
      trainingName: (m['trainingName'] ?? 'Training').toString(),
      trainingPrice: _parseOptionalDouble(m['trainingPrice']),
      trainingDurationMinutes: _parseOptionalInt(m['trainingDurationMinutes']),
      trainingDisplayColorHex: m['trainingDisplayColorHex']?.toString(),
      trainingCategoryNameEn: m['trainingCategoryNameEn']?.toString(),
      trainingCategoryNameRu: m['trainingCategoryNameRu']?.toString(),
      trainingCategoryNameVn: m['trainingCategoryNameVn']?.toString(),
      trainerName: (m['trainerName'] ?? '—').toString(),
      trainerId: trainerRaw == null || trainerRaw.toString().isEmpty
          ? null
          : trainerRaw.toString(),
      locationId: m['locationId']?.toString(),
      locationName: m['locationName']?.toString(),
    );
  }

  OwnerTrainingSession copyWith({
    DateTime? startsAt,
    DateTime? endsAt,
    int? enrolledCount,
    int? attendedCount,
    String? status,
    String? locationId,
    String? locationName,
    String? trainingName,
    double? trainingPrice,
    int? trainingDurationMinutes,
    String? trainingDisplayColorHex,
    String? trainingCategoryNameEn,
    String? trainingCategoryNameRu,
    String? trainingCategoryNameVn,
  }) =>
      OwnerTrainingSession(
        sessionId: sessionId,
        trainingId: trainingId,
        startsAt: startsAt ?? this.startsAt,
        endsAt: endsAt ?? this.endsAt,
        status: status ?? this.status,
        capacity: capacity,
        enrolledCount: enrolledCount ?? this.enrolledCount,
        attendedCount: attendedCount ?? this.attendedCount,
        trainingName: trainingName ?? this.trainingName,
        trainingPrice: trainingPrice ?? this.trainingPrice,
        trainingDurationMinutes:
            trainingDurationMinutes ?? this.trainingDurationMinutes,
        trainingDisplayColorHex:
            trainingDisplayColorHex ?? this.trainingDisplayColorHex,
        trainingCategoryNameEn:
            trainingCategoryNameEn ?? this.trainingCategoryNameEn,
        trainingCategoryNameRu:
            trainingCategoryNameRu ?? this.trainingCategoryNameRu,
        trainingCategoryNameVn:
            trainingCategoryNameVn ?? this.trainingCategoryNameVn,
        trainerName: trainerName,
        trainerId: trainerId,
        locationId: locationId ?? this.locationId,
        locationName: locationName ?? this.locationName,
      );

  /// When API [endsAt] is missing or invalid, derive from [startsAt] + duration.
  DateTime get effectiveEndsAt {
    final start = startsAt.toLocal();
    final end = endsAt.toLocal();
    if (end.isAfter(start)) return end;
    final mins = trainingDurationMinutes;
    if (mins != null && mins > 0) {
      return start.add(Duration(minutes: mins));
    }
    return start.add(const Duration(hours: 1));
  }

  /// Training category label for UI (matches studio locale).
  String? categoryLabelForLocale(String localeCode) {
    switch (localeCode) {
      case 'ru':
        final r = trainingCategoryNameRu?.trim();
        if (r != null && r.isNotEmpty) return r;
        break;
      case 'vi':
        final v = trainingCategoryNameVn?.trim();
        if (v != null && v.isNotEmpty) return v;
        break;
      default:
        break;
    }
    final e = trainingCategoryNameEn?.trim();
    return e != null && e.isNotEmpty ? e : null;
  }
}

class RecurringCreationResult {
  final int createdCount;
  final int skippedCount;

  const RecurringCreationResult({
    required this.createdCount,
    required this.skippedCount,
  });

  factory RecurringCreationResult.fromJson(Map<String, dynamic> json) {
    return RecurringCreationResult(
      createdCount: (json['createdCount'] as num?)?.toInt() ?? 0,
      skippedCount: (json['skippedCount'] as num?)?.toInt() ?? 0,
    );
  }
}

class RecurringSlot {
  final int day;
  final String startTime;

  const RecurringSlot({required this.day, required this.startTime});

  Map<String, dynamic> toJson() => {'day': day, 'startTime': startTime};
}

class OwnerSessionEnrollment {
  final String enrollmentId;
  final String userId;
  final String status;
  final DateTime createdAt;
  final DateTime? cancelledAt;
  final String? name;
  final String? email;
  final String? phone;

  const OwnerSessionEnrollment({
    required this.enrollmentId,
    required this.userId,
    required this.status,
    required this.createdAt,
    this.cancelledAt,
    this.name,
    this.email,
    this.phone,
  });

  factory OwnerSessionEnrollment.fromJson(Map<String, dynamic> json) {
    final user = json['user'];
    return OwnerSessionEnrollment(
      enrollmentId: (json['enrollmentId'] ?? '').toString(),
      userId: (json['userId'] ?? '').toString(),
      status: (json['status'] ?? 'ACTIVE').toString(),
      createdAt:
          DateTime.tryParse((json['createdAt'] ?? '').toString()) ??
          DateTime.now(),
      cancelledAt: DateTime.tryParse((json['cancelledAt'] ?? '').toString()),
      name: user is Map<String, dynamic> ? user['name']?.toString() : null,
      email: user is Map<String, dynamic> ? user['email']?.toString() : null,
      phone: user is Map<String, dynamic> ? user['phone']?.toString() : null,
    );
  }
}

class StudioAnalytics {
  final DateTime from;
  final DateTime to;
  final double revenueTotal;
  final int bookingCount;
  final double averagePerBooking;
  final int noshowCount;
  final int completedBookingCount;
  final double? attendanceRate;
  final int trainingSessionsScheduled;
  final int trainingSessionsCancelled;
  final int enrollmentsActive;
  final int enrollmentsCancelled;
  final double averageUtilization;
  final int trainingsActiveInPeriod;
  final String? topTrainingName;
  final String? topTrainerName;
  final int clientsTotal;
  final int clientsRegular;
  final int clientsNewInPeriod;
  final int clientsInactive;
  final String analyticsTier;
  final bool isPro;
  final bool proLocked;

  const StudioAnalytics({
    required this.from,
    required this.to,
    required this.revenueTotal,
    required this.bookingCount,
    required this.averagePerBooking,
    required this.noshowCount,
    required this.completedBookingCount,
    required this.attendanceRate,
    required this.trainingSessionsScheduled,
    required this.trainingSessionsCancelled,
    required this.enrollmentsActive,
    required this.enrollmentsCancelled,
    required this.averageUtilization,
    required this.trainingsActiveInPeriod,
    required this.topTrainingName,
    required this.topTrainerName,
    required this.clientsTotal,
    required this.clientsRegular,
    required this.clientsNewInPeriod,
    required this.clientsInactive,
    required this.analyticsTier,
    required this.isPro,
    required this.proLocked,
  });

  static int _asInt(dynamic value) => (value as num?)?.toInt() ?? 0;
  static double _asDouble(dynamic value) => (value as num?)?.toDouble() ?? 0;

  factory StudioAnalytics.fromJson(Map<String, dynamic> json) {
    final period = json['period'];
    final clients = json['clients'];
    final topTraining = json['topTraining'];
    final topTrainer = json['topTrainer'];
    final fromIso = period is Map<String, dynamic>
        ? (period['from'] ?? DateTime.now().toIso8601String()).toString()
        : DateTime.now().toIso8601String();
    final toIso = period is Map<String, dynamic>
        ? (period['to'] ?? DateTime.now().toIso8601String()).toString()
        : DateTime.now().toIso8601String();
    return StudioAnalytics(
      from: DateTime.tryParse(fromIso) ?? DateTime.now(),
      to: DateTime.tryParse(toIso) ?? DateTime.now(),
      revenueTotal: _asDouble(json['revenueTotal']),
      bookingCount: _asInt(json['bookingCount']),
      averagePerBooking: _asDouble(json['averagePerBooking']),
      noshowCount: _asInt(json['noshowCount']),
      completedBookingCount: _asInt(json['completedBookingCount']),
      attendanceRate: (json['attendanceRate'] as num?)?.toDouble(),
      trainingSessionsScheduled: _asInt(json['trainingSessionsScheduled']),
      trainingSessionsCancelled: _asInt(json['trainingSessionsCancelled']),
      enrollmentsActive: _asInt(json['enrollmentsActive']),
      enrollmentsCancelled: _asInt(json['enrollmentsCancelled']),
      averageUtilization: _asDouble(json['averageUtilization']),
      trainingsActiveInPeriod: _asInt(json['trainingsActiveInPeriod']),
      topTrainingName: topTraining is Map<String, dynamic>
          ? topTraining['name']?.toString()
          : null,
      topTrainerName: topTrainer is Map<String, dynamic>
          ? topTrainer['name']?.toString()
          : null,
      clientsTotal: clients is Map<String, dynamic>
          ? _asInt(clients['total'])
          : 0,
      clientsRegular: clients is Map<String, dynamic>
          ? _asInt(clients['regular'])
          : 0,
      clientsNewInPeriod: clients is Map<String, dynamic>
          ? _asInt(clients['newInPeriod'])
          : 0,
      clientsInactive: clients is Map<String, dynamic>
          ? _asInt(clients['inactive'])
          : 0,
      analyticsTier: (json['analyticsTier'] ?? 'FREEMIUM').toString(),
      isPro: json['isPro'] == true,
      proLocked: json['proLocked'] == true,
    );
  }
}

class OwnerClientBlock {
  final String? userId;
  final String? email;
  final String? phone;

  const OwnerClientBlock({this.userId, this.email, this.phone});

  factory OwnerClientBlock.fromJson(Map<String, dynamic> json) {
    return OwnerClientBlock(
      userId: json['userId']?.toString(),
      email: json['email']?.toString(),
      phone: json['phone']?.toString(),
    );
  }
}

class DashboardApiService {
  static Map<String, dynamic> _expectEnvelope(dynamic body, String methodName) {
    if (body is! Map<String, dynamic>) {
      throw ApiException('$methodName: invalid response shape');
    }
    return body;
  }

  static bool _isRouteMissing(ApiException e) =>
      e.statusCode == 404 && e.message.contains('Cannot GET');

  /// GET /fitness/studios/current — студия владельца.
  static Future<Salon?> getCurrentSalon(String accessToken) async {
    try {
      final body = await ApiClient.get('/fitness/studios/current', accessToken);
      if (body is! Map<String, dynamic>) return null;
      if (body['needsSetup'] == true) {
        if (kDebugMode) debugPrint('[DashboardAPI] salon needsSetup=true');
        return null;
      }
      // Backend responses are inconsistent across routes/versions:
      // 1) { success: true, data: {...} }
      // 2) { data: {...} }
      // 3) direct studio object {...}
      final data = body['data'];
      if (data is Map<String, dynamic>) {
        return Salon.fromJson(Map<String, dynamic>.from(data));
      }
      if (body['id'] != null) {
        return Salon.fromJson(Map<String, dynamic>.from(body));
      }
      // Only treat explicit success=false as setup/failure.
      if (body.containsKey('success') && body['success'] == false) {
        if (kDebugMode) debugPrint('[DashboardAPI] salon success=false');
        return null;
      }
      return null;
    } on ApiException catch (e) {
      if (_isRouteMissing(e)) {
        try {
          final legacy = await ApiClient.get('/salons/current', accessToken);
          if (legacy is Map<String, dynamic>) {
            return Salon.fromJson(Map<String, dynamic>.from(legacy));
          }
          return null;
        } on ApiException catch (legacyError) {
          if (kDebugMode) {
            debugPrint(
              '[DashboardAPI] getCurrentSalon legacy failed: $legacyError',
            );
          }
          return null;
        }
      }
      if (kDebugMode) debugPrint('[DashboardAPI] getCurrentSalon: $e');
      return null;
    }
  }

  /// GET /studios/current/onboarding-checklist
  static Future<StudioOnboardingChecklist?> getCurrentStudioOnboardingChecklist(
    String accessToken,
  ) async {
    try {
      final raw = await ApiClient.get(
        '/studios/current/onboarding-checklist',
        accessToken,
      );
      final body = _expectEnvelope(raw, 'getCurrentStudioOnboardingChecklist');
      final data = body['data'];
      if (data is! Map<String, dynamic>) return null;
      return StudioOnboardingChecklist.fromJson(
        Map<String, dynamic>.from(data),
      );
    } on ApiException catch (e) {
      if (kDebugMode) {
        debugPrint('[DashboardAPI] getCurrentStudioOnboardingChecklist: $e');
      }
      return null;
    }
  }

  /// PATCH /studios/:id/publish — перевести студию в ACTIVE.
  static Future<bool> publishStudio(String accessToken, String studioId) async {
    await ApiClient.patch('/studios/$studioId/publish', accessToken);
    return true;
  }

  /// GET /fitness/studios/current/analytics?from=&to=
  static Future<StudioAnalytics?> getCurrentStudioAnalytics(
    String accessToken, {
    required String fromIso,
    required String toIso,
  }) async {
    try {
      final path =
          '/fitness/studios/current/analytics?from=${Uri.encodeComponent(fromIso)}&to=${Uri.encodeComponent(toIso)}';
      final body = await ApiClient.get(path, accessToken);
      if (body is! Map<String, dynamic>) return null;
      if (body['success'] != true) return null;
      if (body['needsSetup'] == true) return null;
      final data = body['data'];
      if (data is! Map<String, dynamic>) return null;
      return StudioAnalytics.fromJson(Map<String, dynamic>.from(data));
    } on ApiException catch (e) {
      if (kDebugMode) {
        debugPrint('[DashboardAPI] getCurrentStudioAnalytics: $e');
      }
      return null;
    }
  }

  /// PUT /studios/current — обновить студию владельца.
  static Future<Salon> updateCurrentSalon(
    String accessToken,
    Map<String, dynamic> payload,
  ) async {
    final data =
        await ApiClient.put('/studios/current', accessToken, body: payload)
            as Map<String, dynamic>?;
    if (data == null) throw ApiException('Invalid response');
    return Salon.fromJson(data);
  }

  /// POST /studios/current — создать студию владельца.
  static Future<Salon> createCurrentSalon(
    String accessToken,
    Map<String, dynamic> payload,
  ) async {
    final data =
        await ApiClient.post('/studios/current', accessToken, body: payload)
            as Map<String, dynamic>?;
    if (data == null) throw ApiException('Invalid response');
    return Salon.fromJson(data);
  }

  /// GET /subscriptions/current — текущая подписка владельца.
  static Future<Subscription?> getCurrentSubscription(
    String accessToken,
  ) async {
    try {
      final body = await ApiClient.get('/subscriptions/current', accessToken);
      if (body is! Map<String, dynamic>) return null;
      if (body['needsSetup'] == true) {
        if (kDebugMode) {
          debugPrint('[DashboardAPI] subscription needsSetup=true');
        }
        return null;
      }
      final data = body['data'];
      if (data is Map<String, dynamic>) {
        return Subscription.fromJson(Map<String, dynamic>.from(data));
      }
      return Subscription.fromJson(body);
    } on ApiException catch (e) {
      if (kDebugMode) debugPrint('[DashboardAPI] getCurrentSubscription: $e');
      return null;
    }
  }

  /// GET /fitness/session-bookings/owner — бронирования владельца студии.
  static Future<List<Booking>> getOwnerBookings(String accessToken) async {
    try {
      final result = <Booking>[];
      const pageSize = 200;
      const maxPages = 20;
      for (var page = 1; page <= maxPages; page++) {
        final raw = await ApiClient.get(
          '/fitness/session-bookings/owner?limit=$pageSize&page=$page',
          accessToken,
        );
        final list = raw is List
            ? raw
            : raw is Map<String, dynamic> && raw['data'] is List
            ? raw['data'] as List
            : <dynamic>[];
        if (list.isEmpty) break;
        for (final item in list) {
          if (item is Map<String, dynamic>) {
            try {
              result.add(_bookingFromApi(Map<String, dynamic>.from(item)));
            } catch (e) {
              if (kDebugMode) {
                debugPrint('[DashboardAPI] booking parse error: $e');
              }
            }
          }
        }
        if (list.length < pageSize) break;
      }
      return result;
    } on ApiException {
      return [];
    }
  }

  static Future<List<OwnerClientBlock>> getOwnerClientBlocklist(
    String accessToken,
  ) async {
    try {
      final raw = await ApiClient.get(
        '/fitness/owner/client-blocklist',
        accessToken,
      );
      if (raw is! List) return [];
      final result = <OwnerClientBlock>[];
      for (final item in raw) {
        if (item is Map<String, dynamic>) {
          result.add(
            OwnerClientBlock.fromJson(Map<String, dynamic>.from(item)),
          );
        }
      }
      return result;
    } on ApiException {
      return [];
    }
  }

  static Future<void> blockOwnerClient(
    String accessToken, {
    String? userId,
    String? email,
    String? phone,
  }) async {
    await ApiClient.put(
      '/fitness/owner/client-blocklist/block',
      accessToken,
      body: {
        if (userId != null && userId.isNotEmpty) 'userId': userId,
        if (email != null && email.isNotEmpty) 'email': email,
        if (phone != null && phone.isNotEmpty) 'phone': phone,
      },
    );
  }

  static Future<void> unblockOwnerClient(
    String accessToken, {
    String? userId,
    String? email,
    String? phone,
  }) async {
    await ApiClient.put(
      '/fitness/owner/client-blocklist/unblock',
      accessToken,
      body: {
        if (userId != null && userId.isNotEmpty) 'userId': userId,
        if (email != null && email.isNotEmpty) 'email': email,
        if (phone != null && phone.isNotEmpty) 'phone': phone,
      },
    );
  }

  /// Fallback data source for Clients screen: participants of owner group sessions.
  static Future<List<Booking>> getOwnerEnrollmentBookings(
    String accessToken, {
    int daysBack = 120,
  }) async {
    try {
      final now = DateTime.now().toUtc();
      final from = now.subtract(Duration(days: daysBack));
      final sessions = await getOwnerTrainingSessions(
        accessToken,
        fromIso: from.toIso8601String(),
        toIso: now.toIso8601String(),
      );
      if (sessions.isEmpty) return [];

      final enrollmentsBySession = await Future.wait(
        sessions.map(
          (s) => getOwnerSessionEnrollments(accessToken, s.sessionId),
        ),
      );

      final result = <Booking>[];
      for (var i = 0; i < sessions.length; i++) {
        final s = sessions[i];
        final enrollments = enrollmentsBySession[i];
        for (final e in enrollments) {
          result.add(
            Booking(
              id: 'enrollment:${e.enrollmentId}',
              dateTime: s.startsAt,
              status: BookingStatus.fromString(e.status),
              service: Service(
                name: s.trainingName,
                price: s.trainingPrice,
                duration:
                    s.trainingDurationMinutes ??
                    s.endsAt.difference(s.startsAt).inMinutes,
              ),
              user: User(
                id: e.userId,
                name: e.name,
                email: e.email,
                phone: e.phone,
              ),
              staff: Staff(id: s.trainerId, name: s.trainerName),
              staffId: s.trainerId,
              serviceId: s.trainingId,
              locationId: s.locationId,
              locationName: s.locationName,
            ),
          );
        }
      }
      result.sort((a, b) => b.dateTime.compareTo(a.dateTime));
      return result;
    } on ApiException {
      return [];
    }
  }

  /// PUT /bookings/:id/confirm — подтвердить бронирование.
  static Future<bool> confirmBooking(
    String accessToken,
    String bookingId,
  ) async {
    await ApiClient.put('/bookings/$bookingId/confirm', accessToken);
    return true;
  }

  /// GET /time-blocks — блокировки времени салона.
  static Future<List<TimeBlock>> getTimeBlocks(
    String accessToken, {
    String? startDate,
    String? endDate,
    String? staffId,
  }) async {
    final params = <String, String>{};
    if (startDate != null) params['startDate'] = startDate;
    if (endDate != null) params['endDate'] = endDate;
    if (staffId != null) params['staffId'] = staffId;
    final path = params.isEmpty
        ? '/time-blocks'
        : '/time-blocks?${params.entries.map((e) => '${e.key}=${Uri.encodeComponent(e.value)}').join('&')}';
    try {
      final list = await ApiClient.get(path, accessToken);
      if (list is! List) return [];
      final result = <TimeBlock>[];
      for (final item in list) {
        if (item is Map<String, dynamic>) {
          try {
            result.add(TimeBlock.fromJson(Map<String, dynamic>.from(item)));
          } catch (e) {
            if (kDebugMode) {
              debugPrint('[DashboardAPI] timeBlock parse error: $e');
            }
          }
        }
      }
      return result;
    } on ApiException catch (e) {
      if (kDebugMode) debugPrint('[DashboardAPI] getTimeBlocks: $e');
      return [];
    }
  }

  /// POST /fitness/session-bookings — создать тренировочную запись.
  static Future<Booking> createBooking(
    String accessToken, {
    required String salonId,
    required String serviceId,
    required String timeIso,
    String? staffId,
    String? clientName,
    String? clientPhone,
    String? clientEmail,
    String? notes,
  }) async {
    final body = <String, dynamic>{
      'salonId': salonId,
      'serviceId': serviceId,
      'time': timeIso,
      if (staffId != null && staffId.isNotEmpty) 'staffId': staffId,
      if (clientName != null && clientName.isNotEmpty) 'clientName': clientName,
      if (clientPhone != null && clientPhone.isNotEmpty)
        'clientPhone': clientPhone,
      if (clientEmail != null && clientEmail.isNotEmpty)
        'clientEmail': clientEmail,
      if (notes != null && notes.isNotEmpty) 'notes': notes,
    };
    final data =
        await ApiClient.post(
              '/fitness/session-bookings',
              accessToken,
              body: body,
            )
            as Map<String, dynamic>?;
    if (data == null) throw ApiException('Invalid response');
    final booking = data['booking'];
    if (booking is! Map<String, dynamic>) {
      throw ApiException('No booking in response');
    }
    return _bookingFromApi(Map<String, dynamic>.from(booking));
  }

  /// PUT /bookings/:id/reject — отклонить бронирование.
  static Future<bool> rejectBooking(
    String accessToken,
    String bookingId,
  ) async {
    await ApiClient.put('/bookings/$bookingId/reject', accessToken);
    return true;
  }

  /// PUT /bookings/:id/cancel — отменить бронирование.
  static Future<bool> cancelBooking(
    String accessToken,
    String bookingId,
  ) async {
    await ApiClient.put('/bookings/$bookingId/cancel', accessToken);
    return true;
  }

  /// PUT /bookings/:id — обновить бронирование.
  static Future<Booking> updateBooking(
    String accessToken,
    String bookingId, {
    String? serviceId,
    String? staffId,
    String? timeIso,
    String? notes,
    String? status,
  }) async {
    final body = <String, dynamic>{};
    if (serviceId != null && serviceId.isNotEmpty) {
      body['serviceId'] = serviceId;
    }
    if (staffId != null && staffId.isNotEmpty) body['staffId'] = staffId;
    if (timeIso != null && timeIso.isNotEmpty) body['time'] = timeIso;
    if (notes != null) body['notes'] = notes;
    if (status != null && status.isNotEmpty) body['status'] = status;
    final data =
        await ApiClient.put(
              '/bookings/$bookingId',
              accessToken,
              body: body.isEmpty ? null : body,
            )
            as Map<String, dynamic>?;
    if (data == null) throw ApiException('Invalid response');
    final booking = data['booking'];
    if (booking is! Map<String, dynamic>) {
      throw ApiException('No booking in response');
    }
    return _bookingFromApi(Map<String, dynamic>.from(booking));
  }

  /// Бекенд отдаёт time (ISO строка), фронт ожидает dateTime.
  static Booking _bookingFromApi(Map<String, dynamic> json) {
    final time = json['time'];
    String? dateTimeStr;
    if (time is String) {
      dateTimeStr = time;
    } else if (time != null) {
      dateTimeStr = time.toString();
    }
    final map = Map<String, dynamic>.from(json);
    map['dateTime'] = dateTimeStr ?? DateTime.now().toIso8601String();
    return Booking.fromJson(map);
  }

  /// GET /bookings/owner/sessions — групповые тренировки владельца.
  static Future<List<OwnerTrainingSession>> getOwnerTrainingSessions(
    String accessToken, {
    String? fromIso,
    String? toIso,
  }) async {
    final params = <String, String>{};
    if (fromIso != null && fromIso.isNotEmpty) params['from'] = fromIso;
    if (toIso != null && toIso.isNotEmpty) params['to'] = toIso;
    final path = params.isEmpty
        ? '/fitness/owner/training-sessions'
        : '/fitness/owner/training-sessions?${params.entries.map((e) => '${e.key}=${Uri.encodeComponent(e.value)}').join('&')}';
    final raw = await ApiClient.get(path, accessToken);
    if (raw is! List) return [];
    final sessions = <OwnerTrainingSession>[];
    for (final item in raw) {
      if (item is Map<String, dynamic>) {
        try {
          sessions.add(
            OwnerTrainingSession.fromJson(Map<String, dynamic>.from(item)),
          );
        } catch (e) {
          if (kDebugMode) {
            debugPrint('[DashboardAPI] training session parse error: $e');
          }
        }
      }
    }
    return sessions;
  }

  /// PUT /bookings/owner/sessions/:id/status — обновить статус тренировки.
  static Future<void> updateOwnerTrainingSessionStatus(
    String accessToken,
    String sessionId,
    String status,
  ) async {
    await ApiClient.put(
      '/fitness/owner/training-sessions/$sessionId/status',
      accessToken,
      body: {'status': status},
    );
  }

  /// PATCH /fitness/owner/training-sessions/:id — одно занятие (время, тренер, статус).
  /// В [fields] можно передать `trainerId: null`, чтобы снять тренера.
  static Future<void> patchOwnerTrainingSession(
    String accessToken,
    String sessionId,
    Map<String, dynamic> fields,
  ) async {
    if (fields.isEmpty) return;
    await ApiClient.patch(
      '/fitness/owner/training-sessions/$sessionId',
      accessToken,
      body: fields,
    );
  }

  static Future<List<OwnerSessionEnrollment>> getOwnerSessionEnrollments(
    String accessToken,
    String sessionId,
  ) async {
    final raw = await ApiClient.get(
      '/fitness/owner/training-sessions/$sessionId/enrollments',
      accessToken,
    );
    if (raw is! List) return [];
    final items = <OwnerSessionEnrollment>[];
    for (final item in raw) {
      if (item is Map<String, dynamic>) {
        items.add(
          OwnerSessionEnrollment.fromJson(Map<String, dynamic>.from(item)),
        );
      }
    }
    return items;
  }

  static Future<void> addOwnerSessionEnrollment(
    String accessToken,
    String sessionId, {
    String? userId,
    String? name,
    String? email,
    String? phone,
    bool sendConfirmationEmail = false,
    bool anonymousSpot = false,
    String? locale,
  }) async {
    await ApiClient.post(
      '/fitness/owner/training-sessions/$sessionId/enrollments',
      accessToken,
      body: {
        if (userId != null && userId.isNotEmpty) 'userId': userId,
        if (name != null && name.isNotEmpty) 'name': name,
        if (email != null && email.isNotEmpty) 'email': email,
        if (phone != null && phone.isNotEmpty) 'phone': phone,
        'sendConfirmationEmail': sendConfirmationEmail,
        'anonymousSpot': anonymousSpot,
        if (locale != null && locale.isNotEmpty) 'locale': locale,
      },
    );
  }

  static Future<List<OwnerStudioClientRow>> getOwnerStudioClients(
    String accessToken,
  ) async {
    try {
      final raw = await ApiClient.get(
        '/fitness/owner/studio-clients',
        accessToken,
      );
      if (raw is! List) return [];
      return raw
          .map((e) => OwnerStudioClientRow.fromJson(
                Map<String, dynamic>.from(e as Map),
              ))
          .toList();
    } on ApiException catch (e) {
      if (e.message.toLowerCase().contains('studio not found')) {
        return [];
      }
      rethrow;
    }
  }

  static Future<List<OwnerStudioClientSearchHit>> searchOwnerStudioClients(
    String accessToken,
    String query,
  ) async {
    final q = Uri.encodeComponent(query.trim());
    final raw = await ApiClient.get(
      '/fitness/owner/studio-clients/search?q=$q',
      accessToken,
    );
    if (raw is! List) return [];
    return raw
        .map((e) => OwnerStudioClientSearchHit.fromJson(
              Map<String, dynamic>.from(e as Map),
            ))
        .toList();
  }

  static Future<void> createOwnerStudioDirectoryClient(
    String accessToken, {
    String? name,
    String? email,
    String? phone,
    String? notes,
  }) async {
    await ApiClient.post(
      '/fitness/owner/studio-clients',
      accessToken,
      body: {
        if (name != null && name.isNotEmpty) 'name': name,
        if (email != null && email.isNotEmpty) 'email': email,
        if (phone != null && phone.isNotEmpty) 'phone': phone,
        if (notes != null && notes.isNotEmpty) 'notes': notes,
      },
    );
  }

  static Future<void> updateOwnerEnrollmentStatus(
    String accessToken,
    String enrollmentId,
    String status,
  ) async {
    await ApiClient.patch(
      '/fitness/owner/enrollments/$enrollmentId/status',
      accessToken,
      body: {'status': status},
    );
  }

  static Future<void> deleteOwnerEnrollment(
    String accessToken,
    String enrollmentId,
  ) async {
    await ApiClient.delete(
      '/fitness/owner/enrollments/$enrollmentId',
      accessToken,
    );
  }

  static Future<RecurringCreationResult> createRecurringTrainingSessions(
    String accessToken, {
    required String studioId,
    required String trainingId,
    String? trainerId,
    String? locationId,
    required int capacity,
    List<int>? daysOfWeek,
    String? startTime,
    List<RecurringSlot>? slots,
    int? weeksCount,
    DateTime? startsFromDate,
    String timezone = 'Asia/Ho_Chi_Minh',
  }) async {
    final raw =
        await ApiClient.post(
              '/fitness/training-sessions/recurring',
              accessToken,
              body: {
                'studioId': studioId,
                'trainingId': trainingId,
                if (trainerId != null && trainerId.isNotEmpty)
                  'trainerId': trainerId,
                if (locationId != null && locationId.isNotEmpty)
                  'locationId': locationId,
                'capacity': capacity,
                if (daysOfWeek != null) 'daysOfWeek': daysOfWeek,
                if (startTime != null) 'startTime': startTime,
                if (slots != null && slots.isNotEmpty)
                  'slots': slots.map((s) => s.toJson()).toList(),
                if (weeksCount != null) 'weeksCount': weeksCount,
                'timezone': timezone,
                if (startsFromDate != null)
                  'startsFromDate': startsFromDate.toIso8601String(),
              },
            )
            as Map<String, dynamic>?;
    if (raw == null) {
      throw ApiException('Invalid recurring creation response');
    }
    final data = raw['data'];
    if (data is Map<String, dynamic>) {
      return RecurringCreationResult.fromJson(data);
    }
    return const RecurringCreationResult(createdCount: 0, skippedCount: 0);
  }
}

class StudioOnboardingStep {
  const StudioOnboardingStep({required this.required, required this.completed});

  final bool required;
  final bool completed;

  factory StudioOnboardingStep.fromJson(Map<String, dynamic> json) {
    return StudioOnboardingStep(
      required: json['required'] == true,
      completed: json['completed'] == true,
    );
  }
}

class StudioOnboardingChecklist {
  const StudioOnboardingChecklist({
    required this.studioId,
    required this.status,
    required this.requiredCompleted,
    required this.canPublish,
    required this.missingRequiredSteps,
    required this.hasTraining,
    required this.hasPhoto,
    required this.hasLogo,
    required this.bookingWindowConfigured,
    required this.contactsConfigured,
  });

  final String studioId;
  final String status;
  final bool requiredCompleted;
  final bool canPublish;
  final List<String> missingRequiredSteps;
  final StudioOnboardingStep hasTraining;
  final StudioOnboardingStep hasPhoto;
  final StudioOnboardingStep hasLogo;
  final StudioOnboardingStep bookingWindowConfigured;
  final StudioOnboardingStep contactsConfigured;

  factory StudioOnboardingChecklist.fromJson(Map<String, dynamic> json) {
    final rawSteps = json['steps'];
    final steps = rawSteps is Map<String, dynamic>
        ? rawSteps
        : <String, dynamic>{};

    StudioOnboardingStep parseStep(String key, bool required) {
      final raw = steps[key];
      if (raw is Map<String, dynamic>) {
        return StudioOnboardingStep.fromJson(raw);
      }
      return StudioOnboardingStep(required: required, completed: false);
    }

    final missingRaw = json['missingRequiredSteps'];
    final missing = <String>[];
    if (missingRaw is List) {
      for (final item in missingRaw) {
        final value = item?.toString();
        if (value != null && value.isNotEmpty) missing.add(value);
      }
    }

    return StudioOnboardingChecklist(
      studioId: (json['studioId'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
      requiredCompleted: json['requiredCompleted'] == true,
      canPublish: json['canPublish'] == true,
      missingRequiredSteps: missing,
      hasTraining: parseStep('hasTraining', true),
      hasPhoto: parseStep('hasPhoto', true),
      hasLogo: parseStep('hasLogo', false),
      bookingWindowConfigured: parseStep('bookingWindowConfigured', false),
      contactsConfigured: parseStep('contactsConfigured', false),
    );
  }
}
