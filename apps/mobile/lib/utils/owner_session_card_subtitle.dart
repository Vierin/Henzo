import '../models/training_location_item.dart';
import '../services/dashboard_api_service.dart';
import '../widgets/dashboard/owner_daily_schedule_session_card.dart';

/// Подпись под названием тренировки на карточке слота.
class OwnerSessionCardSubtitle {
  const OwnerSessionCardSubtitle({
    required this.label,
    required this.showLocationPin,
  });

  final String label;
  final bool showLocationPin;
}

OwnerSessionCardSubtitle resolveOwnerSessionCardSubtitle({
  required OwnerTrainingSession session,
  required List<TrainingLocationItem> studioLocations,
  String? ownerTrainerFallback,
}) {
  final trainer = ownerDailyScheduleTrainerLabel(
    session,
    ownerTrainerFallback,
  );
  if (studioLocations.length <= 1) {
    return OwnerSessionCardSubtitle(
      label: trainer,
      showLocationPin: false,
    );
  }

  final locationName = _resolveSessionLocationName(session, studioLocations);
  final fallback = studioLocations
      .firstWhere(
        (l) => l.isDefault,
        orElse: () => studioLocations.first,
      )
      .name
      .trim();
  final label = (locationName != null && locationName.isNotEmpty)
      ? locationName
      : (fallback.isNotEmpty ? fallback : trainer);

  return OwnerSessionCardSubtitle(
    label: label,
    showLocationPin: true,
  );
}

/// Для клиентского расписания: `studio.locationCount` с API.
OwnerSessionCardSubtitle resolveOwnerSessionCardSubtitleForPublic({
  required OwnerTrainingSession session,
  required int studioLocationCount,
  String? ownerTrainerFallback,
}) {
  final hasMultiple = studioLocationCount > 1;
  if (!hasMultiple) {
    return resolveOwnerSessionCardSubtitle(
      session: session,
      studioLocations: const [],
      ownerTrainerFallback: ownerTrainerFallback,
    );
  }
  final locationName = session.locationName?.trim();
  final label = (locationName != null && locationName.isNotEmpty)
      ? locationName
      : ownerDailyScheduleTrainerLabel(session, ownerTrainerFallback);
  return OwnerSessionCardSubtitle(
    label: label,
    showLocationPin: true,
  );
}

String? _resolveSessionLocationName(
  OwnerTrainingSession session,
  List<TrainingLocationItem> locations,
) {
  final fromApi = session.locationName?.trim();
  if (fromApi != null && fromApi.isNotEmpty) return fromApi;

  final id = session.locationId?.trim();
  if (id == null || id.isEmpty) return null;

  for (final loc in locations) {
    if (loc.id == id) {
      final name = loc.name.trim();
      return name.isNotEmpty ? name : null;
    }
  }
  return null;
}
