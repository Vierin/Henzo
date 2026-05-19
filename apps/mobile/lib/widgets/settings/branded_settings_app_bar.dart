import 'package:flutter/material.dart';

import '../../constants/colors.dart';
import 'settings_header_back_button.dart';
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
    leading: SettingsHeaderBackButton(
      onPressed: onBack ?? () => Navigator.of(context).maybePop(),
    ),
    title: Text(title, style: SettingsTypography.screenTitle(context)),
    actions: actions,
  );
}
