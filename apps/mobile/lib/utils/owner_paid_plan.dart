import 'package:purchases_flutter/purchases_flutter.dart';

import '../services/dashboard_api_service.dart';
import '../services/revenuecat_service.dart';
import 'subscription_tier.dart';

/// Studio / Enterprise: trainer picker, extra staff, etc.
/// Matches [SubscriptionScreen] — API tier or active RevenueCat entitlement.
Future<bool> resolveOwnerHasPaidPlan(String accessToken) async {
  final sub = await DashboardApiService.getCurrentSubscription(accessToken);
  if (subscriptionTypeIsPaid(sub?.type)) return true;

  if (!RevenueCatService.isConfigured) return false;
  try {
    final info = await Purchases.getCustomerInfo();
    return RevenueCatService.getActiveTier(info) != null;
  } catch (_) {
    return false;
  }
}
