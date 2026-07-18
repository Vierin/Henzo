import 'package:flutter/material.dart';

import '../../constants/colors.dart';
import '../../models/training_category_option.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Colored category pill (add-training / owner catalog style).
class TrainingCategoryColorChip extends StatelessWidget {
  const TrainingCategoryColorChip({
    super.key,
    required this.label,
    required this.onTap,
    this.category,
    this.selected = false,
    this.dimmed = false,
    this.useSelectionBorder = true,
    this.staticBorder = false,
    this.fontWeight = FontWeight.w600,
    this.lineHeight = 1.2,
    this.verticalPadding = 10,
    this.bottomPadding,
  });

  final TrainingCategoryOption? category;
  final String label;
  final bool selected;
  final bool dimmed;
  final bool useSelectionBorder;
  /// [AppColors.primary300] outline — same when selected or not.
  final bool staticBorder;
  final VoidCallback onTap;
  final FontWeight fontWeight;
  final double lineHeight;
  /// Top (and default bottom) vertical padding inside the pill.
  final double verticalPadding;
  /// Overrides the bottom padding when set; used to re-center the label after
  /// the line-height change (e.g. client home pills shave 2px off the bottom).
  final double? bottomPadding;

  @override
  Widget build(BuildContext context) {
    final isOther = category?.isOtherCategory ?? false;
    final Color bg;
    final Color fg;
    if (category == null || isOther) {
      bg = AppColors.backgroundPrimary;
      fg = AppColors.textPrimary;
    } else {
      final chipBg = category!.backgroundColor(AppColors.neutral500);
      bg = chipBg;
      fg = category!.foregroundColorOn(chipBg);
    }

    const borderW = 2.0;
    final Color borderColor;
    if (staticBorder) {
      borderColor = AppColors.primary300;
    } else {
      borderColor = useSelectionBorder && selected
          ? AppColors.primary500
          : (useSelectionBorder && (isOther || category == null)
                ? AppColors.primary300
                : Colors.transparent);
    }
    final chipBg = dimmed ? bg.withValues(alpha: bg.a * 0.38) : bg;
    final chipFg = dimmed ? fg.withValues(alpha: fg.a * 0.55) : fg;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Ink(
          decoration: BoxDecoration(
            color: chipBg,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: borderColor, width: borderW),
          ),
          padding: EdgeInsets.only(
            left: 16,
            right: 16,
            top: verticalPadding,
            bottom: bottomPadding ?? verticalPadding,
          ),
          child: Text(
            label,
            style: TextStyle(
              color: chipFg,
              fontWeight: fontWeight,
              letterSpacing: -0.3,
              fontSize: 13.sp,
              height: lineHeight,
              // Split the extra line-height evenly above/below the glyphs so
              // descenders (g, y, p, q, j) aren't clipped at the bottom.
              leadingDistribution: TextLeadingDistribution.even,
            ),
          ),
        ),
      ),
    );
  }
}
