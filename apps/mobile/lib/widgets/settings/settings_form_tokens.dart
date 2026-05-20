import 'package:flutter/material.dart';

import '../../constants/colors.dart';

/// Single-line fields on owner settings screens.
const double kSettingsInputBorderRadius = 12;

/// Multiline fields (2+ lines) on owner settings screens.
const double kSettingsMultilineInputBorderRadius = 14;

BorderRadius settingsInputBorderRadius({int maxLines = 1}) =>
    BorderRadius.circular(
      maxLines >= 2
          ? kSettingsMultilineInputBorderRadius
          : kSettingsInputBorderRadius,
    );

InputDecoration settingsInputDecoration({
  String? hintText,
  String? labelText,
  bool alignLabelWithHint = false,
  int maxLines = 1,
  bool readOnly = false,
}) {
  final radius = settingsInputBorderRadius(maxLines: maxLines);
  final outline = OutlineInputBorder(
    borderRadius: radius,
    borderSide: const BorderSide(color: AppColors.borderPrimary),
  );
  return InputDecoration(
    hintText: hintText,
    labelText: labelText,
    filled: true,
    fillColor: readOnly
        ? AppColors.backgroundTertiary
        : AppColors.backgroundPrimary,
    border: OutlineInputBorder(borderRadius: radius),
    enabledBorder: outline,
    focusedBorder: OutlineInputBorder(
      borderRadius: radius,
      borderSide: const BorderSide(color: AppColors.primary500, width: 1.5),
    ),
    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    alignLabelWithHint: alignLabelWithHint,
  );
}

/// Section / group card on settings forms (no outer stroke).
BoxDecoration settingsSectionDecoration() => BoxDecoration(
      color: AppColors.backgroundPrimary,
      borderRadius: BorderRadius.circular(kSettingsInputBorderRadius),
    );
