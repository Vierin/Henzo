import '../models/booking.dart';

String clientIdentityKey(Booking booking) {
  final user = booking.user;
  final key = (user?.email ?? user?.phone ?? user?.name ?? '').trim();
  if (key.isNotEmpty) return key;
  return 'booking:${booking.id}';
}
