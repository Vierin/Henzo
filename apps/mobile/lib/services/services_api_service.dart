import 'package:flutter/foundation.dart';

import 'api_client.dart';
import '../models/service_item.dart';
import '../models/training_category_option.dart';

class ServicesApiService {
  /// GET /trainings?studioId= — список тренировок студии.
  static Future<List<ServiceItem>> getByStudio(
    String accessToken,
    String studioId,
  ) async {
    try {
      final body = await ApiClient.get(
        '/trainings?studioId=${Uri.encodeComponent(studioId)}',
        accessToken,
      );
      final list = body is List
          ? body
          : (body is Map && body['data'] is List
                ? body['data'] as List
                : <dynamic>[]);
      final result = <ServiceItem>[];
      for (final item in list) {
        if (item is! Map) continue;
        try {
          final service = ServiceItem.fromJson(Map<String, dynamic>.from(item));
          if (service.id.isNotEmpty) result.add(service);
        } catch (e) {
          if (kDebugMode) debugPrint('[ServicesAPI] parse error: $e');
        }
      }
      return result;
    } on ApiException catch (e) {
      if (kDebugMode) debugPrint('[ServicesAPI] getByStudio: $e');
      return [];
    }
  }

  /// GET /trainings/categories — справочник категорий.
  static Future<List<TrainingCategoryOption>> getTrainingCategories(
    String accessToken,
  ) async {
    try {
      final body = await ApiClient.get('/trainings/categories', accessToken);
      final raw = body is List
          ? body
          : (body is Map && body['data'] is List
              ? body['data'] as List
              : <dynamic>[]);
      final out = <TrainingCategoryOption>[];
      for (final item in raw) {
        if (item is! Map) continue;
        try {
          out.add(
            TrainingCategoryOption.fromJson(
              Map<String, dynamic>.from(item),
            ),
          );
        } catch (e) {
          if (kDebugMode) {
            debugPrint('[ServicesAPI] category parse: $e');
          }
        }
      }
      out.sort((a, b) => a.nameEn.toLowerCase().compareTo(b.nameEn.toLowerCase()));
      return out;
    } on ApiException catch (e) {
      if (kDebugMode) debugPrint('[ServicesAPI] getTrainingCategories: $e');
      return [];
    }
  }

  /// POST /trainings — создать тренировку.
  static Future<ServiceItem?> create(
    String accessToken, {
    required String studioId,
    required String name,
    required double price,
    required int duration,
    int? trainingCategoryId,
  }) async {
    try {
      final payload = <String, dynamic>{
        'studioId': studioId,
        'name': name,
        'price': price,
        'duration': duration,
      };
      if (trainingCategoryId != null) {
        payload['trainingCategoryId'] = trainingCategoryId;
      }
      final map =
          await ApiClient.post(
                '/trainings',
                accessToken,
                body: payload,
              )
              as Map<String, dynamic>?;
      return map != null ? ServiceItem.fromJson(map) : null;
    } on ApiException catch (e) {
      if (kDebugMode) debugPrint('[ServicesAPI] create: $e');
      return null;
    }
  }

  /// PUT /trainings/:id — обновить тренировку.
  static Future<ServiceItem?> update(
    String accessToken,
    String id, {
    String? name,
    String? description,
    double? price,
    int? duration,
  }) async {
    try {
      final data = <String, dynamic>{};
      if (name != null) data['name'] = name;
      if (description != null) data['description'] = description;
      if (price != null) data['price'] = price;
      if (duration != null) data['duration'] = duration;
      final map =
          await ApiClient.put(
                '/trainings/$id',
                accessToken,
                body: data.isEmpty ? null : data,
              )
              as Map<String, dynamic>?;
      return map != null ? ServiceItem.fromJson(map) : null;
    } on ApiException catch (e) {
      if (kDebugMode) debugPrint('[ServicesAPI] update: $e');
      return null;
    }
  }

  /// DELETE /trainings/:id — удалить тренировку.
  static Future<bool> delete(String accessToken, String id) async {
    try {
      await ApiClient.delete('/trainings/$id', accessToken);
      return true;
    } on ApiException catch (e) {
      if (kDebugMode) debugPrint('[ServicesAPI] delete: $e');
      return false;
    }
  }
}
