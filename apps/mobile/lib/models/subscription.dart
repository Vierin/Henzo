/// Текущая подписка салона (GET /subscriptions/current).
class Subscription {
  final String id;
  final String salonId;
  final String type; // FREEMIUM, PRO
  final String status; // ACTIVE, INACTIVE, CANCELLED, EXPIRED
  final String startDate;
  final double? amount;

  Subscription({
    required this.id,
    required this.salonId,
    required this.type,
    required this.status,
    required this.startDate,
    this.amount,
  });

  bool get isActive => status == 'ACTIVE';
  bool get isExpired => status == 'EXPIRED';
  bool get isCancelled => status == 'CANCELLED';

  factory Subscription.fromJson(Map<String, dynamic> json) {
    final amountRaw = json['amount'];
    double? amount;
    if (amountRaw != null) {
      amount = amountRaw is num
          ? amountRaw.toDouble()
          : double.tryParse(amountRaw.toString());
    }
    return Subscription(
      id: (json['id']?.toString() ?? '').trim(),
      salonId: (json['salonId']?.toString() ?? '').trim(),
      type: (json['type'] as String?) ?? 'FREEMIUM',
      status: (json['status'] as String?) ?? 'INACTIVE',
      startDate: (json['startDate'] as String?) ?? '',
      amount: amount,
    );
  }
}
