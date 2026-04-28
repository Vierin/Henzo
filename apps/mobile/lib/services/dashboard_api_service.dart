import 'package:flutter/foundation.dart';

import 'api_client.dart';
import '../models/booking.dart';
import '../models/salon.dart';
import '../models/subscription.dart';
import '../models/time_block.dart';

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
  final String trainerName;

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
    required this.trainerName,
  });

  factory OwnerTrainingSession.fromJson(Map<String, dynamic> json) {
    final attendance = json['attendanceSummary'];
    final training = json['training'];
    final trainer = json['trainer'];
    return OwnerTrainingSession(
      sessionId: (json['sessionId'] ?? '').toString(),
      trainingId: (json['trainingId'] ??
              (training is Map<String, dynamic> ? training['id'] : null) ??
              '')
          .toString(),
      startsAt:
          DateTime.tryParse((json['startsAt'] ?? '').toString()) ??
          DateTime.now(),
      endsAt:
          DateTime.tryParse((json['endsAt'] ?? '').toString()) ??
          DateTime.now(),
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
      trainerName: trainer is Map<String, dynamic>
          ? (trainer['name'] ?? '—').toString()
          : '—',
    );
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

  const RecurringSlot({
    required this.day,
    required this.startTime,
  });

  Map<String, dynamic> toJson() => {
    'day': day,
    'startTime': startTime,
  };
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
      clientsTotal: clients is Map<String, dynamic> ? _asInt(clients['total']) : 0,
      clientsRegular:
          clients is Map<String, dynamic> ? _asInt(clients['regular']) : 0,
      clientsNewInPeriod:
          clients is Map<String, dynamic> ? _asInt(clients['newInPeriod']) : 0,
      clientsInactive:
          clients is Map<String, dynamic> ? _asInt(clients['inactive']) : 0,
    );
  }
}

class DashboardApiService {
  static bool _isRouteMissing(ApiException e) =>
      e.statusCode == 404 && e.message.contains('Cannot GET');

  /// GET /fitness/studios/current — студия владельца.
  static Future<Salon?> getCurrentSalon(String accessToken) async {
    try {
      final body = await ApiClient.get('/fitness/studios/current', accessToken);
      if (body is! Map<String, dynamic>) return null;
      if (body['success'] != true) {
        if (kDebugMode) debugPrint('[DashboardAPI] salon success=false');
        return null;
      }
      if (body['needsSetup'] == true) {
        if (kDebugMode) debugPrint('[DashboardAPI] salon needsSetup=true');
        return null;
      }
      final data = body['data'];
      if (data == null || data is! Map<String, dynamic>) return null;
      return Salon.fromJson(Map<String, dynamic>.from(data));
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
      final body = await ApiClient.get(
        '/studios/current/onboarding-checklist',
        accessToken,
      );
      if (body is! Map<String, dynamic>) return null;
      final data = body['data'];
      if (data is! Map<String, dynamic>) return null;
      return StudioOnboardingChecklist.fromJson(Map<String, dynamic>.from(data));
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
      final list = await ApiClient.get(
        '/fitness/session-bookings/owner?limit=100',
        accessToken,
      );
      if (list is! List) return [];
      final result = <Booking>[];
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
        } catch (_) {}
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

  static Future<RecurringCreationResult> createRecurringTrainingSessions(
    String accessToken, {
    required String studioId,
    required String trainingId,
    String? trainerId,
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
      bookingWindowConfigured: parseStep('bookingWindowConfigured', false),
      contactsConfigured: parseStep('contactsConfigured', false),
    );
  }
}
