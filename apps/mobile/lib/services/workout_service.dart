import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import 'api_client.dart';

enum WorkoutSendStatus {
  sent,             // remote push sent + WCSession queued
  notificationOnly, // remote push sent, watch not reachable
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
  static const _tag = '[WorkoutService]';
  static void _log(String msg) => debugPrint('$_tag $msg');

  /// Sends a remote push (via backend → FCM → APNs) with WORKOUT_REMINDER
  /// category so Apple Watch renders the "Начать" action button.
  /// The [delaySeconds] delay is handled in the caller via Future.delayed.
  static Future<WorkoutSendResult> scheduleWorkoutReminder({
    required String workoutType,
    required String accessToken,
    int delaySeconds = 0,
  }) async {
    _log('scheduleWorkoutReminder: type=$workoutType delay=${delaySeconds}s');

    if (delaySeconds > 0) {
      _log('Delaying remote push by ${delaySeconds}s...');
      Future.delayed(Duration(seconds: delaySeconds), () async {
        await _sendRemotePush(workoutType: workoutType, accessToken: accessToken);
      });
      return const WorkoutSendResult(WorkoutSendStatus.notificationOnly);
    }

    return _sendRemotePush(workoutType: workoutType, accessToken: accessToken);
  }

  static Future<WorkoutSendResult> _sendRemotePush({
    required String workoutType,
    required String accessToken,
  }) async {
    _log('_sendRemotePush: $workoutType');
    try {
      await ApiClient.post(
        '/notifications/workout-reminder',
        accessToken,
        body: {'workoutType': workoutType},
      );
      _log('remote push sent OK');
    } on ApiException catch (e) {
      _log('remote push API error: ${e.statusCode} ${e.message}');
      return WorkoutSendResult(WorkoutSendStatus.failed, error: e.message);
    } catch (e) {
      _log('remote push error: $e');
      return WorkoutSendResult(WorkoutSendStatus.failed, error: e.toString());
    }

    if (Platform.isIOS) {
      _log('iOS: attempting WCSession sendWorkoutToWatch...');
      try {
        final result = await _channel.invokeMethod<String>(
          'sendWorkoutToWatch',
          {'workoutType': workoutType, 'minutesBefore': 0},
        );
        _log('WCSession result: $result');
        if (result == 'sent') {
          return const WorkoutSendResult(WorkoutSendStatus.sent);
        }
      } catch (e) {
        _log('WCSession error: $e');
      }
    }

    return const WorkoutSendResult(WorkoutSendStatus.notificationOnly);
  }

  /// Called when user taps "Начать" in the notification action on iPhone.
  static Future<void> sendToWatch({required String workoutType}) async {
    if (!Platform.isIOS) return;
    _log('sendToWatch: $workoutType');
    try {
      final result = await _channel.invokeMethod<String>(
        'sendWorkoutToWatch',
        {'workoutType': workoutType, 'minutesBefore': 0},
      );
      _log('sendToWatch result: $result');
    } catch (e) {
      _log('sendToWatch error: $e');
    }
  }
}
