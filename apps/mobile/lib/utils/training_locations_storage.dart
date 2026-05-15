import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/salon.dart';
import '../models/training_location_item.dart';
import '../services/auth_service.dart';
import '../services/cache/salon_cache.dart';
import '../services/dashboard_api_service.dart';

Future<Salon?> persistExtraTrainingLocations(
  BuildContext context,
  Salon salon,
  List<TrainingLocationItem> locations,
) async {
  final token = context.read<AuthService>().accessToken;
  if (token == null || token.isEmpty) return null;

  final reminderSettings = <String, dynamic>{
    ...?salon.reminderSettings,
    'trainingLocations': TrainingLocationItem.extraLocationsToJson(locations),
  };
  final payload = <String, dynamic>{
    'name': salon.name ?? '',
    if (salon.description != null) 'description': salon.description,
    if (salon.address != null) 'address': salon.address,
    if (salon.phone != null) 'phone': salon.phone,
    if (salon.email != null) 'email': salon.email,
    if (salon.website != null) 'website': salon.website,
    if (salon.instagram != null) 'instagram': salon.instagram,
    if (salon.photos != null) 'photos': salon.photos,
    if (salon.workingHours != null) 'workingHours': salon.workingHours,
    if (salon.latitude != null) 'latitude': salon.latitude,
    if (salon.longitude != null) 'longitude': salon.longitude,
    if (salon.autoConfirmBookings != null)
      'autoConfirmBookings': salon.autoConfirmBookings,
    'reminderSettings': reminderSettings,
  };

  final updated = await DashboardApiService.updateCurrentSalon(token, payload);
  if (context.mounted) {
    context.read<SalonCache>().invalidate();
  }
  return updated;
}
