import 'dart:async';
import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:vibration/vibration.dart';

/// iOS-style selection ticks; Android uses a short motor pulse because
/// [HapticFeedback.selectionClick] maps to a barely perceptible CLOCK_TICK.
abstract final class HenzoHaptics {
  HenzoHaptics._();

  static void selectionTick() {
    if (kIsWeb) return;
    if (Platform.isIOS) {
      HapticFeedback.selectionClick();
      return;
    }
    if (Platform.isAndroid) {
      unawaited(_androidMotorPulse(durationMs: 10, amplitude: 48));
    }
  }

  /// Day-strip scroll — stronger on Android so slow drags are perceptible.
  static void scrollTick() {
    if (kIsWeb) return;
    if (Platform.isIOS) {
      HapticFeedback.selectionClick();
      return;
    }
    if (Platform.isAndroid) {
      unawaited(_androidMotorPulse(durationMs: 14, amplitude: 112));
    }
  }

  static Future<void> _androidMotorPulse({
    required int durationMs,
    required int amplitude,
  }) async {
    if (!await Vibration.hasVibrator()) return;
    if (await Vibration.hasAmplitudeControl()) {
      await Vibration.vibrate(duration: durationMs, amplitude: amplitude);
      return;
    }
    await Vibration.vibrate(duration: durationMs + 6);
  }
}
