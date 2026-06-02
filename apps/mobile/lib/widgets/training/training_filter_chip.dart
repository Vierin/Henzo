import 'package:flutter/material.dart';

import '../../constants/colors.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Category / day filter on Trainings screen — no checkmark, brand orange when on.
class TrainingFilterChip extends StatelessWidget {
  const TrainingFilterChip({
    super.key,
    required this.label,
    required this.selected,
    required this.onSelected,
  });

  final String label;
  final bool selected;
  final ValueChanged<bool> onSelected;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        onTap: () => onSelected(!selected),
        borderRadius: BorderRadius.circular(20),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: selected
                ? AppColors.primary500
                : AppColors.backgroundPrimary,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: selected
                  ? AppColors.primary500
                  : AppColors.borderPrimary,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13.sp,
              fontWeight: FontWeight.w600,
              color: selected
                  ? AppColors.textInverse
                  : AppColors.textPrimary,
            ),
          ),
        ),
      ),
    );
  }
}
