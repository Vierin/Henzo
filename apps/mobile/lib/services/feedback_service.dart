import 'api_client.dart';

/// Sends in-app feedback to Telegram via the backend (no email).
class FeedbackService {
  FeedbackService._();

  static Future<void> sendFeedback({
    required String name,
    required String email,
    required String message,
    String? accessToken,
  }) async {
    await ApiClient.post(
      '/contact/feedback',
      accessToken,
      body: {
        'name': name,
        'email': email,
        'message': message,
      },
    );
  }
}
