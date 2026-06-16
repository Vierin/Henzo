import '../../../services/dashboard_api_service.dart';
import '../client_explore_models.dart';

OwnerTrainingSession ownerSessionFromExplore(ExploreClassItem c) {
  final ends =
      c.endsAt ?? c.startsAt.add(Duration(minutes: c.durationMin ?? 60));
  return OwnerTrainingSession(
    sessionId: c.sessionId,
    trainingId: c.trainingId,
    startsAt: c.startsAt,
    endsAt: ends,
    status: 'ACTIVE',
    capacity: c.capacity ?? 0,
    enrolledCount: c.bookedCount,
    attendedCount: c.bookedCount,
    trainingName: c.className,
    trainingDurationMinutes: c.durationMin,
    trainingDisplayColorHex: c.displayColorHex,
    trainingPrice: c.price,
    trainingLanguage: c.language,
    trainerName: c.trainerName.trim(),
    trainerId: null,
    locationId: null,
    locationName: (c.locationName ?? '').trim().isEmpty
        ? null
        : c.locationName!.trim(),
  );
}
