import '../services/api_client.dart';

class StudioClaimApiService {
  StudioClaimApiService._();

  static Future<Map<String, dynamic>> getClaimPreview(String token) async {
    final raw = await ApiClient.get('/studios/claim/$token', null);
    return Map<String, dynamic>.from(raw as Map);
  }

  static Future<Map<String, dynamic>> lookupByEmail(String email) async {
    final raw = await ApiClient.post(
      '/studios/claim/lookup',
      null,
      body: {'email': email.trim()},
    );
    return Map<String, dynamic>.from(raw as Map);
  }

  static Future<Map<String, dynamic>> completeWithPassword({
    required String claimToken,
    required String email,
    required String password,
    bool confirmBooking = false,
  }) async {
    final raw = await ApiClient.post(
      '/studios/claim/$claimToken/complete',
      null,
      body: {
        'email': email.trim(),
        'password': password,
        'confirmBooking': confirmBooking,
      },
    );
    return Map<String, dynamic>.from(raw as Map);
  }

  static Future<void> acceptClaim(
    String accessToken,
    String claimToken, {
    bool confirmBooking = false,
  }) async {
    await ApiClient.post(
      '/studios/claim/$claimToken/accept',
      accessToken,
      body: {'confirmBooking': confirmBooking},
    );
  }

  static Future<Map<String, dynamic>> acceptPending(String accessToken) async {
    final raw = await ApiClient.post(
      '/studios/claim/accept-pending',
      accessToken,
      body: {},
    );
    return Map<String, dynamic>.from(raw as Map);
  }
}
