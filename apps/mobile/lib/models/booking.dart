class Booking {
  final String id;
  final DateTime dateTime;
  final BookingStatus status;
  final Service? service;
  final User? user;
  final Staff? staff;
  final String? staffId;
  final String? serviceId;
  final String? notes;
  final String? locationId;
  final String? locationName;

  Booking({
    required this.id,
    required this.dateTime,
    required this.status,
    this.service,
    this.user,
    this.staff,
    this.staffId,
    this.serviceId,
    this.notes,
    this.locationId,
    this.locationName,
  });

  /// ID сотрудника (из staff.id или staffId в ответе API).
  String? get effectiveStaffId => staff?.id ?? staffId;

  factory Booking.fromJson(Map<String, dynamic> json) {
    final staffIdRaw = json['staffId'];
    final staffId = staffIdRaw?.toString();
    final serviceIdRaw = json['serviceId'];
    final serviceId = serviceIdRaw?.toString();
    final serviceMap = _serviceLikeMap(json);
    return Booking(
      id: json['id'] as String,
      dateTime: DateTime.parse(json['dateTime'] as String),
      status: BookingStatus.fromString(json['status'] as String),
      service: serviceMap != null ? Service.fromJson(serviceMap) : null,
      user: json['user'] != null
          ? User.fromJson(json['user'] as Map<String, dynamic>)
          : null,
      staff: json['staff'] != null
          ? Staff.fromJson(json['staff'] as Map<String, dynamic>)
          : null,
      staffId: staffId,
      serviceId: serviceId,
      notes: json['notes'] as String?,
      locationId: json['locationId']?.toString(),
      locationName: json['locationName']?.toString(),
    );
  }

  /// API may send [service] or nest training under [training].
  static Map<String, dynamic>? _serviceLikeMap(Map<String, dynamic> json) {
    final s = json['service'];
    if (s is Map<String, dynamic>) return s;
    final t = json['training'];
    if (t is Map<String, dynamic>) return t;
    return null;
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'dateTime': dateTime.toIso8601String(),
      'status': status.toString(),
      'service': service?.toJson(),
      'user': user?.toJson(),
      'staff': staff?.toJson(),
      'serviceId': serviceId,
      'notes': notes,
    };
  }
}

enum BookingStatus {
  pending,
  confirmed,
  completed,
  canceled,
  noShow;

  static BookingStatus fromString(String status) {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return BookingStatus.pending;
      case 'CONFIRMED':
        return BookingStatus.confirmed;
      // Групповые занятия: активная запись в SessionEnrollment.
      case 'ACTIVE':
        return BookingStatus.confirmed;
      case 'COMPLETED':
        return BookingStatus.completed;
      case 'CANCELED':
      case 'CANCELLED':
        return BookingStatus.canceled;
      case 'NO_SHOW':
      case 'NOSHOW':
        return BookingStatus.noShow;
      default:
        return BookingStatus.pending;
    }
  }

  @override
  String toString() {
    switch (this) {
      case BookingStatus.pending:
        return 'PENDING';
      case BookingStatus.confirmed:
        return 'CONFIRMED';
      case BookingStatus.completed:
        return 'COMPLETED';
      case BookingStatus.canceled:
        return 'CANCELED';
      case BookingStatus.noShow:
        return 'NO_SHOW';
    }
  }
}

class Service {
  final String name;
  final double? price;
  final int? duration;

  Service({
    required this.name,
    this.price,
    this.duration,
  });

  factory Service.fromJson(Map<String, dynamic> json) {
    final name = (json['name'] as String?) ??
        (json['nameEn'] as String?) ??
        (json['nameVi'] as String?) ??
        (json['nameRu'] as String?) ??
        '';
    return Service(
      name: name,
      price: _parseOptionalDouble(json['price']) ??
          _parseOptionalDouble(json['amount']),
      duration: _parseOptionalInt(json['duration']),
    );
  }

  static double? _parseOptionalDouble(dynamic v) {
    if (v == null) return null;
    if (v is num) return v.toDouble();
    if (v is String) return double.tryParse(v.trim());
    return null;
  }

  static int? _parseOptionalInt(dynamic v) {
    if (v == null) return null;
    if (v is int) return v;
    if (v is num) return v.toInt();
    if (v is String) return int.tryParse(v.trim());
    return null;
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'price': price,
      'duration': duration,
    };
  }
}

class User {
  final String? id;
  final String? name;
  final String? email;
  final String? phone;

  User({
    this.id,
    this.name,
    this.email,
    this.phone,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id']?.toString(),
      name: json['name'] as String?,
      email: json['email'] as String?,
      phone: json['phone'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'phone': phone,
    };
  }
}

class Staff {
  final String? id;
  final String name;

  Staff({this.id, required this.name});

  factory Staff.fromJson(Map<String, dynamic> json) {
    final idRaw = json['id'];
    final id = idRaw?.toString();
    return Staff(
      id: id,
      name: json['name'] as String? ?? '—',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
    };
  }
}


