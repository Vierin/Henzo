import '../models/trainer_info.dart';
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
    String trainerId,
  ) async {
    final raw = await ApiClient.post(
      '/trainers/$trainerId/invite',
      token,
      body: {},
    );
    return Map<String, dynamic>.from(raw as Map);
  }

  static Future<Map<String, dynamic>> generateInviteFromStaff(
    String token,
    String staffId,
  ) async {
    final raw = await ApiClient.post(
      '/trainers/staff/$staffId/invite',
      token,
      body: {},
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
}
