class OwnerStudioClientRow {
  const OwnerStudioClientRow({
    required this.userId,
    required this.name,
    this.email,
    this.phone,
    required this.isGuest,
    required this.visitsCount,
    required this.lastVisit,
    this.notes,
    this.source,
  });

  final String userId;
  final String? name;
  final String? email;
  final String? phone;
  final bool isGuest;
  final int visitsCount;
  final DateTime lastVisit;
  final String? notes;
  final String? source;

  factory OwnerStudioClientRow.fromJson(Map<String, dynamic> json) {
    return OwnerStudioClientRow(
      userId: json['userId'] as String,
      name: json['name'] as String?,
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      isGuest: json['isGuest'] as bool? ?? true,
      visitsCount: (json['visitsCount'] as num?)?.toInt() ?? 0,
      lastVisit: DateTime.parse(json['lastVisit'] as String),
      notes: json['notes'] as String?,
      source: json['source'] as String?,
    );
  }
}

class OwnerStudioClientSearchHit {
  const OwnerStudioClientSearchHit({
    required this.userId,
    this.name,
    this.email,
    this.phone,
    required this.isGuest,
  });

  final String userId;
  final String? name;
  final String? email;
  final String? phone;
  final bool isGuest;

  factory OwnerStudioClientSearchHit.fromJson(Map<String, dynamic> json) {
    return OwnerStudioClientSearchHit(
      userId: json['userId'] as String,
      name: json['name'] as String?,
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      isGuest: json['isGuest'] as bool? ?? true,
    );
  }
}
