import '../../../services/client_location_store.dart';
import '../../../utils/formatters.dart';
import '../client_explore_models.dart';

int exploreRadiusKm(String distanceFilter) {
  switch (distanceFilter) {
    case '5':
      return 5;
    case '10':
      return 10;
    case '15':
      return 15;
    case '30+':
      return 50;
    case 'auto':
    default:
      return 20;
  }
}

double maxDistanceKmForFilter(String distanceFilter) =>
    exploreRadiusKm(distanceFilter).toDouble();

bool hasClientCoordinates(ClientLocationStore loc) =>
    loc.lat != null && loc.lon != null;

double? resolvedStudioDistanceKm(
  ExploreStudioItem studio,
  ClientLocationStore loc,
) {
  return resolveStudioDistanceKm(
    apiDistanceKm: studio.distanceKm,
    clientLat: loc.lat,
    clientLon: loc.lon,
    studioLat: studio.lat,
    studioLng: studio.lng,
  );
}

bool isStudioWithinDistanceFilter({
  required ExploreStudioItem studio,
  required ClientLocationStore loc,
  required String distanceFilter,
}) {
  if (!hasClientCoordinates(loc)) return false;
  final km = resolvedStudioDistanceKm(studio, loc);
  if (km == null) return false;
  return km <= maxDistanceKmForFilter(distanceFilter);
}

void applyStudioSortInPlace(
  List<ExploreStudioItem> studios, {
  required String sortBy,
}) {
  switch (sortBy) {
    case 'ratings':
      studios.sort((a, b) {
        final byRating = b.rating.compareTo(a.rating);
        if (byRating != 0) return byRating;
        return b.reviewCount.compareTo(a.reviewCount);
      });
      break;
    case 'distance':
      studios.sort((a, b) {
        final ad = a.distanceKm ?? double.infinity;
        final bd = b.distanceKm ?? double.infinity;
        return ad.compareTo(bd);
      });
      break;
    case 'recommended':
    default:
      studios.sort((a, b) {
        final aScore = (a.rating * 10) + (a.reviewCount * 0.02);
        final bScore = (b.rating * 10) + (b.reviewCount * 0.02);
        final byScore = bScore.compareTo(aScore);
        if (byScore != 0) return byScore;
        final ad = a.distanceKm ?? double.infinity;
        final bd = b.distanceKm ?? double.infinity;
        return ad.compareTo(bd);
      });
  }
}
