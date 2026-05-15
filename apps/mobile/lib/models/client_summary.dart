/// Summary of a client derived from bookings (deduplicated by key).
class ClientSummary {
  const ClientSummary({
    required this.key,
    required this.name,
    this.userId,
    this.email,
    this.phone,
    required this.lastVisit,
    required this.isSleeper,
    required this.visitsCount,
    required this.isBlocked,
    this.isGuest,
  });

  final String key;
  final String name;
  final String? userId;
  final String? email;
  final String? phone;
  final DateTime lastVisit;
  final bool isSleeper;
  final int visitsCount;
  final bool isBlocked;
  /// From salon roster API; null if unknown (legacy booking-only row).
  final bool? isGuest;
}
