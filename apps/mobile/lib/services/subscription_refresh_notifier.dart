import 'package:flutter/foundation.dart';

/// Bump after Stripe checkout or sync so dashboard/subscription screens reload.
class SubscriptionRefreshNotifier extends ChangeNotifier {
  void notifySubscriptionMaybeChanged() => notifyListeners();
}
