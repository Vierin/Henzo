import 'package:flutter/material.dart';

import '../../constants/colors.dart';
import '../../models/training_category_option.dart';

/// Colored category pill (add-training / owner catalog style).
class TrainingCategoryColorChip extends StatelessWidget {
  const TrainingCategoryColorChip({
    super.key,
    required this.label,
    required this.onTap,
    this.category,
    this.selected = false,
  });

  final TrainingCategoryOption? category;
  final String label;
  final bool selected;
  final VoidCallback onTap;

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

    final borderW = selected ? 2.0 : 1.0;
    final borderColor = selected
        ? AppColors.primary500
        : (isOther || category == null
            ? AppColors.primary300
            : Colors.transparent);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Ink(
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: borderColor, width: borderW),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: Text(
            label,
            style: TextStyle(
              color: fg,
              fontWeight: FontWeight.w600,
              fontSize: 13,
            ),
          ),
        ),
      ),
    );
  }
}
