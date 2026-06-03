import 'package:flutter/foundation.dart';

import 'api_client.dart';
import '../models/subscription.dart';
import '../models/subscription_pro_prices.dart';

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

  /// POST /subscriptions/sync-revenuecat — после покупки / restore в App Store / Play.
  static Future<Subscription?> syncRevenueCat(String accessToken) async {
    try {
      final body =
          await ApiClient.post(
                '/subscriptions/sync-revenuecat',
                accessToken,
              )
              as Map<String, dynamic>?;
      if (body == null) return null;
      final data = body['data'];
      if (data is Map<String, dynamic>) {
        return Subscription.fromJson(Map<String, dynamic>.from(data));
      }
      return Subscription.fromJson(Map<String, dynamic>.from(body));
    } on ApiException catch (e) {
      if (kDebugMode) debugPrint('[SubscriptionAPI] syncRevenueCat: $e');
      rethrow;
    }
  }

  /// GET /subscriptions/pro-prices — суммы Pro в VND (кеш на бэкенде).
  static Future<SubscriptionProPrices?> getProPrices(String accessToken) async {
    try {
      final body =
          await ApiClient.get('/subscriptions/pro-prices', accessToken);
      if (body is! Map<String, dynamic>) return null;
      final data = body['data'];
      if (data is Map<String, dynamic>) {
        return SubscriptionProPrices.fromJson(
          Map<String, dynamic>.from(data),
        );
      }
      return null;
    } on ApiException catch (e) {
      if (kDebugMode) debugPrint('[SubscriptionAPI] getProPrices: $e');
      return null;
    }
  }
}
