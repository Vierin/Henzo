/// Response from GET /subscriptions/pro-prices (EUR major units for display).
/// Mobile paywall uses RevenueCat store prices; this is optional/legacy.
class SubscriptionProPrices {
  SubscriptionProPrices({
    required this.monthly,
    required this.annual,
    required this.twelveMonthsCompare,
    required this.annualSavePercent,
    this.currency = 'EUR',
  });

  final double monthly;
  final double annual;

  /// 12× monthly — strikethrough compare for annual.
  final double twelveMonthsCompare;
  final int annualSavePercent;
  final String currency;

  /// Legacy aliases (older callers).
  int get monthlyVnd => monthly.round();
  int get annualVnd => annual.round();
  int get twelveMonthsCompareVnd => twelveMonthsCompare.round();

  factory SubscriptionProPrices.fromJson(Map<String, dynamic> json) {
    double numField(String primary, [String? legacy]) {
      final v = json[primary] ?? (legacy != null ? json[legacy] : null);
      if (v is num) return v.toDouble();
      return 0;
    }

    return SubscriptionProPrices(
      monthly: numField('monthly', 'monthlyVnd'),
      annual: numField('annual', 'annualVnd'),
      twelveMonthsCompare: numField(
        'twelveMonthsCompare',
        'twelveMonthsCompareVnd',
      ),
      annualSavePercent: (json['annualSavePercent'] as num?)?.toInt() ?? 0,
      currency: (json['currency'] as String?)?.toUpperCase() ?? 'EUR',
    );
  }

  factory SubscriptionProPrices.fallbackStatic() {
    const monthly = 22.99;
    const annual = 229.9;
    final twelve = monthly * 12;
    final pct = twelve > annual
        ? (((twelve - annual) / twelve) * 100).round()
        : 0;
    return SubscriptionProPrices(
      monthly: monthly,
      annual: annual,
      twelveMonthsCompare: twelve,
      annualSavePercent: pct,
    );
  }
}
