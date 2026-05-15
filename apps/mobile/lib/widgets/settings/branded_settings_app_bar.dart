import 'package:flutter/material.dart';

import '../../constants/colors.dart';
import 'settings_typography.dart';

/// App bar for owner settings sub-screens (centered title, secondary bg).
PreferredSizeWidget buildBrandedSettingsAppBar(
  BuildContext context, {
  required String title,
  List<Widget>? actions,
  VoidCallback? onBack,
}) {
  return AppBar(
    backgroundColor: AppColors.backgroundSecondary,
    foregroundColor: AppColors.textPrimary,
    elevation: 0,
    scrolledUnderElevation: 0,
    centerTitle: true,
    leading: IconButton(
      onPressed: onBack ?? () => Navigator.of(context).maybePop(),
      style: IconButton.styleFrom(
        backgroundColor: AppColors.neutral200,
        shape: const CircleBorder(),
      ),
      icon: const Icon(
        Icons.arrow_back,
        color: AppColors.textPrimary,
        size: 20,
      ),
    ),
    title: Text(title, style: SettingsTypography.screenTitle(context)),
    actions: actions,
  );
}
