import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

enum WorkoutSendStatus {
  sent,             // watch message sent + notification shown
  notificationOnly, // watch not paired/reachable, notification only
  failed,
}

class WorkoutSendResult {
  final WorkoutSendStatus status;
  final String? error;
  const WorkoutSendResult(this.status, {this.error});
}

class WorkoutService {
  WorkoutService._();

  static const _channel = MethodChannel('henzo/watch');
  static const _categoryId = 'WORKOUT_REMINDER';

  static final _plugin = FlutterLocalNotificationsPlugin();

  /// Sends a local notification (mirrors to Apple Watch) and
  /// optionally a direct WCSession message if watch is reachable.
  static Future<WorkoutSendResult> scheduleWorkoutReminder({
    required String workoutType,
    int minutesBefore = 10,
  }) async {
    await _showWorkoutNotification(
      workoutType: workoutType,
      minutesBefore: minutesBefore,
    );

    if (Platform.isIOS) {
      try {
        final result = await _channel.invokeMethod<String>(
          'sendWorkoutToWatch',
          {'workoutType': workoutType, 'minutesBefore': minutesBefore},
        );
        if (result == 'sent') {
          return const WorkoutSendResult(WorkoutSendStatus.sent);
        }
      } catch (_) {}
      return const WorkoutSendResult(WorkoutSendStatus.notificationOnly);
    }

    return const WorkoutSendResult(WorkoutSendStatus.notificationOnly);
  }

  static Future<void> _showWorkoutNotification({
    required String workoutType,
    required int minutesBefore,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'henzo_workout',
      'Workout Reminders',
      channelDescription: 'Напоминания о тренировках',
      importance: Importance.high,
      priority: Priority.high,
      category: AndroidNotificationCategory.reminder,
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentSound: true,
      categoryIdentifier: _categoryId,
      interruptionLevel: InterruptionLevel.timeSensitive,
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _plugin.show(
      0xAB1,
      'Тренировка "$workoutType" через $minutesBefore мин',
      'Запустить тренировку на часах?',
      details,
      payload: 'workout:$workoutType',
    );
  }
}
