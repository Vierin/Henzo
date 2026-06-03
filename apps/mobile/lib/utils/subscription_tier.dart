/// Plan tier from API (`Subscription.type`) or RevenueCat.
bool subscriptionTypeIsSolo(String? type) {
  final t = (type ?? 'SOLO').toUpperCase();
  return t.isEmpty || t == 'SOLO' || t == 'FREEMIUM';
}

bool subscriptionTypeIsPaid(String? type) {
  final t = (type ?? '').toUpperCase();
  return t == 'STUDIO' ||
      t == 'ENTERPRISE' ||
      t == 'PRO';
}

String subscriptionPlanLabelKey(String? type) {
  final t = (type ?? 'SOLO').toUpperCase();
  switch (t) {
    case 'ENTERPRISE':
      return 'subscription.enterpriseTitle';
    case 'STUDIO':
    case 'PRO':
      return 'subscription.studioTitle';
    default:
      return 'subscription.solo';
  }
}
