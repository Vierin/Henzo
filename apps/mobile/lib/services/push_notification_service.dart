import 'dart:io';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart'
    show debugPrint, kDebugMode, defaultTargetPlatform, kIsWeb, TargetPlatform;
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';

import 'api_client.dart';
import 'workout_service.dart';

/// Handles FCM token registration with backend and in-app message handling.
class PushNotificationService {
  PushNotificationService._();

  static const String _tag = '[Push]';

  static void _log(String msg) {
    if (kDebugMode) debugPrint('$_tag $msg');
  }

  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  static final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  /// Reserved id for silent iOS badge sync (not shown to user).
  static const int _badgeSyncNotificationId = 2147483646;


  static const AndroidNotificationChannel _channel = AndroidNotificationChannel(
    'henzo_default',
    'Henzo',
    description: 'Уведомления приложения Henzo',
    importance: Importance.high,
    playSound: true,
    enableVibration: true,
  );

  /// Called when a notification is received (foreground) or app opened from notification.
  static void Function(String title, String body, Map<String, String> data)?
  onNotificationReceived;

  /// Called only when the user *taps* a push (from background or terminated),
  /// so the app can route based on the payload's `type` (e.g. open the trainer
  /// schedule for a TRAINER_ASSIGNED push). Not called for foreground messages.
  static void Function(Map<String, String> data)? onNotificationTapped;

  static String? _pendingAccessToken;
  static String? _pendingLanguage;

  /// Initialize: request permission, get token, set up message handlers.
  /// [onNotificationReceived] is called for each received message so the app can show them in the notifications screen.
  static Future<void> initialize({
    void Function(String title, String body, Map<String, String> data)?
    onNotificationReceived,
    void Function(Map<String, String> data)? onNotificationTapped,
  }) async {
    PushNotificationService.onNotificationReceived = onNotificationReceived;
    PushNotificationService.onNotificationTapped = onNotificationTapped;
    _log('initialize start');
    try {
      final androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
      final initSettings = InitializationSettings(
        android: androidInit,
        iOS: DarwinInitializationSettings(
          requestAlertPermission: false,
          requestBadgePermission: false,
          requestSoundPermission: false,
          notificationCategories: [
            DarwinNotificationCategory(
              'WORKOUT_REMINDER',
              actions: [
                DarwinNotificationAction.plain(
                  'START_WORKOUT',
                  'Начать',
                  options: {DarwinNotificationActionOption.foreground},
                ),
              ],
            ),
          ],
        ),
      );
      await _localNotifications.initialize(
        initSettings,
        onDidReceiveNotificationResponse: _onNotificationTap,
      );
      _log('local notifications initialized');
      if (defaultTargetPlatform == TargetPlatform.android) {
        final androidPlugin = _localNotifications
            .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin
            >();
        await androidPlugin?.createNotificationChannel(_channel);
        _log('Android channel henzo_default created');
      }

      // On iOS, present notifications natively (via APNs) even when the app is
      // in the foreground — this is what allows Apple Watch to mirror them.
      if (Platform.isIOS) {
        await _messaging.setForegroundNotificationPresentationOptions(
          alert: true,
          badge: true,
          sound: true,
        );
        _log('iOS foreground notification presentation options set');
      }

      FirebaseMessaging.onMessage.listen(_onForegroundMessage);
      FirebaseMessaging.onMessageOpenedApp.listen(_onMessageOpenedApp);
      FirebaseMessaging.instance.onTokenRefresh.listen((token) {
        _log('onTokenRefresh: ${token.length} chars');
        final accessToken = _pendingAccessToken;
        final language = _pendingLanguage;
        if (accessToken != null &&
            accessToken.isNotEmpty &&
            language != null &&
            language.isNotEmpty) {
          registerToken(accessToken: accessToken, language: language);
        }
      });
      final initial = await _messaging.getInitialMessage().timeout(
        const Duration(seconds: 5),
        onTimeout: () => null,
      );
      if (initial != null) {
        _log('initialMessage: ${initial.notification?.title}');
        _notifyReceived(
          initial.notification?.title ?? 'Henzo',
          initial.notification?.body ?? '',
          _dataToStringMap(initial.data),
        );
        _onMessageOpenedApp(initial);
      }
      _log('initialize done');
    } catch (e, st) {
      _log('initialize error: $e');
      if (kDebugMode) debugPrint(st.toString());
    }
  }

  /// Call when user enters the app (e.g. after login). Shows system permission dialog.
  static Future<bool> requestNotificationPermission() async {
    _log('requestNotificationPermission start');
    try {
      if (defaultTargetPlatform == TargetPlatform.android) {
        final status = await Permission.notification.request();
        _log('Android permission: $status');
        return status.isGranted;
      }
      if (defaultTargetPlatform == TargetPlatform.iOS) {
        final settings = await _messaging.requestPermission(
          alert: true,
          badge: true,
          sound: true,
        );
        _log('iOS permission: ${settings.authorizationStatus}');
        return settings.authorizationStatus == AuthorizationStatus.authorized ||
            settings.authorizationStatus == AuthorizationStatus.provisional;
      }
      return true;
    } catch (e) {
      _log('requestPermission error: $e');
      return false;
    }
  }

  static void _onNotificationTap(NotificationResponse response) {
    _log('notification tap: actionId=${response.actionId} payload=${response.payload}');
    if (response.actionId == 'START_WORKOUT') {
      _handleStartWorkoutAction(response.payload);
    }
  }

  static void _handleStartWorkoutAction(String? payload) {
    if (payload == null || !payload.startsWith('workout:')) return;
    final workoutType = payload.substring('workout:'.length);
    _log('START_WORKOUT action: sending $workoutType to Watch');
    WorkoutService.sendToWatch(workoutType: workoutType);
  }

  /// Keep credentials for [onTokenRefresh] re-registration.
  static void configureTokenRefresh({
    required String accessToken,
    required String language,
  }) {
    _pendingAccessToken = accessToken;
    _pendingLanguage = language;
  }

  /// iOS: FCM token is unavailable until APNs registration completes.
  static Future<void> _waitForApnsToken({int maxAttempts = 20}) async {
    if (!Platform.isIOS) return;
    for (var i = 0; i < maxAttempts; i++) {
      final apns = await _messaging.getAPNSToken();
      if (apns != null && apns.isNotEmpty) {
        _log('APNS token ready (${apns.length} chars)');
        return;
      }
      await Future.delayed(const Duration(milliseconds: 300));
    }
    _log('APNS token not ready after $maxAttempts attempts');
  }

  /// Register FCM token with backend. Call after login and when language changes.
  static Future<void> registerToken({
    required String accessToken,
    required String language,
  }) async {
    configureTokenRefresh(accessToken: accessToken, language: language);
    _log('registerToken start');
    try {
      if (Platform.isIOS) {
        final settings = await _messaging.getNotificationSettings();
        _log(
          'iOS auth status: ${settings.authorizationStatus}, '
          'alert=${settings.alert}, sound=${settings.sound}',
        );
        if (settings.authorizationStatus == AuthorizationStatus.denied) {
          _log('registerToken: notifications denied on iOS');
          return;
        }
        await _waitForApnsToken();
      }

      String? token;
      for (var attempt = 0; attempt < 5; attempt++) {
        token = await _messaging.getToken();
        if (token != null && token.isNotEmpty) break;
        if (Platform.isIOS) {
          await _waitForApnsToken(maxAttempts: 5);
          await Future.delayed(Duration(milliseconds: 400 * (attempt + 1)));
        }
      }
      if (token == null || token.isEmpty) {
        _log('registerToken: no token from FCM');
        return;
      }
      final platform = kIsWeb
          ? 'web'
          : (defaultTargetPlatform == TargetPlatform.iOS ? 'ios' : 'android');
      _log('registerToken: platform=$platform token=${token.length} chars');
      await ApiClient.post(
        '/notifications/push-token',
        accessToken,
        body: {'token': token, 'platform': platform, 'language': language},
      );
      _log('registerToken OK: backend saved token');
    } on ApiException catch (e) {
      _log('registerToken API error: ${e.statusCode} ${e.message}');
    } catch (e) {
      _log('registerToken error: $e');
    }
  }

  static Map<String, String> _dataToStringMap(Map<String, dynamic>? data) {
    if (data == null || data.isEmpty) return {};
    return data.map((k, v) => MapEntry(k, v?.toString() ?? ''));
  }

  static void _notifyReceived(
    String title,
    String body,
    Map<String, String> data,
  ) {
    try {
      onNotificationReceived?.call(title, body, data);
    } catch (_) {}
  }

  static void _onForegroundMessage(RemoteMessage message) {
    _log(
      'onMessage (foreground): title=${message.notification?.title} body=${message.notification?.body}',
    );
    final title = message.notification?.title ?? 'Henzo';
    final body = message.notification?.body ?? '';
    if (title.isEmpty && body.isEmpty) {
      _log('onMessage: skip show (no title/body)');
      return;
    }
    _notifyReceived(title, body, _dataToStringMap(message.data));
    // On iOS, setForegroundNotificationPresentationOptions already presents the
    // notification natively (and mirrors it to Apple Watch), so we only need the
    // local notification on Android.
    if (!Platform.isIOS) {
      _log('onMessage: showing local notification (Android)');
      _showLocalNotification(
        id: message.hashCode & 0x7FFFFFFF,
        title: title,
        body: body,
        payload: message.data.isEmpty ? null : message.data.toString(),
      );
    } else {
      _log('onMessage: iOS — system notification shown by FCM, skipping local');
    }
  }

  static Future<void> _showLocalNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    const details = NotificationDetails(
      android: AndroidNotificationDetails(
        'henzo_default',
        'Henzo',
        channelDescription: 'Уведомления приложения Henzo',
        importance: Importance.high,
        priority: Priority.high,
      ),
      iOS: DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      ),
    );
    try {
      await _localNotifications.show(
        id,
        title,
        body,
        details,
        payload: payload,
      );
      _log('local notification shown: $title');
    } catch (e) {
      _log('local notification show error: $e');
    }
  }

  static void _onMessageOpenedApp(RemoteMessage message) {
    _log('onMessageOpenedApp: ${message.data}');
    final data = _dataToStringMap(message.data);
    _notifyReceived(
      message.notification?.title ?? 'Henzo',
      message.notification?.body ?? '',
      data,
    );
    onNotificationTapped?.call(data);
  }

  /// Keep launcher / home-screen badge aligned with in-app unread count.
  static Future<void> syncAppBadge(int unreadCount) async {
    try {
      if (Platform.isIOS) {
        await _localNotifications.show(
          _badgeSyncNotificationId,
          '',
          '',
          NotificationDetails(
            iOS: DarwinNotificationDetails(
              badgeNumber: unreadCount,
              presentAlert: false,
              presentSound: false,
              presentBanner: false,
              presentList: false,
            ),
          ),
        );
        await _localNotifications.cancel(_badgeSyncNotificationId);
        _log('syncAppBadge iOS: $unreadCount');
        return;
      }
      if (defaultTargetPlatform == TargetPlatform.android && unreadCount == 0) {
        await _localNotifications.cancelAll();
        _log('syncAppBadge Android: cleared tray');
      }
    } catch (e) {
      _log('syncAppBadge($unreadCount) error: $e');
    }
  }
}
