import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/app_notification.dart';
import 'notifications_api_service.dart';
import 'push_notification_service.dart';

const String _keyList = 'henzo_notifications_list';

/// Keys safe to persist locally for deep-link routing and display.
const _allowedPushDataKeys = <String>{
  'type',
  'screen',
  'studioId',
  'sessionId',
  'enrollmentId',
  'trainingId',
  'notificationId',
  'bookingId',
  'dateTime',
  'startsAt',
  'clientName',
  'serviceName',
  'trainingName',
  'studioName',
  'eventType',
};

Map<String, String> _sanitizePushData(Map<String, String> data) {
  return Map.fromEntries(
    data.entries.where((e) => _allowedPushDataKeys.contains(e.key)),
  );
}

class NotificationsStore extends ChangeNotifier {
  NotificationsStore() : _items = [];

  List<AppNotification> _items = [];

  List<AppNotification> get items => List.unmodifiable(_items);
  int get unreadCount => _items.where((e) => !e.read).length;

  void _emit() {
    notifyListeners();
    unawaited(PushNotificationService.syncAppBadge(unreadCount));
  }

  Future<void> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_keyList);
      if (raw != null) {
        final list = (jsonDecode(raw) as List)
            .map(
              (e) =>
                  AppNotification.fromJson(Map<String, dynamic>.from(e as Map)),
            )
            .toList();
        _items = list..sort((a, b) => b.createdAt.compareTo(a.createdAt));
      } else {
        _items = [];
      }
    } catch (_) {
      _items = [];
    }
    _emit();
  }

  Future<void> _save() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final encoded = _items.map((e) => e.toJson()).toList();
      await prefs.setString(_keyList, jsonEncode(encoded));
    } catch (_) {}
  }

  void addFromPush(String title, String body, Map<String, String> data) {
    if (title.isEmpty && body.isEmpty) return;
    final sanitized = _sanitizePushData(data);
    final serverId = sanitized['notificationId']?.trim();
    if (serverId != null && serverId.isNotEmpty) {
      final existingIdx = _items.indexWhere((e) => e.id == serverId);
      if (existingIdx >= 0) {
        _items[existingIdx] = _items[existingIdx].copyWith(
          title: title,
          body: body,
          data: sanitized,
        );
        _save();
        _emit();
        return;
      }
    }
    final id = serverId?.isNotEmpty == true
        ? serverId!
        : '${DateTime.now().millisecondsSinceEpoch}_${data.hashCode}';
    _items.insert(
      0,
      AppNotification(
        id: id,
        title: title,
        body: body,
        createdAt: DateTime.now(),
        data: sanitized,
        read: false,
      ),
    );
    _save();
    _emit();
  }

  Future<void> syncFromServer(String? accessToken) async {
    if (accessToken == null || accessToken.isEmpty) return;
    try {
      final remote = await NotificationsApiService.fetchInbox(accessToken);
      final merged = <String, AppNotification>{};
      for (final item in remote) {
        if (item.id.isEmpty) continue;
        merged[item.id] = item;
      }
      for (final local in _items) {
        if (merged.containsKey(local.id)) continue;
        if (_isDuplicateOfRemote(local, remote)) continue;
        merged[local.id] = local;
      }
      _items = merged.values.toList()
        ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
      await _save();
      _emit();
    } catch (_) {}
  }

  bool _isDuplicateOfRemote(
    AppNotification local,
    List<AppNotification> remote,
  ) {
    final localType = local.data['type'];
    final localSession = local.data['sessionId'];
    if (localType == null || localSession == null) return false;
    return remote.any((remoteItem) {
      if (remoteItem.data['type'] != localType) return false;
      if (remoteItem.data['sessionId'] != localSession) return false;
      return remoteItem.createdAt
              .difference(local.createdAt)
              .abs()
              .inMinutes <
          10;
    });
  }

  Future<void> markAllRead({String? accessToken}) async {
    bool changed = false;
    for (var i = 0; i < _items.length; i++) {
      if (!_items[i].read) {
        _items[i] = _items[i].copyWith(read: true);
        changed = true;
      }
    }
    if (changed) {
      await _save();
      _emit();
    } else {
      unawaited(PushNotificationService.syncAppBadge(unreadCount));
    }
    if (accessToken != null && accessToken.isNotEmpty) {
      try {
        await NotificationsApiService.markRead(accessToken);
      } catch (_) {}
    }
  }

  void markRead(String id) {
    final idx = _items.indexWhere((e) => e.id == id);
    if (idx >= 0 && !_items[idx].read) {
      _items[idx] = _items[idx].copyWith(read: true);
      _save();
      _emit();
    }
  }

  Future<void> clearAll() async {
    _items = [];
    _emit();
    await _save();
  }

  Future<void> deleteById(String id) async {
    final before = _items.length;
    _items = _items.where((e) => e.id != id).toList();
    if (_items.length == before) return;
    await _save();
    _emit();
  }
}
