import 'package:health/health.dart';

class HealthData {
  final int steps;
  final int calories;
  final int workouts;

  const HealthData({
    required this.steps,
    required this.calories,
    required this.workouts,
  });
}

class HealthService {
  static final _health = Health();

  static const _types = [
    HealthDataType.STEPS,
    HealthDataType.ACTIVE_ENERGY_BURNED,
    HealthDataType.WORKOUT,
  ];

  static Future<bool> requestPermissions() async {
    try {
      final permissions = _types.map((_) => HealthDataAccess.READ).toList();
      return await _health.requestAuthorization(_types, permissions: permissions);
    } catch (_) {
      return false;
    }
  }

  static Future<HealthData> fetchData() async {
    final now = DateTime.now();
    final startOfDay = DateTime(now.year, now.month, now.day);
    final sevenDaysAgo = now.subtract(const Duration(days: 7));

    int steps = 0;
    int calories = 0;
    int workouts = 0;

    try {
      final stepsPoints = await _health.getHealthDataFromTypes(
        startTime: startOfDay,
        endTime: now,
        types: [HealthDataType.STEPS],
      );
      steps = stepsPoints.fold<int>(
        0,
        (sum, e) => sum + (e.value as NumericHealthValue).numericValue.toInt(),
      );

      final calPoints = await _health.getHealthDataFromTypes(
        startTime: startOfDay,
        endTime: now,
        types: [HealthDataType.ACTIVE_ENERGY_BURNED],
      );
      calories = calPoints
          .fold<double>(
            0,
            (sum, e) =>
                sum + (e.value as NumericHealthValue).numericValue.toDouble(),
          )
          .round();

      final workoutPoints = await _health.getHealthDataFromTypes(
        startTime: sevenDaysAgo,
        endTime: now,
        types: [HealthDataType.WORKOUT],
      );
      workouts = workoutPoints.length;
    } catch (_) {}

    return HealthData(steps: steps, calories: calories, workouts: workouts);
  }
}
