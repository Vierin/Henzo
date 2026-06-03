import 'package:flutter/foundation.dart';

/// Bump after IAP purchase/restore so dashboard/subscription screens reload.
class SubscriptionRefreshNotifier extends ChangeNotifier {
  void notifySubscriptionMaybeChanged() => notifyListeners();
}
