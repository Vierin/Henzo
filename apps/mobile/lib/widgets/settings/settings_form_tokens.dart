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

OutlineInputBorder _settingsInputOutline({
  required BorderRadius radius,
  Color borderColor = AppColors.borderPrimary,
  double width = 1,
}) =>
    OutlineInputBorder(
      borderRadius: radius,
      borderSide: BorderSide(color: borderColor, width: width),
    );

InputDecoration settingsInputDecoration({
  String? hintText,
  String? labelText,
  bool alignLabelWithHint = false,
  int maxLines = 1,
  bool readOnly = false,
}) {
  final radius = settingsInputBorderRadius(maxLines: maxLines);
  final outline = _settingsInputOutline(radius: radius);
  return InputDecoration(
    hintText: hintText,
    labelText: labelText,
    hintStyle: const TextStyle(color: AppColors.textTertiary),
    floatingLabelBehavior: FloatingLabelBehavior.never,
    filled: true,
    fillColor: readOnly
        ? AppColors.backgroundTertiary
        : AppColors.backgroundPrimary,
    border: OutlineInputBorder(borderRadius: radius),
    enabledBorder: outline,
    focusedBorder: _settingsInputOutline(
      radius: radius,
      borderColor: AppColors.primary500,
      width: 1.5,
    ),
    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    alignLabelWithHint: alignLabelWithHint,
  );
}

/// Studio profile and other owner forms without input strokes.
InputDecoration settingsBorderlessInputDecoration({
  String? hintText,
  String? labelText,
  bool alignLabelWithHint = false,
  int maxLines = 1,
  bool readOnly = false,
}) {
  final radius = settingsInputBorderRadius(maxLines: maxLines);
  final none = _settingsInputOutline(
    radius: radius,
    borderColor: Colors.transparent,
    width: 0,
  );
  return InputDecoration(
    hintText: hintText,
    labelText: labelText,
    hintStyle: const TextStyle(color: AppColors.textTertiary),
    floatingLabelBehavior: FloatingLabelBehavior.never,
    filled: true,
    fillColor: readOnly
        ? AppColors.backgroundTertiary
        : AppColors.backgroundPrimary,
    border: none,
    enabledBorder: none,
    focusedBorder: none,
    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    alignLabelWithHint: alignLabelWithHint,
  );
}

/// Section / group card on settings forms (no outer stroke).
BoxDecoration settingsSectionDecoration() => BoxDecoration(
      color: AppColors.backgroundPrimary,
      borderRadius: BorderRadius.circular(kSettingsInputBorderRadius),
    );
