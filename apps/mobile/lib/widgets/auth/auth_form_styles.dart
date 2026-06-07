import 'package:flutter/material.dart';

import '../../constants/colors.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Field and primary-button geometry shared with [AddTrainingScreen] step 1.
abstract final class AuthFormStyles {
  static const double fieldBorderRadius = 12;
  static const double buttonHeight = 60;
  static const double buttonBorderRadius = 14;
  static const double socialButtonBorderRadius = 14;
  static const double fieldGap = 12;

  static const Color hintMuted = Color(0x993F3F3F);
  static const Color accentIcon = hintMuted;

  static TextStyle get fieldTextStyle => TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: AppColors.textPrimary,
      );

  static const BorderRadius _radius = BorderRadius.all(
    Radius.circular(fieldBorderRadius),
  );

  static InputDecoration fieldDecoration({
    required String hintText,
    IconData? prefixIcon,
    Widget? prefixWidget,
    Widget? suffixIcon,
    bool invalid = false,
  }) {
    final errorSide = BorderSide(color: AppColors.error600, width: 1.2);
    const noneSide = BorderSide.none;
    final focusSide = BorderSide(
      color: invalid ? AppColors.error600 : AppColors.primary500,
      width: 1.2,
    );
    return InputDecoration(
      hintText: hintText,
      hintStyle: TextStyle(
        color: hintMuted,
        fontSize: 16,
        fontWeight: FontWeight.w500,
      ),
      prefixIcon: (prefixIcon == null && prefixWidget == null)
          ? null
          : Padding(
              padding: const EdgeInsets.only(left: 13, right: 8),
              child: prefixWidget ?? Icon(prefixIcon, color: accentIcon, size: 22),
            ),
      prefixIconConstraints: const BoxConstraints(minWidth: 0, minHeight: 0),
      suffixIcon: suffixIcon,
      filled: true,
      fillColor: AppColors.backgroundPrimary,
      constraints: const BoxConstraints.tightFor(height: 68),
      contentPadding: EdgeInsets.only(
        top: 20,
        bottom: 20,
        right: 18,
        left: (prefixIcon == null && prefixWidget == null) ? 13 : 0,
      ),
      border: OutlineInputBorder(borderRadius: _radius, borderSide: noneSide),
      enabledBorder: OutlineInputBorder(
        borderRadius: _radius,
        borderSide: invalid ? errorSide : noneSide,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: _radius,
        borderSide: focusSide,
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: _radius,
        borderSide: errorSide,
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: _radius,
        borderSide: errorSide,
      ),
    );
  }

  static ButtonStyle primaryButtonStyle() => FilledButton.styleFrom(
    backgroundColor: AppColors.primary500,
    foregroundColor: AppColors.textInverse,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(buttonBorderRadius),
    ),
  );

  static ButtonStyle googleButtonStyle() => OutlinedButton.styleFrom(
    backgroundColor: AppColors.backgroundPrimary,
    side: BorderSide.none,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(socialButtonBorderRadius),
    ),
  );
}
