import '../l10n/locale_provider.dart';

/// Solo / Studio / Enterprise — feature copy lives in l10n only.
enum SubscriptionPlanTier { solo, studio, enterprise }

int subscriptionPlanFeatureCount(SubscriptionPlanTier tier) => switch (tier) {
      SubscriptionPlanTier.solo => 6,
      SubscriptionPlanTier.studio => 5,
      SubscriptionPlanTier.enterprise => 6,
    };

String subscriptionPlanTitleKey(SubscriptionPlanTier tier) => switch (tier) {
      SubscriptionPlanTier.solo => 'subscription.soloTitle',
      SubscriptionPlanTier.studio => 'subscription.studioTitle',
      SubscriptionPlanTier.enterprise => 'subscription.enterpriseTitle',
    };

String subscriptionPlanTaglineKey(SubscriptionPlanTier tier) => switch (tier) {
      SubscriptionPlanTier.solo => 'subscription.soloTagline',
      SubscriptionPlanTier.studio => 'subscription.studioTagline',
      SubscriptionPlanTier.enterprise => 'subscription.enterpriseTagline',
    };

String subscriptionPlanFeatureKey(SubscriptionPlanTier tier, int index) {
  final prefix = switch (tier) {
    SubscriptionPlanTier.solo => 'solo',
    SubscriptionPlanTier.studio => 'studio',
    SubscriptionPlanTier.enterprise => 'enterprise',
  };
  return 'subscription.feature_${prefix}_$index';
}

List<String> subscriptionPlanFeatureLabels(
  LocaleProvider locale,
  SubscriptionPlanTier tier,
) {
  final count = subscriptionPlanFeatureCount(tier);
  return [
    for (var i = 1; i <= count; i++)
      locale.t(subscriptionPlanFeatureKey(tier, i)),
  ];
}

SubscriptionPlanTier subscriptionPlanTierFromActiveCode(String? code) {
  switch (code?.toLowerCase()) {
    case 'enterprise':
      return SubscriptionPlanTier.enterprise;
    case 'studio':
      return SubscriptionPlanTier.studio;
    default:
      return SubscriptionPlanTier.solo;
  }
}

SubscriptionPlanTier subscriptionPlanTierFromSubscriptionType(String? type) {
  final t = (type ?? 'SOLO').toUpperCase();
  if (t == 'ENTERPRISE') return SubscriptionPlanTier.enterprise;
  if (t == 'STUDIO' || t == 'PRO') return SubscriptionPlanTier.studio;
  return SubscriptionPlanTier.solo;
}
