import 'package:flutter/foundation.dart';

import 'api_client.dart';
import '../models/staff_member.dart';

class StaffApiService {
  /// GET /trainers?studioId= — список тренеров студии.
  static Future<List<StaffMember>> getBySalon(
    String accessToken,
    String studioId,
  ) async {
    try {
      final list = await ApiClient.get(
        '/trainers?studioId=${Uri.encodeComponent(studioId)}',
        accessToken,
      );
      if (list is! List) return [];
      final result = <StaffMember>[];
      for (final item in list) {
        if (item is! Map) continue;
        try {
          final member = StaffMember.fromJson(Map<String, dynamic>.from(item));
          if (member.id.isNotEmpty) result.add(member);
        } catch (_) {}
      }
      return result;
    } on ApiException catch (e) {
      if (kDebugMode) debugPrint('[StaffAPI] getBySalon: $e');
      return [];
    }
  }

  /// POST /trainers — создать тренера.
  static Future<StaffMember> create(
    String accessToken, {
    required String studioId,
    required String name,
    String? email,
    String? phone,
    String accessLevel = 'EMPLOYEE',
    List<String>? trainingIds,
  }) async {
    final body = <String, dynamic>{
      'studioId': studioId,
      'name': name,
      'accessLevel': accessLevel,
      if (email != null && email.isNotEmpty) 'email': email,
      if (phone != null && phone.isNotEmpty) 'phone': phone,
      if (trainingIds != null && trainingIds.isNotEmpty)
        'trainingIds': trainingIds,
    };
    final map = await ApiClient.post('/trainers', accessToken, body: body)
        as Map<String, dynamic>;
    return StaffMember.fromJson(map);
  }

  /// PUT /trainers/:id — обновить тренера.
  static Future<StaffMember> update(
    String accessToken,
    String id, {
    String? name,
    String? email,
    String? phone,
    String? accessLevel,
    List<String>? trainingIds,
  }) async {
    final data = <String, dynamic>{};
    if (name != null) data['name'] = name;
    if (email != null) data['email'] = email;
    if (phone != null) data['phone'] = phone;
    if (accessLevel != null) data['accessLevel'] = accessLevel;
    if (trainingIds != null) data['trainingIds'] = trainingIds;
    final map = await ApiClient.put(
      '/trainers/$id',
      accessToken,
      body: data.isEmpty ? null : data,
    ) as Map<String, dynamic>;
    return StaffMember.fromJson(map);
  }

  /// DELETE /trainers/:id — удалить тренера.
  static Future<void> delete(String accessToken, String id) async {
    await ApiClient.delete('/trainers/$id', accessToken);
  }
}
