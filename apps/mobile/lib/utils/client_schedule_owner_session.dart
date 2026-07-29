import '../services/dashboard_api_service.dart';
import '../widgets/dashboard/owner_daily_schedule_session_card.dart';
import 'formatters.dart';

/// Studio / location + trainer rows for client booking cards (Upcoming, Passes).
class ClientScheduleCardPresentation {
  const ClientScheduleCardPresentation({
    required this.subtitleLabel,
    required this.showLocationPin,
    required this.showSubtitleLeadingIcon,
    this.trainerLine,
  });

  final String subtitleLabel;
  final bool showLocationPin;
  final bool showSubtitleLeadingIcon;
  final String? trainerLine;
}

OwnerTrainingSession? mapClientScheduleItemToOwnerSession(
  Map<String, dynamic> item,
) {
  final training = item['training'] is Map
      ? Map<String, dynamic>.from(item['training'] as Map)
      : <String, dynamic>{};
  final startsAt = parseApiDateTime(item['startsAt']);
  if (startsAt == null) return null;

  final durationMin = (training['duration'] as num?)?.toInt() ?? 60;
  final endsAt =
      parseApiDateTime(item['endsAt']) ??
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
    trainingLanguage: (training['language'] as String?)?.trim().isNotEmpty ==
            true
        ? (training['language'] as String).trim()
        : null,
    trainerName: (trainer['name'] ?? '').toString().trim(),
    trainerId: trainer['id']?.toString(),
    locationId: item['locationId']?.toString(),
    locationName: item['locationName']?.toString(),
  );
}

ClientScheduleCardPresentation presentationForClientScheduleItem(
  OwnerTrainingSession session,
  Map<String, dynamic> item,
) {
  final studio = item['studio'] is Map
      ? Map<String, dynamic>.from(item['studio'] as Map)
      : <String, dynamic>{};
  final studioName = (studio['name'] ?? 'Studio').toString().trim();
  final isUnclaimed = studio['claimedAt'] == null;
  final locationCount = (studio['locationCount'] as num?)?.toInt() ?? 1;
  final trainerLabel = ownerDailyScheduleTrainerLabel(session, null);
  final trainerLine = isUnclaimed ||
          isPlaceholderScheduleTrainerName(trainerLabel)
      ? null
      : trainerLabel;

  if (locationCount > 1) {
    final locationName = session.locationName?.trim();
    final label = (locationName != null && locationName.isNotEmpty)
        ? locationName
        : (studioName.isNotEmpty ? studioName : 'Studio');
    return ClientScheduleCardPresentation(
      subtitleLabel: label,
      showLocationPin: true,
      showSubtitleLeadingIcon: true,
      trainerLine: trainerLine,
    );
  }

  return ClientScheduleCardPresentation(
    subtitleLabel: studioName.isNotEmpty ? studioName : 'Studio',
    showLocationPin: true,
    showSubtitleLeadingIcon: true,
    trainerLine: trainerLine,
  );
}
