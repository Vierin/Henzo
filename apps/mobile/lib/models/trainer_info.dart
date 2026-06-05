class TrainerAssignedTraining {
  const TrainerAssignedTraining({
    required this.id,
    required this.name,
  });

  final String id;
  final String name;

  factory TrainerAssignedTraining.fromJson(Map<String, dynamic> json) =>
      TrainerAssignedTraining(
        id: (json['id'] ?? '').toString(),
        name: (json['name'] ?? '').toString(),
      );
}

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
    this.trainings = const [],
  });

  final String id;
  final String name;
  final String studioId;
  final String studioName;
  final String? email;
  final String? phone;
  final String? studioLogoUrl;
  final String? accessLevel;
  final List<TrainerAssignedTraining> trainings;

  factory TrainerInfo.fromJson(Map<String, dynamic> json) {
    final rawTrainings = json['trainings'];
    final trainings = rawTrainings is List
        ? rawTrainings
              .whereType<Map>()
              .map((e) => TrainerAssignedTraining.fromJson(
                    Map<String, dynamic>.from(e),
                  ))
              .where((t) => t.name.isNotEmpty)
              .toList()
        : const <TrainerAssignedTraining>[];

    return TrainerInfo(
      id: json['id'] as String,
      name: (json['name'] ?? '').toString(),
      studioId: json['studioId'] as String,
      studioName: (json['studioName'] ?? '').toString(),
      email: json['email']?.toString(),
      phone: json['phone']?.toString(),
      studioLogoUrl: json['studioLogoUrl']?.toString(),
      accessLevel: json['accessLevel']?.toString(),
      trainings: trainings,
    );
  }
}
