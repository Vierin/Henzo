import '../services/dashboard_api_service.dart';
import 'subscription_tier.dart';

/// Studio / Enterprise: trainer picker, extra staff, etc.
/// Uses API subscription row (synced from RevenueCat on purchase/restore).
Future<bool> resolveOwnerHasPaidPlan(String accessToken) async {
  final sub = await DashboardApiService.getCurrentSubscription(accessToken);
  return subscriptionIsActivePaid(type: sub?.type, status: sub?.status);
}
