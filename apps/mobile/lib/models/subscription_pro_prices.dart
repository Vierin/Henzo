/// Ответ GET /subscriptions/pro-prices (цены Pro в VND для экрана подписки).
class SubscriptionProPrices {
  SubscriptionProPrices({
    required this.monthlyVnd,
    required this.annualVnd,
    required this.twelveMonthsCompareVnd,
    required this.annualSavePercent,
  });

  final int monthlyVnd;
  final int annualVnd;
  /// 12× месячная — для зачёркнутой суммы при годовом тарифе.
  final int twelveMonthsCompareVnd;
  final int annualSavePercent;

  factory SubscriptionProPrices.fromJson(Map<String, dynamic> json) {
    int req(String k) => (json[k] as num).toInt();
    return SubscriptionProPrices(
      monthlyVnd: req('monthlyVnd'),
      annualVnd: req('annualVnd'),
      twelveMonthsCompareVnd: req('twelveMonthsCompareVnd'),
      annualSavePercent: req('annualSavePercent'),
    );
  }

  /// Если API недоступен — те же базовые суммы, что раньше были захардкожены.
  factory SubscriptionProPrices.fallbackStatic() {
    const monthly = 395000;
    const annual = 3980000;
    final twelve = monthly * 12;
    final pct = twelve > annual
        ? (((twelve - annual) / twelve) * 100).round()
        : 0;
    return SubscriptionProPrices(
      monthlyVnd: monthly,
      annualVnd: annual,
      twelveMonthsCompareVnd: twelve,
      annualSavePercent: pct,
    );
  }
}
