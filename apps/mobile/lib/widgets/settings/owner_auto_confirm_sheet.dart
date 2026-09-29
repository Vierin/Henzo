import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/studio.dart';
import '../../services/auth_service.dart';
import '../../services/cache/studio_cache.dart';
import '../../services/dashboard_api_service.dart';
import '../../utils/show_api_error.dart';

Future<bool> saveAutoConfirmBookings(
  BuildContext context,
  Studio studio,
  bool autoConfirm,
) async {
  final token = context.read<AuthService>().accessToken;
  if (token == null || token.isEmpty) return false;
  try {
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
      if (studio.reminderSettings != null)
        'reminderSettings': studio.reminderSettings,
      'autoConfirmBookings': autoConfirm,
    };
    await DashboardApiService.updateCurrentStudio(token, payload);
    if (!context.mounted) return false;
    context.read<StudioCache>().invalidate();
    return true;
  } catch (e) {
    if (context.mounted) showApiError(context, e);
    return false;
  }
}
