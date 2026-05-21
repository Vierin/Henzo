import '../models/salon.dart';
import '../models/training_location_item.dart';

/// Swaps salon primary address with an extra training location.
class DefaultLocationSwapResult {
  const DefaultLocationSwapResult({
    required this.primaryName,
    required this.address,
    required this.latitude,
    required this.longitude,
    required this.extraLocations,
  });

  final String primaryName;
  final String address;
  final double? latitude;
  final double? longitude;
  final List<TrainingLocationItem> extraLocations;
}

DefaultLocationSwapResult? swapSalonDefaultTrainingLocation({
  required Salon salon,
  required List<TrainingLocationItem> locations,
  required String newDefaultId,
  required String mainStudioName,
}) {
  if (newDefaultId == 'default') return null;

  TrainingLocationItem? picked;
  for (final loc in locations) {
    if (loc.id == newDefaultId) {
      picked = loc;
      break;
    }
  }
  if (picked == null || picked.isDefault) return null;

  TrainingLocationItem? currentDefault;
  for (final loc in locations) {
    if (loc.id == 'default' || loc.isDefault) {
      currentDefault = loc;
      break;
    }
  }

  final oldAddress = salon.address?.trim() ?? '';
  final oldLat = salon.latitude;
  final oldLon = salon.longitude;

  final currentDefaultName = currentDefault?.name.trim() ?? '';
  final demotedName = currentDefaultName.isNotEmpty
      ? currentDefaultName
      : mainStudioName;

  final demoted = TrainingLocationItem(
    id: 'loc_${DateTime.now().millisecondsSinceEpoch}',
    name: demotedName,
    address: oldAddress,
    latitude: oldLat,
    longitude: oldLon,
  );

  final extras = locations
      .where((l) => !l.isDefault && l.id != newDefaultId)
      .toList();
  if (oldAddress.isNotEmpty) {
    extras.add(demoted);
  }

  return DefaultLocationSwapResult(
    primaryName: picked.name.trim().isNotEmpty ? picked.name : mainStudioName,
    address: picked.address,
    latitude: picked.latitude,
    longitude: picked.longitude,
    extraLocations: extras,
  );
}
