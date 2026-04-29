import 'package:flutter/foundation.dart';

import 'api_client.dart';
import '../models/subscription.dart';

/// Интервал подписки (как в веб).
typedef SubscriptionInterval = String; // 'monthly' | 'annual'

class SubscriptionApiService {
  /// GET /subscriptions/current — текущая подписка владельца.
  static Future<Subscription?> getCurrent(String accessToken) async {
    try {
      final body = await ApiClient.get('/subscriptions/current', accessToken);
      if (body is! Map<String, dynamic>) return null;
      final data = body['data'];
      if (data is Map<String, dynamic>) {
        return Subscription.fromJson(Map<String, dynamic>.from(data));
      }
      return Subscription.fromJson(body);
    } on ApiException catch (e) {
      if (kDebugMode) debugPrint('[SubscriptionAPI] getCurrent: $e');
      return null;
    }
  }

  /// POST /subscriptions/create-checkout-session — URL для оплаты.
  static Future<String?> createCheckoutSession(
    String accessToken,
    SubscriptionInterval interval,
  ) async {
    try {
      final body =
          await ApiClient.post(
                '/subscriptions/create-checkout-session',
                accessToken,
                body: {'interval': interval},
              )
              as Map<String, dynamic>?;
      return body?['url'] as String?;
    } on ApiException catch (e) {
      if (kDebugMode) debugPrint('[SubscriptionAPI] createCheckoutSession: $e');
      rethrow;
    }
  }
}
