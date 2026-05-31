import 'package:flutter/material.dart';

import '../../constants/colors.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Screen titles (AppBar) vs section headers inside settings forms.
class SettingsTypography {
  SettingsTypography._();

  /// Section labels: «ОСНОВНАЯ ИНФОРМАЦИЯ», «АККАУНТ», …
  static TextStyle sectionTitle(BuildContext context) {
    return TextStyle(
      fontSize: 14.sp,
      fontWeight: FontWeight.w500,
      letterSpacing: -0.2,
      color: AppColors.textSecondary,
    );
  }

  static TextStyle screenTitle(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return textTheme.headlineSmall?.copyWith(
          fontWeight: FontWeight.w700,
          color: AppColors.textPrimary,
          letterSpacing: -0.3,
        ) ??
        TextStyle(
          fontSize: 24.sp,
          fontWeight: FontWeight.w700,
          color: AppColors.textPrimary,
          letterSpacing: -0.3,
        );
  }
}
