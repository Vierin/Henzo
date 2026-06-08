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
      unawaited(_androidSelectionTick());
    }
  }

  static Future<void> _androidSelectionTick() async {
    if (!await Vibration.hasVibrator()) return;
    if (await Vibration.hasAmplitudeControl()) {
      await Vibration.vibrate(duration: 8, amplitude: 48);
      return;
    }
    await Vibration.vibrate(duration: 10);
  }
}
