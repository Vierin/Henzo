import 'package:flutter/material.dart';

import 'colors.dart';

/// Text styles aligned with owner shell / [AppTheme] (Wix Madefor Display).
class BrandTypography {
  BrandTypography._();

  static TextStyle greeting(BuildContext context) {
    return Theme.of(context).textTheme.headlineMedium?.copyWith(
          fontSize: 28,
          fontWeight: FontWeight.w400,
          height: 1.15,
          color: AppColors.textPrimary,
        ) ??
        const TextStyle(
          fontSize: 28,
          fontWeight: FontWeight.w400,
          height: 1.15,
          color: AppColors.textPrimary,
        );
  }

  static TextStyle greetingEmphasis(BuildContext context) {
    return greeting(context).copyWith(
      fontStyle: FontStyle.italic,
      fontWeight: FontWeight.w500,
    );
  }

  static TextStyle sectionTitle(BuildContext context) {
    return Theme.of(context).textTheme.titleLarge?.copyWith(
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: AppColors.textPrimary,
        ) ??
        const TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: AppColors.textPrimary,
        );
  }

  static TextStyle sectionSubtitle(BuildContext context) {
    return Theme.of(context).textTheme.bodyMedium?.copyWith(
          fontSize: 13,
          fontWeight: FontWeight.w500,
          color: AppColors.textSecondary,
        ) ??
        const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w500,
          color: AppColors.textSecondary,
        );
  }

  static TextStyle appBarTitle(BuildContext context) {
    return Theme.of(context).textTheme.titleLarge?.copyWith(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: AppColors.textPrimary,
        ) ??
        const TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: AppColors.textPrimary,
        );
  }
}
