import 'booking.dart';
import 'studio.dart';
import 'service_item.dart';
import 'staff_member.dart';

/// Fitness domain aliases used during pivot without DB/model rename.
typedef Studio = Studio;
typedef Offering = ServiceItem;
typedef Trainer = StaffMember;
typedef SessionBooking = Booking;

class DomainAdapters {
  const DomainAdapters._();

  static Studio studioFromJson(Map<String, dynamic> json) => Studio.fromJson(json);
  static Offering offeringFromJson(Map<String, dynamic> json) =>
      ServiceItem.fromJson(json);
  static Trainer trainerFromJson(Map<String, dynamic> json) =>
      StaffMember.fromJson(json);
  static SessionBooking sessionBookingFromJson(Map<String, dynamic> json) =>
      Booking.fromJson(json);
}
