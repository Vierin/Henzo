import 'package:flutter/foundation.dart';

import '../../models/service_item.dart';
import '../../models/staff_member.dart';
import '../services_api_service.dart';
import '../trainers_api_service.dart';

/// In-memory cache for trainings and trainers by studioId.
class ServicesStaffCache extends ChangeNotifier {
  final Map<String, List<ServiceItem>> _servicesByStudio = {};
  final Map<String, List<StaffMember>> _trainersByStudio = {};

  List<ServiceItem>? getServices(String studioId) =>
      _servicesByStudio[studioId];
  List<StaffMember>? getTrainers(String studioId) =>
      _trainersByStudio[studioId];

  Future<List<ServiceItem>> getServicesForStudio(
    String? accessToken,
    String? studioId,
  ) async {
    if (accessToken == null ||
        accessToken.isEmpty ||
        studioId == null ||
        studioId.isEmpty) {
      return [];
    }
    final cached = _servicesByStudio[studioId];
    if (cached != null) return cached;
    try {
      final list = await ServicesApiService.getByStudio(accessToken, studioId);
      _servicesByStudio[studioId] = list;
      notifyListeners();
      return list;
    } catch (_) {
      rethrow;
    }
  }

  Future<List<StaffMember>> getTrainersForStudio(
    String? accessToken,
    String? studioId,
  ) async {
    if (accessToken == null ||
        accessToken.isEmpty ||
        studioId == null ||
        studioId.isEmpty) {
      return [];
    }
    final cached = _trainersByStudio[studioId];
    if (cached != null) return cached;
    try {
      final list = await TrainersApiService.getByStudio(accessToken, studioId);
      _trainersByStudio[studioId] = list;
      notifyListeners();
      return list;
    } catch (_) {
      rethrow;
    }
  }

  void invalidateServices(String? studioId) {
    if (studioId != null) _servicesByStudio.remove(studioId);
    notifyListeners();
  }

  void invalidateTrainers(String? studioId) {
    if (studioId != null) _trainersByStudio.remove(studioId);
    notifyListeners();
  }

  void invalidateAll() {
    _servicesByStudio.clear();
    _trainersByStudio.clear();
    notifyListeners();
  }
}
