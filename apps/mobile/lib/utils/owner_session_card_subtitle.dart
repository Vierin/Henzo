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
  final hasMultiple = studioLocations.length > 1;
  final locationName = _resolveSessionLocationName(session, studioLocations);

  if (hasMultiple) {
    final defaultName = _defaultLocationName(studioLocations);
    final hasLocationName =
        locationName != null && locationName.isNotEmpty;
    final showingLocation = hasLocationName || defaultName.isNotEmpty;
    final label = hasLocationName
        ? locationName
        : (defaultName.isNotEmpty ? defaultName : trainer);
    return OwnerSessionCardSubtitle(
      label: label,
      showLocationPin: showingLocation,
    );
  }

  if (locationName != null && locationName.isNotEmpty) {
    return OwnerSessionCardSubtitle(
      label: locationName,
      showLocationPin: true,
    );
  }

  return OwnerSessionCardSubtitle(
    label: trainer,
    showLocationPin: false,
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
  final trainer = ownerDailyScheduleTrainerLabel(
    session,
    ownerTrainerFallback,
  );
  final label = (locationName != null && locationName.isNotEmpty)
      ? locationName
      : trainer;
  return OwnerSessionCardSubtitle(
    label: label,
    showLocationPin: true,
  );
}

String _defaultLocationName(List<TrainingLocationItem> locations) {
  for (final loc in locations) {
    if (loc.isDefault || loc.id == 'default') {
      return loc.name.trim();
    }
  }
  return locations.isNotEmpty ? locations.first.name.trim() : '';
}

String? _resolveSessionLocationName(
  OwnerTrainingSession session,
  List<TrainingLocationItem> locations,
) {
  final fromApi = session.locationName?.trim();
  if (fromApi != null && fromApi.isNotEmpty) return fromApi;

  final idRaw = session.locationId?.trim();
  final id = (idRaw == null || idRaw.isEmpty) ? 'default' : idRaw;

  for (final loc in locations) {
    if (loc.id == id) {
      final name = loc.name.trim();
      return name.isNotEmpty ? name : null;
    }
  }
  return null;
}
