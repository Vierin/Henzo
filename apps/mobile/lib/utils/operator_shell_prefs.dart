import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Which shell to open when the user is both OWNER and linked trainer.
enum OperatorShell { owner, trainer }

/// Persists dual-identity shell preference (owner business vs trainer panel).
class OperatorShellPrefs {
  OperatorShellPrefs._();

  static const key = 'operator_shell_preference';

  /// `null` until [load]; then preferred shell (defaults to owner).
  static final ValueNotifier<OperatorShell> preferred =
      ValueNotifier<OperatorShell>(OperatorShell.owner);

  static Future<void> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(key)?.trim().toLowerCase();
      preferred.value = raw == 'trainer'
          ? OperatorShell.trainer
          : OperatorShell.owner;
    } catch (e) {
      if (kDebugMode) debugPrint('[OperatorShellPrefs] load error: $e');
      preferred.value = OperatorShell.owner;
    }
  }

  static Future<void> set(OperatorShell shell) async {
    preferred.value = shell;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        key,
        shell == OperatorShell.trainer ? 'trainer' : 'owner',
      );
    } catch (e) {
      if (kDebugMode) debugPrint('[OperatorShellPrefs] set error: $e');
    }
  }

  static Future<void> preferTrainer() => set(OperatorShell.trainer);

  static Future<void> preferOwner() => set(OperatorShell.owner);
}
