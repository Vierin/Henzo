import 'package:flutter/foundation.dart';

import 'api_client.dart';
import '../models/subscription.dart';
import '../models/subscription_pro_prices.dart';

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

  /// POST /subscriptions/sync-checkout-session — после успешного Stripe Checkout (web).
  static Future<Subscription?> syncCheckoutSession(
    String accessToken,
    String sessionId,
  ) async {
    try {
      final body =
          await ApiClient.post(
                '/subscriptions/sync-checkout-session',
                accessToken,
                body: {'sessionId': sessionId},
              )
              as Map<String, dynamic>?;
      if (body == null) return null;
      final data = body['data'];
      if (data is Map<String, dynamic>) {
        return Subscription.fromJson(Map<String, dynamic>.from(data));
      }
      return Subscription.fromJson(Map<String, dynamic>.from(body));
    } on ApiException catch (e) {
      if (kDebugMode) debugPrint('[SubscriptionAPI] syncCheckoutSession: $e');
      rethrow;
    }
  }

  /// GET /subscriptions/pro-prices — суммы Pro в VND (Stripe + кеш на бэкенде).
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
