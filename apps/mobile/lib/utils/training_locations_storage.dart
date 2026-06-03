import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/studio.dart';
import '../models/training_location_item.dart';
import '../services/auth_service.dart';
import '../services/cache/studio_cache.dart';
import '../services/dashboard_api_service.dart';

Future<Studio?> persistExtraTrainingLocations(
  BuildContext context,
  Studio studio,
  List<TrainingLocationItem> locations,
) async {
  final token = context.read<AuthService>().accessToken;
  if (token == null || token.isEmpty) return null;

  final reminderSettings = <String, dynamic>{
    ...?studio.reminderSettings,
    'trainingLocations': TrainingLocationItem.extraLocationsToJson(locations),
  };
  final primary = () {
    for (final loc in locations) {
      if (loc.isDefault || loc.id == 'default') return loc;
    }
    return locations.isNotEmpty ? locations.first : null;
  }();
  if (primary != null) {
    TrainingLocationItem.writeDefaultLocationName(
      reminderSettings,
      primary.name,
    );
  }

  return _updateSalonReminderSettings(context, studio, reminderSettings);
}

Future<Studio?> persistTrainingLocationDefaultSwap(
  BuildContext context,
  Studio studio, {
  required String address,
  required double? latitude,
  required double? longitude,
  required String defaultLocationName,
  required List<TrainingLocationItem> locations,
}) async {
  final token = context.read<AuthService>().accessToken;
  if (token == null || token.isEmpty) return null;

  final reminderSettings = <String, dynamic>{
    ...?studio.reminderSettings,
    'trainingLocations': TrainingLocationItem.extraLocationsToJson(locations),
  };
  TrainingLocationItem.writeDefaultLocationName(
    reminderSettings,
    defaultLocationName,
  );

  final payload = <String, dynamic>{
    'name': studio.name ?? '',
    if (studio.description != null) 'description': studio.description,
    'address': address,
    if (studio.phone != null) 'phone': studio.phone,
    if (studio.email != null && studio.email!.trim().isNotEmpty)
      'email': studio.email,
    if (studio.website != null) 'website': studio.website,
    if (studio.instagram != null) 'instagram': studio.instagram,
    if (studio.photos != null) 'photos': studio.photos,
    if (studio.workingHours != null) 'workingHours': studio.workingHours,
    'latitude': ?latitude,
    'longitude': ?longitude,
    if (studio.autoConfirmBookings != null)
      'autoConfirmBookings': studio.autoConfirmBookings,
    'reminderSettings': reminderSettings,
  };

  final updated = await DashboardApiService.updateCurrentStudio(token, payload);
  if (context.mounted) {
    context.read<StudioCache>().invalidate();
  }
  return updated;
}

Future<Studio?> _updateSalonReminderSettings(
  BuildContext context,
  Studio studio,
  Map<String, dynamic> reminderSettings,
) async {
  final token = context.read<AuthService>().accessToken;
  if (token == null || token.isEmpty) return null;

  final payload = <String, dynamic>{
    'name': studio.name ?? '',
    if (studio.description != null) 'description': studio.description,
    if (studio.address != null) 'address': studio.address,
    if (studio.phone != null) 'phone': studio.phone,
    if (studio.email != null && studio.email!.trim().isNotEmpty)
      'email': studio.email,
    if (studio.website != null) 'website': studio.website,
    if (studio.instagram != null) 'instagram': studio.instagram,
    if (studio.photos != null) 'photos': studio.photos,
    if (studio.workingHours != null) 'workingHours': studio.workingHours,
    if (studio.latitude != null) 'latitude': studio.latitude,
    if (studio.longitude != null) 'longitude': studio.longitude,
    if (studio.autoConfirmBookings != null)
      'autoConfirmBookings': studio.autoConfirmBookings,
    'reminderSettings': reminderSettings,
  };

  final updated = await DashboardApiService.updateCurrentStudio(token, payload);
  if (context.mounted) {
    context.read<StudioCache>().invalidate();
  }
  return updated;
}
