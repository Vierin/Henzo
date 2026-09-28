/// Текущая подписка салона (GET /subscriptions/current).
class Subscription {
  final String id;
  final String studioId;
  final String type; // SOLO, STUDIO, ENTERPRISE
  final String status; // ACTIVE, INACTIVE, CANCELLED, EXPIRED
  final String startDate;
  /// ISO 8601 end of current billing period, if known.
  final String? currentPeriodEnd;
  final String billingProvider;
  final bool isTrial;
  final bool hasAccess;

  Subscription({
    required this.id,
    required this.studioId,
    required this.type,
    required this.status,
    required this.startDate,
    this.currentPeriodEnd,
    this.billingProvider = 'NONE',
    this.isTrial = false,
    this.hasAccess = true,
  });

  bool get isActive => status == 'ACTIVE';
  bool get isExpired => status == 'EXPIRED';
  bool get isCancelled => status == 'CANCELLED';

  factory Subscription.fromJson(Map<String, dynamic> json) {
    final cpe = json['currentPeriodEnd'];
    return Subscription(
      id: (json['id']?.toString() ?? '').trim(),
      studioId: (json['studioId']?.toString() ?? '').trim(),
      type: (json['type'] as String?) ?? 'SOLO',
      status: (json['status'] as String?) ?? 'INACTIVE',
      startDate: (json['startDate'] as String?) ?? '',
      currentPeriodEnd: cpe is String && cpe.isNotEmpty ? cpe : null,
      billingProvider:
          (json['billingProvider'] as String?)?.trim().isNotEmpty == true
          ? (json['billingProvider'] as String).trim()
          : 'NONE',
      isTrial: json['isTrial'] == true,
      hasAccess: json['hasAccess'] != false,
    );
  }
}
