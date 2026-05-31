import 'dart:developer' show log;
import 'dart:io';

import 'package:health/health.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

class HealthData {
  final int steps;
  final int calories;
  final int workouts;

  const HealthData({
    required this.steps,
    required this.calories,
    required this.workouts,
  });

  bool get hasAnyMetrics => steps > 0 || calories > 0 || workouts > 0;
}

enum HealthConnectIssue {
  none,
  needsHealthConnectApp,
  needsActivityPermission,
  permissionDenied,
}

class HealthConnectResult {
  const HealthConnectResult({
    required this.ok,
    this.issue = HealthConnectIssue.none,
    this.userMessage,
  });

  final bool ok;
  final HealthConnectIssue issue;
  final String? userMessage;

  static const success = HealthConnectResult(ok: true);
}

class HealthService {
  static final Health _health = Health();
  static bool _configured = false;

  /// Types we request from Health Connect / Apple Health.
  static const _readTypes = [
    HealthDataType.STEPS,
    HealthDataType.ACTIVE_ENERGY_BURNED,
    HealthDataType.TOTAL_CALORIES_BURNED,
    HealthDataType.WORKOUT,
  ];

  static final _permissions = List<HealthDataAccess>.filled(
    _readTypes.length,
    HealthDataAccess.READ,
  );

  static const _playStoreUrl =
      'https://play.google.com/store/apps/details?id='
      'com.google.android.apps.healthdata';

  static Future<void> _ensureConfigured() async {
    if (_configured) return;
    await _health.configure();
    _configured = true;
  }

  static Future<bool> hasAccess() async {
    await _ensureConfigured();
    if (Platform.isAndroid) {
      final status = await _health.getHealthConnectSdkStatus();
      if (status != HealthConnectSdkStatus.sdkAvailable) {
        return false;
      }
    }
    try {
      final granted = await _health.hasPermissions(
        _readTypes,
        permissions: _permissions,
      );
      return granted == true;
    } catch (e) {
      log('HealthService.hasAccess: $e');
      return false;
    }
  }

  static Future<HealthConnectResult> connect() async {
    await _ensureConfigured();

    if (Platform.isAndroid) {
      final sdk = await _health.getHealthConnectSdkStatus();
      log('Health Connect SDK status: $sdk');

      if (sdk != HealthConnectSdkStatus.sdkAvailable) {
        await _promptInstallHealthConnect();
        return const HealthConnectResult(
          ok: false,
          issue: HealthConnectIssue.needsHealthConnectApp,
          userMessage:
              'Install Health Connect, link Huawei Health as a data source, '
              'then tap Connect again.',
        );
      }

      final activity = await Permission.activityRecognition.request();
      if (!activity.isGranted) {
        if (activity.isPermanentlyDenied) {
          await openAppSettings();
        }
        return const HealthConnectResult(
          ok: false,
          issue: HealthConnectIssue.needsActivityPermission,
          userMessage:
              'Allow Physical activity permission for step counting.',
        );
      }
    }

    try {
      final authorized = await _health.requestAuthorization(
        _readTypes,
        permissions: _permissions,
      );
      if (!authorized) {
        return const HealthConnectResult(
          ok: false,
          issue: HealthConnectIssue.permissionDenied,
          userMessage:
              'In Health Connect → App permissions → Henzo: allow Steps, '
              'Calories, and Exercise.',
        );
      }

      if (Platform.isAndroid) {
        try {
          await _health.requestHealthDataHistoryAuthorization();
        } catch (e) {
          log('requestHealthDataHistoryAuthorization: $e');
        }
      }

      final verified = await _health.hasPermissions(
        _readTypes,
        permissions: _permissions,
      );
      if (verified != true) {
        return const HealthConnectResult(
          ok: false,
          issue: HealthConnectIssue.permissionDenied,
          userMessage: 'Permissions were not granted for Henzo.',
        );
      }

      return HealthConnectResult.success;
    } on UnsupportedError catch (e) {
      log('HealthService.connect UnsupportedError: $e');
      await _promptInstallHealthConnect();
      return const HealthConnectResult(
        ok: false,
        issue: HealthConnectIssue.needsHealthConnectApp,
        userMessage: 'Install Health Connect first, then retry.',
      );
    } catch (e, st) {
      log('HealthService.connect error: $e', stackTrace: st);
      return HealthConnectResult(
        ok: false,
        issue: HealthConnectIssue.permissionDenied,
        userMessage: 'Could not connect: $e',
      );
    }
  }

  static Future<void> _promptInstallHealthConnect() async {
    try {
      await _health.installHealthConnect();
    } catch (e) {
      log('installHealthConnect failed: $e');
    }
    final store = Uri.parse(_playStoreUrl);
    if (await canLaunchUrl(store)) {
      await launchUrl(store, mode: LaunchMode.externalApplication);
    }
  }

  static Future<HealthData> fetchData() async {
    await _ensureConfigured();
    final now = DateTime.now();
    final startOfDay = DateTime(now.year, now.month, now.day);
    final sevenDaysAgo = now.subtract(const Duration(days: 7));

    final steps = await _readSteps(startOfDay, now);
    final calories = await _readCalories(startOfDay, now);
    final workouts = await _readWorkoutCount(sevenDaysAgo, now);

    log(
      'HealthService.fetchData steps=$steps cal=$calories workouts=$workouts',
    );

    return HealthData(steps: steps, calories: calories, workouts: workouts);
  }

  static Future<int> _readSteps(DateTime start, DateTime end) async {
    if (Platform.isAndroid) {
      try {
        final total = await _health.getTotalStepsInInterval(start, end);
        if (total != null && total > 0) {
          return total;
        }
      } catch (e) {
        log('getTotalStepsInInterval: $e');
      }
    }
    return _sumNumericPoints(
      start,
      end,
      [HealthDataType.STEPS],
      label: 'steps',
    );
  }

  static Future<int> _readCalories(DateTime start, DateTime end) async {
    for (final type in [
      HealthDataType.ACTIVE_ENERGY_BURNED,
      HealthDataType.TOTAL_CALORIES_BURNED,
    ]) {
      final kcal = await _sumNumericPoints(start, end, [type], label: 'kcal');
      if (kcal > 0) return kcal;
    }
    return 0;
  }

  static Future<int> _readWorkoutCount(DateTime start, DateTime end) async {
    try {
      final points = await _health.getHealthDataFromTypes(
        startTime: start,
        endTime: end,
        types: [HealthDataType.WORKOUT],
      );
      final unique = _health.removeDuplicates(points);
      log('workout points: ${unique.length}');
      return unique.length;
    } catch (e) {
      log('workouts read: $e');
      return 0;
    }
  }

  static Future<int> _sumNumericPoints(
    DateTime start,
    DateTime end,
    List<HealthDataType> types, {
    required String label,
  }) async {
    try {
      final raw = await _health.getHealthDataFromTypes(
        startTime: start,
        endTime: end,
        types: types,
      );
      final points = _health.removeDuplicates(raw);
      log('$label raw=${raw.length} unique=${points.length}');
      return points.fold<int>(
        0,
        (sum, e) {
          final v = e.value;
          if (v is NumericHealthValue) {
            return sum + v.numericValue.round();
          }
          return sum;
        },
      );
    } catch (e) {
      log('$label sum error: $e');
      return 0;
    }
  }

  static Future<bool> requestPermissions() async {
    final result = await connect();
    return result.ok;
  }
}
