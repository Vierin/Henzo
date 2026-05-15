import 'package:flutter/material.dart';

import '../../constants/colors.dart';

/// Titles for settings hub, account, studio profile (screen + section headers).
class SettingsTypography {
  SettingsTypography._();

  static TextStyle screenTitle(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return textTheme.headlineSmall?.copyWith(
          fontWeight: FontWeight.w700,
          color: AppColors.textPrimary,
          letterSpacing: -0.3,
        ) ??
        const TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.w700,
          color: AppColors.textPrimary,
          letterSpacing: -0.3,
        );
  }
}
