import '../models/booking.dart';

String clientIdentityKey(Booking booking) {
  final user = booking.user;
  final key = (user?.email ?? user?.phone ?? user?.name ?? '').trim();
  if (key.isNotEmpty) return key;
  return 'booking:${booking.id}';
}

/// Stable key for roster / profile rows (not tied to [Booking]).
String clientProfileIdentityKey({
  String? userId,
  String? email,
  String? phone,
  String? name,
}) {
  final e = email?.trim().toLowerCase();
  if (e != null && e.isNotEmpty) return e;
  final p = phone?.trim();
  if (p != null && p.isNotEmpty) return p;
  final uid = userId?.trim();
  if (uid != null && uid.isNotEmpty) return 'user:$uid';
  final n = name?.trim().toLowerCase();
  if (n != null && n.isNotEmpty) return n;
  return '';
}
