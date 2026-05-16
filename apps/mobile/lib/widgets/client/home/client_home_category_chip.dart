import 'package:flutter/material.dart';

import '../../../constants/colors.dart';
import '../../../models/training_category_option.dart';
class ClientHomeCategoryChip extends StatelessWidget {
  const ClientHomeCategoryChip({
    super.key,
    required this.category,
    required this.label,
    required this.onTap,
  });

  final TrainingCategoryOption category;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isOther = category.isOtherCategory;
    final bg = isOther
        ? AppColors.backgroundPrimary
        : category.backgroundColor();
    final fg = isOther
        ? AppColors.textPrimary
        : category.foregroundColorOn(bg);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(999),
            border: isOther
                ? Border.all(color: AppColors.primary300, width: 1)
                : null,
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: fg,
            ),
          ),
        ),
      ),
    );
  }
}