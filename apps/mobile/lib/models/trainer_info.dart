class TrainerInfo {
  const TrainerInfo({
    required this.id,
    required this.name,
    required this.studioId,
    required this.studioName,
    this.email,
    this.phone,
    this.studioLogoUrl,
    this.accessLevel,
  });

  final String id;
  final String name;
  final String studioId;
  final String studioName;
  final String? email;
  final String? phone;
  final String? studioLogoUrl;
  final String? accessLevel;

  factory TrainerInfo.fromJson(Map<String, dynamic> json) => TrainerInfo(
    id: json['id'] as String,
    name: (json['name'] ?? '').toString(),
    studioId: json['studioId'] as String,
    studioName: (json['studioName'] ?? '').toString(),
    email: json['email']?.toString(),
    phone: json['phone']?.toString(),
    studioLogoUrl: json['studioLogoUrl']?.toString(),
    accessLevel: json['accessLevel']?.toString(),
  );
}
