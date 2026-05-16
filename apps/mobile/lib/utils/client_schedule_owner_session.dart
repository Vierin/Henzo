import '../services/dashboard_api_service.dart';
import 'owner_session_card_subtitle.dart';

OwnerTrainingSession? mapClientScheduleItemToOwnerSession(
  Map<String, dynamic> item,
) {
  final training = item['training'] is Map
      ? Map<String, dynamic>.from(item['training'] as Map)
      : <String, dynamic>{};
  final startsAt =
      DateTime.tryParse((item['startsAt'] ?? '').toString())?.toLocal();
  if (startsAt == null) return null;

  final durationMin = (training['duration'] as num?)?.toInt() ?? 60;
  final endsAt =
      DateTime.tryParse((item['endsAt'] ?? '').toString())?.toLocal() ??
      startsAt.add(Duration(minutes: durationMin));

  final capacity = (item['capacity'] as num?)?.toInt() ?? 0;
  final booked = (item['bookedCount'] as num?)?.toInt() ?? 0;

  final trainer = item['trainer'] is Map
      ? Map<String, dynamic>.from(item['trainer'] as Map)
      : <String, dynamic>{};

  return OwnerTrainingSession(
    sessionId: (item['sessionId'] ?? '').toString(),
    trainingId: (training['id'] ?? '').toString(),
    startsAt: startsAt,
    endsAt: endsAt,
    status: (item['sessionStatus'] ?? 'ACTIVE').toString(),
    capacity: capacity,
    enrolledCount: booked,
    attendedCount: booked,
    trainingName: (training['name'] ?? 'Class').toString(),
    trainingDurationMinutes: durationMin,
    trainingDisplayColorHex: training['displayColor']?.toString(),
    trainerName: (trainer['name'] ?? '—').toString(),
    trainerId: trainer['id']?.toString(),
    locationId: item['locationId']?.toString(),
    locationName: item['locationName']?.toString(),
  );
}

OwnerSessionCardSubtitle subtitleForClientScheduleItem(
  OwnerTrainingSession session,
  Map<String, dynamic> item,
) {
  final studio = item['studio'] is Map
      ? Map<String, dynamic>.from(item['studio'] as Map)
      : <String, dynamic>{};
  final locationCount = (studio['locationCount'] as num?)?.toInt() ?? 1;
  return resolveOwnerSessionCardSubtitleForPublic(
    session: session,
    studioLocationCount: locationCount,
  );
}
