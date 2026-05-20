import 'package:flutter/material.dart';

import '../../constants/colors.dart';

const double kSheetActionButtonRadius = 12;
const Size kSheetActionButtonMinSize = Size(0, 48);

final RoundedRectangleBorder kSheetActionButtonShape =
    RoundedRectangleBorder(
  borderRadius: BorderRadius.circular(kSheetActionButtonRadius),
);

ButtonStyle sheetCancelButtonStyle() => OutlinedButton.styleFrom(
      foregroundColor: AppColors.textPrimary,
      side: const BorderSide(color: AppColors.borderPrimary),
      minimumSize: kSheetActionButtonMinSize,
      shape: kSheetActionButtonShape,
    );

ButtonStyle sheetPrimaryButtonStyle() => FilledButton.styleFrom(
      backgroundColor: AppColors.primary500,
      minimumSize: kSheetActionButtonMinSize,
      shape: kSheetActionButtonShape,
    );
