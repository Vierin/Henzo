import '../models/app_notification.dart';
import 'api_client.dart';

class NotificationsApiService {
  NotificationsApiService._();

  static Future<List<AppNotification>> fetchInbox(String accessToken) async {
    final data = await ApiClient.get('/notifications/inbox', accessToken);
    if (data is! Map<String, dynamic>) return [];
    final rawItems = data['items'];
    if (rawItems is! List) return [];
    return rawItems
        .whereType<Map>()
        .map((item) => _fromServerJson(Map<String, dynamic>.from(item)))
        .toList();
  }

  static Future<void> markRead(
    String accessToken, {
    List<String>? ids,
  }) async {
    await ApiClient.patch(
      '/notifications/inbox/read',
      accessToken,
      body: ids == null ? {} : {'ids': ids},
    );
  }

  static AppNotification _fromServerJson(Map<String, dynamic> json) {
    final rawData = json['data'];
    final data = rawData is Map
        ? rawData.map((k, v) => MapEntry(k.toString(), v?.toString() ?? ''))
        : <String, String>{};
    final type = json['type']?.toString();
    if (type != null && type.isNotEmpty) {
      data.putIfAbsent('type', () => type);
    }
    return AppNotification(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      body: json['body']?.toString() ?? '',
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now(),
      data: data,
      read: json['read'] as bool? ?? false,
    );
  }
}
