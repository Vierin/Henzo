/// Сотрудник студии для экрана «Персонал».
class StaffMember {
  final String id;
  final String name;
  final String? email;
  final String? phone;
  final String studioId;
  final String? accessLevel;
  final String? userId;
  /// PENDING | ACCEPTED | EXPIRED, null if no invite sent.
  final String? inviteStatus;
  final DateTime? inviteExpiresAt;

  StaffMember({
    required this.id,
    required this.name,
    this.email,
    this.phone,
    required this.studioId,
    this.accessLevel,
    this.userId,
    this.inviteStatus,
    this.inviteExpiresAt,
  });

  bool get hasLinkedAccount =>
      userId != null && userId!.trim().isNotEmpty;

  bool get hasPendingInvite {
    if (hasLinkedAccount) return false;
    if (inviteStatus == null) return false;
    if (inviteStatus == 'ACCEPTED') return false;
    if (inviteStatus == 'EXPIRED') return false;
    if (inviteExpiresAt != null &&
        inviteExpiresAt!.isBefore(DateTime.now())) {
      return false;
    }
    return inviteStatus == 'PENDING';
  }

  factory StaffMember.fromJson(Map<String, dynamic> json) {
    final idRaw = json['id'];
    final id = idRaw == null ? '' : idRaw.toString();
    final studioIdRaw = json['studioId'] ?? json['salonId'];
    final studioId =
        studioIdRaw == null ? '' : studioIdRaw.toString();
    final userIdRaw = json['userId'];
    final invite = json['invite'];
    String? inviteStatus;
    DateTime? inviteExpiresAt;
    if (invite is Map) {
      inviteStatus = invite['status']?.toString();
      final exp = invite['expiresAt'];
      if (exp != null) {
        inviteExpiresAt = DateTime.tryParse(exp.toString());
      }
    } else {
      inviteStatus = json['inviteStatus']?.toString();
      final exp = json['inviteExpiresAt'];
      if (exp != null) {
        inviteExpiresAt = DateTime.tryParse(exp.toString());
      }
    }
    return StaffMember(
      id: id,
      name: (json['name'] as String?) ?? '',
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      studioId: studioId,
      accessLevel: json['accessLevel'] as String?,
      userId: userIdRaw?.toString(),
      inviteStatus: inviteStatus,
      inviteExpiresAt: inviteExpiresAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'phone': phone,
      'studioId': studioId,
      'accessLevel': accessLevel,
      'userId': userId,
      'inviteStatus': inviteStatus,
      'inviteExpiresAt': inviteExpiresAt?.toIso8601String(),
    };
  }
}
