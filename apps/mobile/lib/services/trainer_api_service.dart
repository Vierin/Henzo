import '../models/studio.dart';
import '../models/trainer_info.dart';
import 'cache/studio_public_detail_cache.dart';
import 'dashboard_api_service.dart';
import '../utils/formatters.dart';
import 'api_client.dart';

class TrainerApiService {
  TrainerApiService._();

  /// Returns null if current user is not a trainer.
  static Future<TrainerInfo?> getMyProfile(String token) async {
    try {
      final raw = await ApiClient.get('/trainers/me/profile', token);
      if (raw is! Map<String, dynamic>) return null;
      return TrainerInfo.fromJson(raw);
    } on ApiException catch (e) {
      if (e.statusCode == 404) return null;
      rethrow;
    }
  }

  static Future<Map<String, dynamic>> generateInvite(
    String token,
    String trainerId, {
    String? sendToEmail,
  }) async {
    final raw = await ApiClient.post(
      '/trainers/$trainerId/invite',
      token,
      body: {
        'sendToEmail': ?sendToEmail,
      },
    );
    return Map<String, dynamic>.from(raw as Map);
  }

  static Future<Map<String, dynamic>> getInviteInfo(String inviteToken) async {
    final raw = await ApiClient.get('/trainers/invite/$inviteToken', null);
    return Map<String, dynamic>.from(raw as Map);
  }

  static Future<void> acceptInvite(String token, String inviteToken) async {
    await ApiClient.post('/trainers/invite/$inviteToken/accept', token, body: {});
  }

  static Future<Map<String, dynamic>> getSessions(
    String token, {
    DateTime? from,
    DateTime? to,
  }) async {
    final params = StringBuffer('/fitness/trainer/sessions');
    if (from != null || to != null) {
      params.write('?');
      if (from != null) params.write('from=${Uri.encodeComponent(from.toIso8601String())}');
      if (from != null && to != null) params.write('&');
      if (to != null) params.write('to=${Uri.encodeComponent(to.toIso8601String())}');
    }
    final raw = await ApiClient.get(params.toString(), token);
    return Map<String, dynamic>.from(raw as Map);
  }

  static Future<List<Map<String, dynamic>>> getSessionEnrollments(
    String token,
    String sessionId,
  ) async {
    final raw = await ApiClient.get('/fitness/trainer/sessions/$sessionId/enrollments', token);
    if (raw is! List) return [];
    return raw.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
  }

  /// Public studio payload for trainer location labels.
  static Future<Studio?> fetchStudioForLocations(String studioId) async {
    if (studioId.isEmpty) return null;
    try {
      final cached = StudioPublicDetailCache.get(studioId);
      if (cached != null) return Studio.fromJson(cached);
      final raw = await ApiClient.get('/studios/$studioId', null);
      if (raw is! Map<String, dynamic>) return null;
      StudioPublicDetailCache.put(studioId, raw);
      return Studio.fromJson(raw);
    } catch (_) {
      return null;
    }
  }

  static Future<void> markAttendance(
    String token,
    String enrollmentId, {
    required bool present,
  }) async {
    await ApiClient.patch(
      '/fitness/trainer/enrollments/$enrollmentId/attendance',
      token,
      body: {'status': present ? 'ACTIVE' : 'NO_SHOW'},
    );
  }

  static OwnerTrainingSession ownerSessionFromTrainerMap(
    Map<String, dynamic> json, {
    required String trainerName,
  }) {
    final training = json['Training'] is Map
        ? Map<String, dynamic>.from(json['Training'] as Map)
        : <String, dynamic>{};
    return OwnerTrainingSession(
      sessionId: (json['id'] ?? '').toString(),
      trainingId: (training['id'] ?? '').toString(),
      startsAt: parseApiDateTime(json['startsAt']) ?? DateTime.now(),
      endsAt: parseApiDateTime(json['endsAt']) ?? DateTime.now(),
      status: (json['status'] ?? 'ACTIVE').toString(),
      capacity: (json['capacity'] as num?)?.toInt() ?? 0,
      enrolledCount: (json['bookedCount'] as num?)?.toInt() ?? 0,
      attendedCount: 0,
      trainingName: (training['name'] ?? 'Training').toString(),
      trainingDurationMinutes: (training['duration'] as num?)?.toInt(),
      trainingDisplayColorHex: training['displayColor']?.toString(),
      trainerName: trainerName,
      locationId: json['locationId']?.toString(),
      waitlistCount: (json['waitlistCount'] as num?)?.toInt() ?? 0,
    );
  }
}
